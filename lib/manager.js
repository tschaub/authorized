var async = require('async');

var pause = require('pause');

var errors = require('./errors');
var Role = require('./role').Role;
var View = require('./view').View;


/**
 * Used to store authorized info on a request object.
 * @const
 */
var LOOKUP_ID = '__authorized';



/**
 * Create a new authorization manager.
 * @param {Object} options Manager options.
 *     * pauseStream {boolean} Pause the request body stream while checking
 *         authorization (default is `true`).
 * @constructor
 */
function Manager(options) {
  this.roleGetters_ = {};
  this.entityGetters_ = {};
  this.actionDefs_ = {};
  this.options = {
    pauseStream: true
  };
  if (options) {
    for (var option in this.options) {
      if (options.hasOwnProperty(option)) {
        this.options[option] = options[option];
      }
    }
  }
}


/**
 * Register the roles for a specific action.
 * @param {string} name Action name (e.g. 'add member to organization').
 * @param {Array.<string>} roles Roles allowed to perform this action.  If
 *     the current user has any one of the supplied roles, they can perform the
 *     action (e.g. ['admin', 'organization.owner']).
 */
Manager.prototype.action = function(name, roles) {
  if (!Array.isArray(roles)) {
    roles = [roles];
  }
  if (roles.length === 0) {
    throw new errors.ConfigError('Actions require one or more roles');
  }
  var self = this;
  roles = roles.map(function(role) {
    if (typeof role === 'string') {
      role = new Role(role);
    }
    if (!(role instanceof Role)) {
      throw new errors.ConfigError(
          'Expected a string or a Role instance, got ' + String(role));
    }
    // confirm that role getter has already been added
    if (!self.roleGetters_.hasOwnProperty(role.name)) {
      throw new errors.ConfigError('No getter found for role: ' + role.name);
    }
    // confirm that any entity getter has been added
    if (role.entity && !self.entityGetters_.hasOwnProperty(role.entity)) {
      throw new errors.ConfigError(
          'No getter found for entity: ' + role.entity);
    }
    return role;
  });
  this.actionDefs_[name] = roles;
};


/**
 * Check if an action is allowed.
 * @param {string} action Action name.
 * @param {Object} req Request object.
 * @param {function(Error, boolean)} done Callback.
 * @private
 */
Manager.prototype.actionAllowed_ = function(action, req, done) {
  var self = this;
  function cacheBeforeDone(role, done) {
    self.hasRole_(role, req, done);
  }

  var view_ = this.view_(req);
  if (action in view_.actions) {
    process.nextTick(function() {
      done(null, view_.actions[action]);
    });
  } else {
    var roles = this.actionDefs_[action];
    async.each(roles, cacheBeforeDone, function(err) {
      if (err) {
        return done(err);
      }
      // user must have one of the roles to perform the action
      var can = roles.some(function(role) {
        return !!view_.roles[role.name];
      });
      view_.actions[action] = can;
      done(null, can);
    });
  }
};


/**
 * Create action based authorization middleware.
 * @param {string} action Action name (e.g. 'add members to organization').
 *     May also be called with multiple action arguments.  Supplying '*' is an
 *     alternative to specifying all actions.
 * @return {function(Object, Object, function)} Authorization middleware.
 */
Manager.prototype.can = function(action) {
  var actions;
  if (action === '*') {
    actions = Object.keys(this.actionDefs_);
  } else {
    actions = Array.prototype.slice.call(arguments);
  }
  for (var i = 0, ii = actions.length; i < ii; ++i) {
    if (!this.actionDefs_.hasOwnProperty(actions[i])) {
      throw new errors.ConfigError('Action not found: ' + actions[i]);
    }
  }
  var self = this;
  var pauseStream = this.options.pauseStream;

  return function(req, res, next) {
    var paused = pauseStream ? pause(req) : null;
    var canSome = false;
    var disallowed = [];
    async.each(actions, function(action, done) {
      self.actionAllowed_(action, req, function(err, can) {
        if (!can) {
          disallowed.push(action);
        } else {
          canSome = true;
        }
        done(err);
      });
    }, function(err) {
      if (!err && !canSome) {
        err = new errors.UnauthorizedError(
            'Action not allowed: ' + disallowed.join(','));
      }
      if (err) {
        next(err);
      } else {
        next();
      }
      if (paused) {
        paused.resume();
      }
    });
  };
};


/**
 * Register a getter for an entity.
 * @param {string} type Entity type (e.g. 'organization').
 * @param {function(req, done)} getter Function called to get an entity from
 *     the provided request.  The `done` function has the form
 *     {function(Error, Object)} where `err` is any error value
 *     generated while getting the entity and `entity` is the target entity.
 */
Manager.prototype.entity = function(type, getter) {
  if (typeof type !== 'string') {
    throw new errors.ConfigError('Entity type must be a string');
  }
  if (typeof getter !== 'function' || getter.length !== 2) {
    throw new errors.ConfigError(
        'Entity getter must be a function that takes two arguments');
  }
  this.entityGetters_[type] = getter;
};


/**
 * Get an entity from a request.
 * @param {string} type Entity type.
 * @param {Object} req Request object.
 * @param {function(Error, Object)} done Callback.
 * @private
 */
Manager.prototype.getEntity_ = function(type, req, done) {
  if (!type) {
    process.nextTick(function() {
      done();
    });
  } else {
    if (!(type in this.entityGetters_)) {
      done(new errors.ConfigError('No getter found for entity: ' + type));
    } else {
      var view_ = this.view_(req);
      if (type in view_.entities) {
        process.nextTick(function() {
          done(null, view_.entities[type]);
        });
      } else {
        this.entityGetters_[type](req, function(err, entity) {
          if (!err) {
            // cache entity for future access
            view_.entities[type] = entity;
          }
          done(err, entity);
        });
      }
    }
  }
};


/**
 * Check if a user has the given role.
 * @param {Role} role Target role.
 * @param {Object} req Current request.
 * @param {function(Error, boolean)} done Callback.
 * @private
 */
Manager.prototype.hasRole_ = function(role, req, done) {
  var getter = this.roleGetters_[role.name];
  if (!getter) {
    done(new errors.ConfigError(
        'No getter found for role: ' + role.name));
  } else {
    var view_ = this.view_(req);
    if (role.name in view_.roles) {
      process.nextTick(function() {
        done(null, view_.roles[role.name]);
      });
    } else {
      this.getEntity_(role.entity, req, function(err, entity) {
        if (err) {
          return done(err);
        }
        function cacheBeforeDone(err, has) {
          if (!err) {
            view_.roles[role.name] = !!has;
          }
          done(err, has);
        }
        if (role.entity) {
          if (!entity) {
            // don't even bother checking the relation
            cacheBeforeDone(null, false);
          } else {
            getter.apply(null, [entity, req, cacheBeforeDone]);
          }
        } else {
          getter.apply(null, [req, cacheBeforeDone]);
        }
      });
    }
  }
};


/**
 * Register a getter for a role.
 * @param {string} role Role name (e.g. 'organization.owner').
 * @param {function(req, done)} getter Function that determines if the current
 *     user has the given role.  This function will be called with the request
 *     object and a callback.  The callback has the form
 *     {function(Error, boolean)} where `err` is any error value
 *     generated while checking for the given role and `has` is a boolean
 *     indicating whether the user has the role.
 */
Manager.prototype.role = function(role, getter) {
  if (typeof role === 'string') {
    role = new Role(role);
  }
  if (!(role instanceof Role)) {
    throw new errors.ConfigError('Role must be a string or Role instance');
  }
  if (typeof getter !== 'function') {
    throw new errors.ConfigError('Role getter must be a function');
  }
  if (role.entity && getter.length !== 3) {
    throw new errors.ConfigError(
        'Getters for roles with entities take three arguments ' +
        '(first arg will be the resolved entity)');
  }
  if (!role.entity && getter.length !== 2) {
    throw new errors.ConfigError(
        'Getters for simple roles (without entities) take two arguments');
  }
  this.roleGetters_[role.name] = getter;
};


/**
 * Get cached authorization info for a request.
 * @param {Object} req Request object.
 * @return {View} A cache of authorization info.
 */
Manager.prototype.view = function(req) {
  var view = this.view_(req);
  view.freeze();
  return view;
};


/**
 * Get cached authorization info for a request.  This view can still be
 * modified (in constrast with the view returned from the public #view()
 * method).
 * @param {Object} req Request object.
 * @return {View} A cache of authorization info.
 * @private
 */
Manager.prototype.view_ = function(req) {
  var storage = req[LOOKUP_ID];
  if (!storage) {
    storage = req[LOOKUP_ID] = {
      view: new View()
    };
  }
  return storage.view;
};


/**
 * @type {Manager}
 */
exports.Manager = Manager;
