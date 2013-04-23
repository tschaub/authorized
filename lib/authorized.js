var Manager = require('./manager').Manager;
var Role = require('./role').Role;
var View = require('./view').View;


/**
 * Singleton with default options.
 */
exports = module.exports = new Manager();


/**
 * @type {Manager}
 */
exports.Manager = Manager;


/**
 * @type {Role}
 */
exports.Role = Role;


/**
 * @type {View}
 */
exports.View = View;
