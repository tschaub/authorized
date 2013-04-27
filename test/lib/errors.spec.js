var chai = require('chai');

var authorized = require('../../lib/authorized');

var ConfigError = authorized.ConfigError;
var UnauthorizedError = authorized.UnauthorizedError;


/** @type {boolean} */
chai.Assertion.includeStack = true;
var assert = chai.assert;

describe('ConfigError', function() {

  describe('constructor', function() {
    it('creates a new error', function() {
      var error = new ConfigError();
      assert.instanceOf(error, ConfigError);
      assert.instanceOf(error, Error);
      assert.notInstanceOf(error, UnauthorizedError);
    });
  });

  describe('#name', function() {
    it('identifies the error type', function() {
      var error = new ConfigError();
      assert.strictEqual(error.name, 'ConfigError');
    });
  });

  describe('#message', function() {
    it('describes the error', function() {
      var error = new ConfigError('messed up');
      assert.strictEqual(error.message, 'messed up');
    });
  });

});


describe('UnauthorizedError', function() {

  describe('constructor', function() {
    it('creates a new error', function() {
      var error = new UnauthorizedError();
      assert.instanceOf(error, UnauthorizedError);
      assert.instanceOf(error, Error);
      assert.notInstanceOf(error, ConfigError);
    });
  });

  describe('#name', function() {
    it('identifies the error type', function() {
      var error = new UnauthorizedError();
      assert.strictEqual(error.name, 'UnauthorizedError');
    });
  });

  describe('#message', function() {
    it('describes the error', function() {
      var error = new UnauthorizedError('not allowed');
      assert.strictEqual(error.message, 'not allowed');
    });
  });

});
