/**
 * tokenService.js
 *
 * JWT issuing and verification helpers.
 */
var jwt = require('jsonwebtoken');

var getSecret = function() {
  return process.env.JWT_SECRET || sails.config.custom.jwtSecret;
};

module.exports = {
  issue: function(user, role) {
    return jwt.sign({
      sub: user.id,
      role: role,
      phone: user.phone,
      type: 'access'
    }, getSecret(), {
      expiresIn: sails.config.custom.jwtExpiresIn || '15m'
    });
  },

  verify: function(token) {
    var payload = jwt.verify(token, getSecret());
    if (payload.type === 'refresh') {
      throw new Error('Refresh tokens cannot be used as access tokens');
    }
    return payload;
  },

  issueRefresh: function(user, role) {
    return jwt.sign({
      sub: user.id,
      role: role,
      phone: user.phone,
      type: 'refresh'
    }, getSecret(), {
      expiresIn: '7d'
    });
  },

  verifyRefresh: function(token) {
    var payload = jwt.verify(token, getSecret());
    if (payload.type !== 'refresh') {
      throw new Error('Access tokens cannot be used as refresh tokens');
    }
    return payload;
  }
};
