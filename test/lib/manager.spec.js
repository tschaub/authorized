var EventEmitter = require('events').EventEmitter;

var chai = require('chai');

var authorized = require('../../lib/authorized');

var ConfigError = authorized.ConfigError;
var Manager = authorized.Manager;
var Role = authorized.Role;
var UnauthorizedError = authorized.UnauthorizedError;


/** @type {boolean} */
chai.Assertion.includeStack = true;
var assert = chai.assert;

describe('Manager', function() {

  describe('constructor', function() {

    it('creates a new authorization manager with the defaults', function() {
      var auth = new Manager();
      assert.instanceOf(auth, Manager);
      assert.isTrue(auth.options.pauseStream);
    });

    it('allows options to be set', function() {
      var auth = new Manager({pauseStream: false});
      assert.instanceOf(auth, Manager);
      assert.isFalse(auth.options.pauseStream);
    });

    it('instance exported by main module', function() {
      var auth = require('../../lib/authorized');
      assert.instanceOf(auth, Manager);
    });

  });

  describe('#action()', function() {
    var auth;
    beforeEach(function() {
      auth = new Manager();
    });

    it('defines roles required for specific actions', function() {
      auth.role('admin', function(req, done) {
        // pretend everybody is admin
        done(null, true);
      });

      assert.doesNotThrow(function() {
        auth.action('can view passwords', ['admin']);
      });
    });

    it('allows multiple roles to perform an action', function() {
      auth.role('admin', function(req, done) {
        // pretend ~1/2 users are admin
        done(null, Math.random() > 0.5);
      });
      auth.role('page.author', function(page, req, done) {
        // pretend everybody is author
        done(null, true);
      });
      auth.entity('page', function(req, done) {
        // mock page
        done(null, {});
      });

      assert.doesNotThrow(function() {
        auth.action('can edit page', ['admin', 'page.author']);
      });
    });


    it('accepts a single role string instead of an array', function() {
      auth.role('admin', function(req, done) {
        // pretend everybody is admin
        done(null, true);
      });

      assert.doesNotThrow(function() {
        auth.action('can view passwords', 'admin');
      });
    });

    it('does not accept an action with no roles', function() {
      assert.throws(function() {
        auth.action('can do nothing', []);
      });
    });

    it('requires that all roles have been defined', function() {
      auth.role('admin', function(req, done) {
        // pretend everybody is admin
        done(null, true);
      });

      assert.throws(function() {
        auth.action('can view passwords', ['admin', 'foo']);
      });
    });

    it('requires that all entities have been defined', function() {
      auth.role('admin', function(req, done) {
        // pretend nobody is admin
        done(null, false);
      });
      auth.role('page.author', function(page, req, done) {
        // pretend everybody is author
        done(null, true);
      });

      assert.throws(function() {
        auth.action('can edit page', ['admin', 'page.author']);
      });
    });

  });

  describe('#can()', function() {
    var auth = new Manager();
    var organizations = {
      'org.1': {
        owners: ['user.1']
      }
    };

    auth.entity('organization', function(req, done) {
      // assume url like /:orgId
      var orgId = req.url.substring(1);
      // pretend we're going to the db for the organization
      process.nextTick(function() {
        done(null, organizations[orgId]);
      });
    });

    auth.role('organization.owner', function(org, req, done) {
      if (!req.user) {
        done();
      } else {
        done(null, ~org.owners.indexOf(req.user.id));
      }
    });

    auth.role('admin', function(req, done) {
      done(null, req.user && req.user.admin);
    });

    auth.action('add members to organization', ['admin', 'organization.owner']);

    auth.action('delete organization', ['admin']);

    it('creates a middleware function', function() {
      var middleware = auth.can('add members to organization');
      assert.isFunction(middleware, 'is a function');
      assert.lengthOf(middleware, 3, 'takes three args');
    });

    it('calls next with no args if action is allowed', function(done) {
      var middleware = auth.can('add members to organization');

      var req = new EventEmitter();
      req.url = '/org.1';
      req.user = {
        id: 'user.1'
      };

      middleware(req, {}, function(err) {
        assert.lengthOf(arguments, 0, 'next called with no arguments');

        var view = auth.view(req);

        assert.strictEqual(view.entities.organization, organizations['org.1'],
            'got organization');
        assert.strictEqual(view.roles['organization.owner'], true,
            'is organization.owner');
        assert.strictEqual(view.roles.admin, false,
            'is not admin');
        assert.strictEqual(view.actions['add members to organization'], true,
            'can add members to organization');

        done();
      });
    });

    it('calls next if any of the actions can be performed', function(done) {
      var middleware = auth.can(
          'add members to organization', 'delete organization');

      var req = new EventEmitter();
      req.url = '/org.1';
      req.user = {
        admin: true
      };

      middleware(req, {}, function(err) {
        assert.lengthOf(arguments, 0, 'next called with no arguments');

        var view = auth.view(req);

        assert.strictEqual(view.entities.organization, organizations['org.1'],
            'got organization');
        assert.strictEqual(view.roles['organization.owner'], false,
            'is organization.owner');
        assert.strictEqual(view.roles.admin, true,
            'is not admin');
        assert.strictEqual(view.actions['add members to organization'], true,
            'can add members to organization');
        assert.strictEqual(view.actions['delete organization'], true,
            'can delete organization');

        done();
      });
    });

    it('adds all actions to the view', function(done) {
      var middleware = auth.can(
          'add members to organization', 'delete organization');

      var req = new EventEmitter();
      req.url = '/org.1';
      req.user = {
        id: 'user.1'
      };

      middleware(req, {}, function(err) {
        assert.lengthOf(arguments, 0, 'next called with no arguments');

        var view = auth.view(req);

        assert.strictEqual(view.entities.organization, organizations['org.1'],
            'got organization');
        assert.strictEqual(view.roles['organization.owner'], true,
            'is organization.owner');
        assert.strictEqual(view.roles.admin, false,
            'is not admin');
        assert.strictEqual(view.actions['add members to organization'], true,
            'can add members to organization');
        assert.strictEqual(view.actions['delete organization'], false,
            'can delete organization');

        done();
      });
    });

    it('calls next error if action is not allowed', function(done) {
      var middleware = auth.can('add members to organization');

      var req = new EventEmitter();
      req.url = '/org.1';
      req.user = {
        id: 'user.2'
      };

      middleware(req, {}, function(err) {
        assert.lengthOf(arguments, 1, 'next called with one argument');
        assert.instanceOf(err, UnauthorizedError, 'UnauthorizedError');

        var view = auth.view(req);

        assert.strictEqual(view.entities.organization, organizations['org.1'],
            'got organization');
        assert.strictEqual(view.roles['organization.owner'], false,
            'is organization.owner');
        assert.strictEqual(view.roles.admin, false,
            'is not admin');
        assert.strictEqual(view.actions['add members to organization'], false,
            'can add members to organization');
        done();
      });
    });

    it('requires that an action has been defined', function() {
      assert.throws(function() {
        auth.can('do things we know nothing about');
      });
    });

  });

  describe('#entity()', function() {

    var auth;
    beforeEach(function() {
      auth = new Manager();
    });

    it('registers an entity getter', function() {
      function getter(req, done) {
        done(null, {});
      }
      assert.doesNotThrow(function() {
        auth.entity('page', getter);
      });
    });

    it('throws ConfigError if type is not a string', function() {
      function getter(req, done) {
        done(null, {});
      }
      assert.throws(function() {
        auth.entity(10, getter);
      }, ConfigError);
    });

    it('throws ConfigError if getter is not a function', function() {
      assert.throws(function() {auth.entity('page', 12);}, ConfigError);
    });

    it('throws ConfigError if role getter arity is not 2', function() {
      function getter(err) {
        return;
      }
      assert.throws(function() {
        auth.entity('page', getter);
      }, ConfigError);
    });

  });

  describe('#role()', function() {

    var auth;
    beforeEach(function() {
      auth = new Manager();
    });

    it('registers a role getter', function() {
      function getter(req, done) {
        return done(null, true);
      }
      assert.doesNotThrow(function() {
        auth.role('admin', getter);
      });
    });

    it('accepts a Role instance', function() {
      function getter(req, done) {
        return done(null, true);
      }
      assert.doesNotThrow(function() {
        auth.role(new Role('admin'), getter);
      });
    });

    it('expects a getter of arity 2 for simple roles', function() {
      function getter(req, done) {
        return done(null, true);
      }
      assert.doesNotThrow(function() {
        auth.role('admin', getter);
      });
    });

    it('expects a getter of arity 3 for entity roles', function() {
      function getter(organization, req, done) {
        return done(null, true);
      }
      assert.doesNotThrow(function() {
        auth.role('organization.admin', getter);
      });
    });

    it('throws ConfigError if role is not a string or Role', function() {
      function getter(req, done) {
        return done(null, true);
      }
      assert.throws(function() {
        auth.role(10, getter);
      }, ConfigError);
    });

    it('throws ConfigError if role cannot be created from string', function() {
      function getter(req, done) {
        return done(null, true);
      }
      assert.throws(function() {
        auth.role('foo.bar.bam', getter);
      }, ConfigError);
    });

    it('throws ConfigError if getter is not a function', function() {
      assert.throws(function() {
        auth.role('admin', 12);
      }, ConfigError);
    });

    it('throws ConfigError if simple role getter arity is not 2', function() {
      function getter(err) {
        return;
      }
      assert.throws(function() {
        auth.role('adin', getter);
      }, ConfigError);
    });

    it('throws ConfigError if entity role getter arity is not 2', function() {
      function getter(err, done) {
        return;
      }
      assert.throws(function() {
        auth.role('page.author', getter);
      }, ConfigError);
    });

  });


});
