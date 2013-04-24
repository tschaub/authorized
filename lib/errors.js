var util = require('util');

function makeError(self, args) {
  Error.apply(self, args);
  Error.captureStackTrace(self, args.callee);
  self.message = args[0];
  self.name = args.callee.name;
}



/**
 * @constructor
 * @param {string} message Error message.
 */
exports.ConfigError = function ConfigError(message) {
  makeError(this, arguments);
};
util.inherits(exports.ConfigError, Error);



/**
 * @constructor
 * @param {string} message Error message.
 */
exports.UnauthorizedError = function UnauthorizedError(message) {
  makeError(this, arguments);
};
util.inherits(exports.UnauthorizedError, Error);
