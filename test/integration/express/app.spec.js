var express = require('express');
var chai = require('chai');
var chaiHttp = require('chai-http');

var authenticate = require('./middleware/fakeauth');
var authorized = require('../../../lib/authorized');
var Manager = authorized.Manager;
var UnauthorizedError = authorized.UnauthorizedError;

/** @type {boolean} */
chai.Assertion.includeStack = true;
chai.use(chaiHttp);
var assert = chai.assert;

describe('Usage in Express app', function() {

  var auth = new Manager();
  var app = express();

  // configure fake authentication middleware
  // adds req.user if x-fake-user-id header is set
  app.use(authenticate());

  auth.role('admin', function(req, done) {
    done(null, req.user && req.user.admin);
  });

  auth.role('organization.owner', function(org, req, done) {
    var id = req.user && req.user.id;
    if (!id) {
      done();
    } else {
      done(null, !!~org.owners.indexOf(id));
    }
  });

  auth.entity('organization', function(req, done) {
    // assume url like /organizations/:orgId
    var match = req.url.match(/^\/organizations\/(\w+)/);
    if (!match) {
      done(new Error('Expected url like /organizations/:orgId'));
    }
    // pretend we're going to the db for the organization
    process.nextTick(function() {
      // mock org
      var org = {id: match[1], owners: ['user.1']};
      done(null, org);
    });
  });

  auth.action('add members to organization', ['admin', 'organization.owner']);

  app.post(
      '/organizations/:orgId/members',
      auth.can('add members to organization'),
      express.json(),
      function(req, res, next) {
        var view = auth.view(req);
        res.send(202, {
          roles: view.roles,
          entities: view.entities,
          actions: view.actions
        });
      });

  app.use(function(err, req, res, next) {
    if (err instanceof UnauthorizedError) {
      res.send(401, 'Unauthorized');
    } else {
      next(err);
    }
  });

  describe('adding an organization member', function() {

    it('should be allowed if user is owner', function() {

      chai.request(app)
        .post('/organizations/org1/members')
        .req(function(req) {
            req.set('x-fake-user-id', 'user.1');
          })
        .res(function(res) {
            assert.strictEqual(res.status, 202);
            var body = res.body;
            assert.isFalse(body.roles.admin, 'not admin');
            assert.isTrue(body.roles['organization.owner'], 'org owner');
            assert.isTrue(
                body.actions['add members to organization'], 'can add');
          });

    });

    it('should be denied if user is not owner', function() {

      chai.request(app)
        .post('/organizations/org1/members')
        .req(function(req) {
            req.set('x-fake-user-id', 'user.2');
          })
        .res(function(res) {
            assert.strictEqual(res.status, 401);
          });

    });

  });


});
