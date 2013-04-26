var ConfigError = require('./errors').ConfigError;


/**
 * @param {string} str Role name (assumes entity.relation syntax).
 * @return {Object} Role config object.
 */
function parseConfig(str) {
  var parts = str.split('.'),
      config = {};

  config.relation = parts.pop();
  config.entity = parts.pop();
  return config;
}



/**
 * @constructor
 * @param {Object} config Role config object.
 */
function Role(config) {
  if (typeof config === 'string') {
    config = parseConfig(config);
  }
  if (!config.relation) {
    throw new ConfigError('Role must have a relation');
  }
  this.entity = config.entity;
  this.relation = config.relation;
  this.name = this.entity ? this.entity + '.' + this.relation : this.relation;
}


/**
 * @type {Role}
 */
exports.Role = Role;
