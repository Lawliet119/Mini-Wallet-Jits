/**
 * Biller.js
 *
 * Mock biller partner. Each biller owns one pocket.
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

    inquiryUrl: {
      type: 'string',
      allowNull: true
    },

    paymentUrl: {
      type: 'string',
      allowNull: true
    },

    pocket: {
      model: 'pocket',
      required: true
    },

    status: {
      type: 'string',
      isIn: ['active', 'inactive'],
      defaultsTo: 'active'
    }
  }
};
