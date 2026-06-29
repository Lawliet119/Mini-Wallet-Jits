/**
 * Custom configuration
 * (sails.config.custom)
 *
 * One-off settings specific to your application.
 *
 * For more information on custom configuration, visit:
 * https://sailsjs.com/config/custom
 */

var isProduction = process.env.NODE_ENV === 'production';

var getSecret = function(envName, devFallback) {
  if (process.env[envName]) {
    return process.env[envName];
  }

  if (isProduction) {
    throw new Error(envName + ' must be set in production');
  }

  return devFallback;
};

module.exports.custom = {

  /***************************************************************************
  *                                                                          *
  * Any other custom config this Sails app should use during development.    *
  *                                                                          *
  ***************************************************************************/
  jwtSecret: getSecret('JWT_SECRET', 'dev-mini-wallet-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  checksumSecret: getSecret('CHECKSUM_SECRET', 'dev-pocket-checksum-change-me'),
  bootstrapSeed: process.env.BOOTSTRAP_SEED !== 'false',
  seedOfficerPhone: process.env.SEED_OFFICER_PHONE || '0900000000',
  seedOfficerPin: process.env.SEED_OFFICER_PIN || '123456',
  seedCustomerPhone: process.env.SEED_CUSTOMER_PHONE || '0703900625',
  seedReceiverPhone: process.env.SEED_RECEIVER_PHONE || '0334760905',
  seedCustomerPin: process.env.SEED_CUSTOMER_PIN || '123456',
  seedCustomerBalance: Number(process.env.SEED_CUSTOMER_BALANCE) || 500000,
  seedBankBalance: Number(process.env.SEED_BANK_BALANCE) || 1000000000,
  seedCurrency: process.env.SEED_CURRENCY || 'VND',

};
