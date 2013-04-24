# Authorized!
**Action based authorization middleware**

The `authorized` package is available on npm.

    $ npm install authorized

[![Current Status](https://secure.travis-ci.org/tschaub/authorized.png?branch=master)](https://travis-ci.org/tschaub/authorized)

## Quick start

Import an authorization manager.

```js
var auth = require('authorized');
```

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

Now define what roles are required for your actions.

```js
auth.action('add members to organization', ['admin', 'organization.owner']);
```

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
      assert.ok(view.entities.organization);
      assert.strictEqual(view.roles['admin'], false);
      assert.strictEqual(view.roles['organization.owner'], true);
      assert.strictEqual(view.actions['add members to organization'], true);
    });
```

## What else?

This package is strictly about authorization.  For a full-featured
authentication package, see [PassportJS](http://passportjs.org/).

Inspiration is drawn here from [connect-roles](https://github.com/ForbesLindesay/connect-roles).
One major difference is that this is all async (you don't have to determine
if a user can perform an action synchronously).

## Check out the tests for more

Tests are run with mocha.

    npm test
