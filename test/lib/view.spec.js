var chai = require('chai');
var View = require('authorized').View;
var Role = require('authorized').Role;


/** @type {boolean} */
chai.Assertion.includeStack = true;
assert = chai.assert;

describe('View', function() {

  describe('constructor', function() {
    it('creates a new view', function() {
      var view = new View();
      assert.instanceOf(view, View);
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
      assert.strictEqual(view.can('edit page'), true);
      assert.strictEqual(view.can('delete page'), false);
    });

    it('returns undefined if unknown action', function() {
      var view = new View();
      assert.strictEqual(view.can('do nothing'), undefined);
    });
  });

  describe('#entities', function() {
    it('is an object', function() {
      var view = new View();
      assert.isObject(view.entities);
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
      assert.strictEqual(view.get('foo'), null);
    });
  });

  describe('#has()', function() {
    it('determines whether a role is assigned', function() {
      var view = new View();
      view.roles.admin = false;
      view.roles['page.author'] = true;
      assert.strictEqual(view.has('admin'), false);
      assert.strictEqual(view.has('page.author'), true);
    });

    it('returns undefined if unknown role', function() {
      var view = new View();
      assert.strictEqual(view.has('unknown'), undefined);
    });

    it('accepts a Role instance', function() {
      var view = new View();
      var admin = new Role('admin');
      var author = new Role('page.author');
      view.roles[admin.name] = false;
      view.roles[author.name] = true;
      assert.strictEqual(view.has(admin), false);
      assert.strictEqual(view.has(author), true);
    });
  });

  describe('#roles', function() {
    it('is an object', function() {
      var view = new View();
      assert.isObject(view.roles);
    });
  });

});
