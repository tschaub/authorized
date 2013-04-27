var chai = require('chai');

var authorized = require('../../lib/authorized');

var ConfigError = authorized.ConfigError;
var Role = authorized.Role;


/** @type {boolean} */
chai.Assertion.includeStack = true;
var assert = chai.assert;

describe('Role', function() {

  describe('constructor', function() {

    it('creates a new role from a string', function() {
      var role = new Role('dungeon.master');
      assert.instanceOf(role, Role);
    });

    it('accepts a config object', function() {
      var role = new Role({relation: 'admin'});
      assert.instanceOf(role, Role);
    });

  });

  describe('#entity', function() {

    it('can be parsed from a string', function() {
      var role = new Role('repo.admin');
      assert.strictEqual(role.entity, 'repo');
    });

    it('can also be provided in the config object', function() {
      var role = new Role({entity: 'page', relation: 'owner'});
      assert.strictEqual(role.entity, 'page');
    });

    it('is optional (in the string)', function() {
      var role = new Role('admin');
      assert.strictEqual(role.entity, undefined);
    });

    it('is optional (in the config object)', function() {
      var role = new Role({relation: 'admin'});
      assert.strictEqual(role.entity, undefined);
    });

  });


  describe('#name', function() {

    it('is the same as the string arg', function() {
      var name = 'repo.admin';
      var role = new Role(name);
      assert.strictEqual(role.name, name);
    });

    it('is a concatenation of entity.string', function() {
      var role = new Role({entity: 'page', relation: 'owner'});
      assert.strictEqual(role.name, 'page.owner');
    });

    it('is just the relation if no entity provided (string form)', function() {
      var name = 'admin';
      var role = new Role(name);
      assert.strictEqual(role.name, name);
    });

    it('is just the relation if no entity provided (config form)', function() {
      var name = 'admin';
      var role = new Role({relation: name});
      assert.strictEqual(role.name, name);
    });

  });


  describe('#relation', function() {

    it('can be parsed from a string', function() {
      var role = new Role('repo.admin');
      assert.strictEqual(role.relation, 'admin');
    });

    it('can also be provided in the config object', function() {
      var role = new Role({entity: 'page', relation: 'owner'});
      assert.strictEqual(role.relation, 'owner');
    });

    it('is not optional (in the string)', function() {
      assert.throws(function() {var role = new Role('');}, ConfigError);
    });

    it('is not optional (in the config object)', function() {
      assert.throws(function() {var role = new Role({entity: 'orphan'});},
          ConfigError);
    });

  });

});
