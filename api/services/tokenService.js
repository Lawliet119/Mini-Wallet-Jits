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
      phone: user.phone
    }, getSecret(), {
      expiresIn: sails.config.custom.jwtExpiresIn
    });
  },

  verify: function(token) {
    return jwt.verify(token, getSecret());
  }
};
