/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

module.exports.custom = {

  /***************************************************************************
  *                                                                          *
  * Any other custom config this Sails app should use during development.    *
  *                                                                          *
  ***************************************************************************/
  jwtSecret: process.env.JWT_SECRET || 'dev-mini-wallet-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  checksumSecret: process.env.CHECKSUM_SECRET || 'dev-pocket-checksum-change-me',

};
