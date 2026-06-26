/**
 * Service.js
 *
 * High-level config record for one transaction service.
 */
module.exports = {
  tableName: 'serviceconfig',

  attributes: {
    code: {
      type: 'string',
      required: true,
      unique: true
    },

    name: {
      type: 'string',
      required: true
    },

    version: {
      type: 'number',
      defaultsTo: 1
    },

    type: {
      type: 'string',
      required: true
    },

    authMethod: {
      type: 'string',
      isIn: ['PIN', 'NONE'],
      defaultsTo: 'PIN'
    },

    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active'
    },

    description: {
      type: 'string',
      allowNull: true
    },

    metadata: {
      type: 'json'
    },

    definitions: {
      collection: 'transdefinition',
      via: 'service'
    },

    fields: {
      collection: 'transfield',
      via: 'service'
    },

    validations: {
      collection: 'transvalidation',
      via: 'service'
    },

    fees: {
      collection: 'fee',
      via: 'service'
    }
  }
};
