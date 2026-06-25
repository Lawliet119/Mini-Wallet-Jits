/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {

  /***************************************************************************
  *                                                                          *
  * Default policy for all controllers and actions, unless overridden.       *
  * (`true` allows public access)                                            *
  *                                                                          *
  ***************************************************************************/

  AccessController: {
    registerCustomer: true,
    loginCustomer: true,
    registerOfficer: true,
    loginOfficer: true,
    me: ['bearer']
  },

  TransactionController: {
    request: ['bearer'],
    confirm: ['bearer'],
    verify: ['bearer'],
    history: ['bearer', 'isCustomer'],
    detail: ['bearer', 'isCustomer'],
    trailDetail: ['bearer', 'isCustomer']
  },

  WalletController: {
    balance: ['bearer', 'isCustomer']
  },

  BillerController: {
    list: ['bearer', 'isCustomer']
  },

  ConfigController: {
    listServices: ['bearer', 'isOfficer'],
    serviceDetail: ['bearer', 'isOfficer']
  },

};
