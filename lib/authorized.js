var Manager = require('./manager').Manager;
var Role = require('./role').Role;
var View = require('./view').View;
var errors = require('./errors');


/**
 * Singleton with default options.
 */
exports = module.exports = new Manager();


/**
 * @type {ConfigError}
 */
exports.ConfigError = errors.ConfigError;


/**
 * @type {Manager}
 */
exports.Manager = Manager;


/**
 * @type {Role}
 */
exports.Role = Role;


/**
 * @type {UnauthorizedError}
 */
exports.UnauthorizedError = errors.UnauthorizedError;


/**
 * @type {View}
 */
exports.View = View;
