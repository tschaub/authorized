var chai = require('chai');
var View = require('authorized').View;


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

  describe('#entities', function() {
    it('is an object', function() {
      var view = new View();
      assert.isObject(view.entities);
    });
  });

  describe('#actions', function() {
    it('is an object', function() {
      var view = new View();
      assert.isObject(view.actions);
    });
  });

  describe('#roles', function() {
    it('is an object', function() {
      var view = new View();
      assert.isObject(view.roles);
    });
  });

});
