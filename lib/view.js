var Role = require('./role').Role;



/**
 * @constructor
 */
function View() {
  this.entities = {};
  this.actions = {};
  this.roles = {};
}


/**
 * Check if an action can be performed.
 * @param {string} action Action name.
 * @return {boolean} The auth manager has determined that the given action can
 *     be performed.
 */
View.prototype.can = function(action) {
  return this.actions[action];
};


/**
 * Get a cached entity.
 * @param {string} type Entity type.
 * @return {Object} The cached entity (or null if none found).
 */
View.prototype.get = function(type) {
  return this.entities[type] || null;
};


/**
 * Check if a role is assigned.
 * @param {string} role Role name.
 * @return {boolean} The current user has the given role.
 */
View.prototype.has = function(role) {
  if (role instanceof Role) {
    role = role.name;
  }
  return this.roles[role];
};


/**
 * @type {View}
 */
exports.View = View;
