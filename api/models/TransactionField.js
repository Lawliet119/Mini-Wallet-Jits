/**
 * TransactionField.js
 *
 * Field contract and input-building metadata for a service.
 */
module.exports = {
  attributes: {
    service: {
      model: 'serviceconfig',
      required: true
    },

    order: {
      type: 'number',
      required: true
    },

    name: {
      type: 'string',
      required: true
    },

    rule: {
      type: 'string',
      isIn: ['mapping', 'query', 'constant', 'computed'],
      defaultsTo: 'mapping'
    },

    source: {
      type: 'string',
      allowNull: true
    },

    dataType: {
      type: 'string',
      isIn: ['string', 'number', 'boolean', 'json'],
      defaultsTo: 'string'
    },

    variable: {
      type: 'string',
      allowNull: true
    },

    required: {
      type: 'boolean',
      defaultsTo: true
    },

    minLength: {
      type: 'number',
      allowNull: true
    },

    maxLength: {
      type: 'number',
      allowNull: true
    },

    regex: {
      type: 'string',
      allowNull: true
    },

    errorCode: {
      type: 'string',
      allowNull: true
    },

    errorMessage: {
      type: 'string',
      allowNull: true
    },

    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active'
    }
  }
};
