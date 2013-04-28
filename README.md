# Authorized!
**Action based authorization middleware**

The `authorized` package is available on [npm](https://npmjs.org/package/authorized).

    $ npm install authorized

## Quick start

Import an authorization manager.

```js
var auth = require('authorized');
```

### Roles

Provide getters for your application roles.

```js
auth.role('admin', function(req, done) {
  done(null, req.user && req.user.admin);
});
```

Roles can use `<entity>.<relation>` syntax.

```js
// getters for entity.relation type roles are called with the entity
auth.role('organization.owner', function(org, req, done) {
  if (!req.user) {
    done();
  } else {
    done(null, !!~org.owners.indexOf(req.user.id));
  }
});
```

### Entities

Provide getters for your application entities.

```js
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
```

### Actions

Now define what roles are required for your actions.

```js
auth.action('add members to organization', ['admin', 'organization.owner']);
```

To perform the provided action, a user must have at least one of the given
roles.  In this case, a user must be `admin` or `organization.owner` to add
members to an organization.

Note that entity and role getters can be added in any order, but you cannot
configure actions until all entity and role getters have been added.

### Middleware

Now you're ready to generate authorization middleware.

```js
var middleware = auth.can('add members to organization');
```

This middleware can be used in Connect/Express apps in your route definitions.

```js
var assert = require('assert');
var express = require('express');
var app = express();
app.post(
    '/organizations/:orgId/members', 
    auth.can('add members to organization'),
    function(req, res, next) {
      // you can safely let the user add members to the org here
      // you can also access entities, roles, and actions for your view
      var view = auth.view(req);
      assert.ok(view.get('organization'));
      assert.strictEqual(view.has('admin'), false);
      assert.strictEqual(view.has('organization.owner'), true);
      // this is implicit since this middleware is only called if true
      assert.strictEqual(view.can('add members to organization'), true);
      // pretend we added a member to the org
      res.send(202, 'member added');
    });
```

### Handling unauthorized actions

If the auth manager decides a user is not authorized to perform a specific
action, an `UnauthorizedError` will be passed down the middleware chain.  To
provide specific handling for this error, configure your application with
error handling middleware.

```js
app.use(function(err, req, res, next) {
  if (err instanceof auth.UnauthorizedError) {
    res.send(401, 'Unauthorized');
  } else {
    next(err);
  }
});
```

## What else?

This package is strictly about authorization.  For a full-featured
authentication package, see [PassportJS](http://passportjs.org/).

Inspiration is drawn here from [connect-roles](https://github.com/ForbesLindesay/connect-roles).
One major difference is that this is all async (you don't have to determine
if a user can perform an action synchronously).

## Check out the tests for more

See the [unit](test/lib) and [integration](test/integration) tests for more detail on how `authorized` is used.

To run the linter and tests:

    npm test

During development, the linter and tests can be run continously:

    npm run watch

[![Current Status](https://secure.travis-ci.org/tschaub/authorized.png?branch=master)](https://travis-ci.org/tschaub/authorized)
