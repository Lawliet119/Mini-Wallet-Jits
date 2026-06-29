/**
 * tokenService.js
 *
 * JWT issuing and verification helpers.
 */
var jwt = require('jsonwebtoken');

var getSecret = function() {
  return process.env.JWT_SECRET || sails.config.custom.jwtSecret;
};

var assertKnownRole = function(role) {
  if (role !== 'customer' && role !== 'officer') {
    throw new Error('Invalid token role');
  }
};

module.exports = {
  issue: function(user, role) {
    assertKnownRole(role);

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
    if (payload.type !== 'access') {
      throw new Error('Only access tokens can be used for bearer auth');
    }
    assertKnownRole(payload.role);
    return payload;
  },

  issueRefresh: function(user, role) {
    assertKnownRole(role);

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
    assertKnownRole(payload.role);
    return payload;
  }
};
