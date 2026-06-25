/**
 * ServiceConfig.js
 *
 * High-level config record for one transaction service.
 */
module.exports = {
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
      isIn: ['p2p', 'cash_in', 'bill_payment'],
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
      collection: 'transactiondefinition',
      via: 'service'
    },

    fields: {
      collection: 'transactionfield',
      via: 'service'
    },

    validations: {
      collection: 'transactionvalidation',
      via: 'service'
    }
  }
};
