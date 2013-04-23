var http = require('http');
var chai = require('chai');
var Manager = require('authorized').Manager;


/** @type {boolean} */
chai.Assertion.includeStack = true;
assert = chai.assert;

describe('Manager', function() {

  describe('constructor', function() {

    it('creates a new authorization manager with the defaults', function() {
      var auth = new Manager();
      assert.instanceOf(auth, Manager);
    });

    it('instance exported by main module', function() {
      var auth = require('authorized');
      assert.instanceOf(auth, Manager);
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

    it('creates a middleware function', function() {
      var middleware = auth.can('add members to organization');
      assert.isFunction(middleware, 'is a function');
      assert.lengthOf(middleware, 3, 'takes three args');
    });

    it('calls next with no args if action is allowed', function(done) {
      var middleware = auth.can('add members to organization');

      var req = new http.IncomingMessage();
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
        assert.strictEqual(view.roles['admin'], false,
            'is not admin');
        assert.strictEqual(view.actions['add members to organization'], true,
            'can add members to organization');

        done();
      });
    });

    it('calls next error if action is not allowed', function(done) {
      var middleware = auth.can('add members to organization');

      var req = new http.IncomingMessage();
      req.url = '/org.1';
      req.user = {
        id: 'user.2'
      };

      middleware(req, {}, function(err) {
        assert.lengthOf(arguments, 1, 'next called with one argument');
        assert.instanceOf(err, Error, 'called with an error');

        var view = auth.view(req);

        assert.strictEqual(view.entities.organization, organizations['org.1'],
            'got organization');
        assert.strictEqual(view.roles['organization.owner'], false,
            'is organization.owner');
        assert.strictEqual(view.roles['admin'], false,
            'is not admin');
        assert.strictEqual(view.actions['add members to organization'], false,
            'can add members to organization');
        done();
      });
    });

  });

});
