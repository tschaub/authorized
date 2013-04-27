var chai = require('chai');

var authorized = require('../../lib/authorized');

var View = authorized.View;
var Role = authorized.Role;


/** @type {boolean} */
chai.Assertion.includeStack = true;
var assert = chai.assert;

describe('View', function() {

  describe('constructor', function() {
    it('creates a new view', function() {
      var view = new View();
      assert.instanceOf(view, View);
    });

    it('creates a frozen object', function() {
      var view = new View();
      view.foo = 'bar';
      assert.isUndefined(view.foo);
      var before = view.actions;
      view.actions = {};
      assert.strictEqual(view.actions, before);
    });
  });

  describe('#actions', function() {
    it('is an object', function() {
      var view = new View();
      assert.isObject(view.actions);
    });
  });

  describe('#can()', function() {
    it('determines if an action can be performed', function() {
      var view = new View();
      view.actions['edit page'] = true;
      view.actions['delete page'] = false;
      assert.isTrue(view.can('edit page'));
      assert.isFalse(view.can('delete page'));
    });

    it('returns undefined if unknown action', function() {
      var view = new View();
      assert.isUndefined(view.can('do nothing'));
    });
  });

  describe('#entities', function() {
    it('is an object', function() {
      var view = new View();
      assert.isObject(view.entities);
    });
  });

  describe('#freeze()', function() {
    it('prevents cached actions from being modified', function() {
      var view = new View();
      view.actions['do anything'] = true;
      assert.isTrue(view.can('do anything'));

      view.freeze();
      view.actions['do anything'] = false;
      assert.isTrue(view.can('do anything'));

      view.actions['view passwords'] = true;
      assert.isUndefined(view.can('view passwords'));
    });

    it('prevents cached entities from being modified', function() {
      var view = new View();
      var page = {};
      view.entities.page = page;
      assert.strictEqual(view.get('page'), page);

      view.freeze();
      view.entities.page = {};
      assert.strictEqual(view.get('page'), page);

      view.entities.organization = {};
      assert.isNull(view.get('organization'));
    });

    it('prevents cached roles from being modified', function() {
      var view = new View();
      view.roles.admin = false;
      view.roles['page.author'] = true;
      assert.isFalse(view.has('admin'));
      assert.isTrue(view.has('page.author'));

      view.freeze();
      view.roles.admin = true;
      assert.isFalse(view.has('admin'));

      view.roles['site.owner'] = true;
      assert.isUndefined(view.has('site.owner'));
    });
  });

  describe('#get()', function() {
    it('gets a cached entity', function() {
      var view = new View();
      var page = {};
      view.entities.page = page;
      assert.strictEqual(view.get('page'), page);
    });

    it('returns null if none found', function() {
      var view = new View();
      assert.isNull(view.get('foo'));
    });
  });

  describe('#has()', function() {
    it('determines whether a role is assigned', function() {
      var view = new View();
      view.roles.admin = false;
      view.roles['page.author'] = true;
      assert.isFalse(view.has('admin'));
      assert.isTrue(view.has('page.author'));
    });

    it('returns undefined if unknown role', function() {
      var view = new View();
      assert.isUndefined(view.has('unknown'));
    });

    it('accepts a Role instance', function() {
      var view = new View();
      var admin = new Role('admin');
      var author = new Role('page.author');
      view.roles[admin.name] = false;
      view.roles[author.name] = true;
      assert.isFalse(view.has(admin));
      assert.isTrue(view.has(author));
    });
  });

  describe('#roles', function() {
    it('is an object', function() {
      var view = new View();
      assert.isObject(view.roles);
    });
  });

});
