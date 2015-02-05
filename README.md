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
auth.action('delete organization', ['admin']);
```

To perform the provided action, a user must have at least one of the given
roles.  In the first case, a user must be `admin` or `organization.owner` to add
members to an organization.  In the second case, a user must be `admin` to be
able to delete an organization.

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

If you have a view that might allow a user to perform multiple actions, you
can create middleware that allows the view to be rendered if any of a list of
actions are allowed.  In this case, the view will also have access to which
specific actions are allowed so you can conditionally render page elements.

```js
app.get(
    '/organizations/:orgId/manage', 
    auth.can('add members to organization', 'delete organization'),
    function(req, res, next) {
      /**
       * We've reached this point because the user can either add members or
       * delete the organization.
       */
      var view = auth.view(req);
      /**
       * To determine which actions are allowed, call the `can` method (or
       * inspect all of `view.actions`).
       */
      res.render('manage.html', {
        actions: view.actions
      });
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

## API

```js
var auth = require('authorized');
```

The `authorized` module exports a [`Manager`](#manager) instance with the
methods below.

### <a id='manager'>`Manager`</a>

#### <a id='manager.role'>`role(role, getter)`</a>

 * **role** `string` - Role name (e.g. 'organization.owner').
 * **getter** `function(req, done)` - Function that determines if the current
   user has the given role.  This function will be called with the request
   object and a callback.  The callback has the form
   `function(Error, boolean)` where the first argument is any error value
   generated while checking for the given role and the second is a boolean
   indicating whether the user has the role.

Register a getter for a role.  If the role is a string of the form
`entity.relation`, a getter for the entity must be registered with the
[`entity`](#manager.entity) method.  Roles without `.` are "simple" roles (e.g.
`"admin"`) and no entity is looked up.  Throws [`ConfigError`](#configerror) if
called with an invalid role name.

#### <a id='manager.entity'>`entity(type, getter)`</a>

 * **type** {string} - Entity type (e.g. 'organization').
 * **getter** `{function(req, done)` - Function called to get an entity from
   the provided request.  The `done` function has the form
   `function(Error, Object)` where the first argument is any error value
   generated while getting the entity and the second is the target entity.

Register a getter for an entity.  Throws [`ConfigError`](#configerror) if called
with invalid arguments.

#### <a id='manager.action'>`action(name, roles)`</a>

 * **name** `string` - Action name (e.g. 'add member to organization').
 * **roles** `Array.<string>`Roles allowed to perform this action.  If
   the current user has any one of the supplied roles, they can perform the
   action (e.g. ['admin', 'organization.owner']).

Specify the roles that a user must have to perform the named action.  Throws
[`ConfigError`](#configerror) if the provided roles have not yet been registered
with the [`role`](#manager.role) method.

#### <a id='manager.can'>`can(action)`</a>

 * **action** `string` Action name (e.g. 'add members to organization').
   May also be called with multiple action arguments.  Supplying '*' is an
   alternative to specifying all actions.

Create action based authorization middleware.  Returns a middleware function
with the signature `function(IncomingMessage, ServerResponse, function)`.  An
[`UnauthorizedError`](#unauthorizederror) will be passed to following middleware
when the user is not authorized to perform the given action.  Throws
[`ConfigError`](#configerror) if the provide action has not been registered
with the [`action`](#manager.action) method.

#### <a id='manager.view'>`view(req)`</a>

 * **req** `Object` - The request object.

Get cached authorization info for a request.  Returns a [`View`](#view)
instance for accessing authorization info for the given request.

### <a id='view'>`View`</a>

#### <a id='view.can'>`can(action)`</a>

 * **action** `string` - Action name.

Returns a `boolean` indicating whether the given action may be performed.

#### <a id='view.get'>`get(type)`</a>

 * **type** `string` - The entity type.

Returns the cached entity `Object` (or `null` if none found).

#### <a id='view.has'>`has(role)`</a>

 * **role** `string` - The role name.

Returns a `boolean` indicating whether the current user has the given role.

#### <a id='view.freeze'>`freeze()`</a>

Freeze the view.  This prevents entities, actions, and roles from being
modified.

### <a id='configerror'>`ConfigError`</a>

Thrown on configuration error.

### <a id='unauthorizederror'>`UnauthorizedError`</a>

Passed down the middleware chain when a user is not authorized to perform an
action.

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
