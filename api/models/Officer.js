/**
 * Officer.js
 *
 * Admin/operator account. Officers share the same permission level in this app.
 */
module.exports = {
  attributes: {
    phone: {
      type: 'string',
      required: true,
      unique: true
    },

    name: {
      type: 'string',
      allowNull: true
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
    }
  },

  customToJSON: function() {
    return _.omit(this, ['pinHash']);
  }
};
