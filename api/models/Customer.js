/**
 * Customer.js
 *
 * End user account. Customers authenticate with phone + PIN and own one pocket.
 */
module.exports = {
  attributes: {
    phone: {
      type: 'string',
      required: true,
      unique: true
    },

    pinHash: {
      type: 'string',
      required: true,
      protect: true
    },

    status: {
      type: 'string',
      isIn: ['active', 'locked'],
      defaultsTo: 'active'
    },

    pocket: {
      collection: 'pocket',
      via: 'customer'
    }
  },

  customToJSON: function() {
    return _.omit(this, ['pinHash']);
  }
};
