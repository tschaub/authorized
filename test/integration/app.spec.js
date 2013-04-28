var express = require('express');
var chai = require('chai');
var chaiHttp = require('chai-http');

var authorized = require('../../lib/authorized');
var Manager = authorized.Manager;
var UnauthorizedError = authorized.UnauthorizedError;


/** @type {boolean} */
chai.Assertion.includeStack = true;
chai.use(chaiHttp);
var assert = chai.assert;

var auth = new Manager();
var app = express();

auth.role('admin', function(req, done) {
  done(null, req.user && req.user.admin);
});

auth.role('organization.owner', function(org, req, done) {
  var id = req.get('x-fake-user-id');
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
    function(req, res, next) {
      // you can safely let the user add members to the org here
      // you can also access entities, roles, and actions for your view
      var view = auth.view(req);
      // pretend we added a member to the org
      res.send(202, {
        message: 'member added',
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

describe('adding an organization member as organization owner', function() {

  it('should succeed', function() {

    chai.request(app)
      .post('/organizations/org1/members')
      .req(function(req) {
          req.set('x-fake-user-id', 'user.1');
        })
      .res(function(res) {
          assert.strictEqual(res.status, 202);
        });

  });

});
