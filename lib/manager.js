var async = require('async');

var Role = require('./role').Role;
var View = require('./view').View;


/**
 * Used to store authorized info on a request object.
 * @const
 */
var LOOKUP_ID = '__authorized';



/**
 * Create a new authorization manager.
 * @constructor
 */
function Manager() {
  this.roleGetters_ = {};
  this.entityGetters_ = {};
  this.actionDefs_ = {};
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
  roles = roles.map(function(role) {
    if (typeof role == 'string') {
      role = new Role(role);
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

  var view = this.view(req);
  if (action in view.actions) {
    process.nextTick(function() {
      done(null, view.actions[action]);
    });
  } else {
    var roles = this.actionDefs_[action];
    async.each(roles, cacheBeforeDone, function(err) {
      if (err) {
        return done(err);
      }
      // user must have one of the roles to perform the action
      var can = roles.some(function(role) {
        return !!view.roles[role.name];
      });
      view.actions[action] = can;
      done(null, can);
    });
  }
};


/**
 * Create action based authorization middleware.
 * @param {string} action Action name (e.g. 'add members to organization').
 * @return {function(Object, Object, function)} Authorization middleware.
 */
Manager.prototype.can = function(action) {
  if (!this.actionDefs_.hasOwnProperty(action)) {
    throw new Error('ConfigError: Action not found: ' + action);
  }
  var self = this;

  return function(req, res, next) {
    self.actionAllowed_(action, req, function(err, can) {
      if (err) {
        return next(err);
      }
      if (can) {
        next();
      } else {
        next(new Error('UnauthorizedError: Action not allowed: ' + action));
      }
    });
  }
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
      done(new Error('ConfigError: No getter found for entity: ' + type));
    } else {
      var view = this.view(req);
      var entity = view.entities[type];
      if (entity) {
        process.nextTick(function() {
          done(null, entity);
        });
      } else {
        this.entityGetters_[type](req, function(err, entity) {
          if (!err && entity) {
            // cache entity for future access
            view.entities[type] = entity;
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
    done(new Error(
        'ConfigError: No getter found for role: ' + role.name));
  } else {
    var view = this.view(req);
    if (role.name in view.roles) {
      process.nextTick(function() {
        done(null, view.roles[role.name]);
      });
    } else {
      this.getEntity_(role.entity, req, function(err, entity) {
        if (err) {
          return done(err);
        }
        function cacheBeforeDone(err, has) {
          if (!err) {
            view.roles[role.name] = !!has;
          }
          done(err, has);
        }
        var args = entity ?
            [entity, req, cacheBeforeDone] : [req, cacheBeforeDone];
        getter.apply(null, args);
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
  if (typeof role == 'string') {
    role = new Role(role);
  }
  this.roleGetters_[role.name] = getter;
};


/**
 * Get cached authorization info for a request.
 * @param {Object} req Request object.
 * @return {View} A cache of authorization info.
 */
Manager.prototype.view = function(req) {
  var storage = req[LOOKUP_ID];
  if (!storage) {
    storage = req[LOOKUP_ID] = {};
  }
  if (!('view' in storage)) {
    storage.view = new View();
  }
  return storage.view;
};


/**
 * @type {Manager}
 */
exports.Manager = Manager;
