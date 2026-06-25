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
    cashIn: ['bearer', 'isOfficer'],
    requestP2P: ['bearer', 'isCustomer'],
    confirmP2P: ['bearer', 'isCustomer'],
    verifyP2P: ['bearer', 'isCustomer'],
    history: ['bearer', 'isCustomer'],
    detail: ['bearer', 'isCustomer'],
    trailDetail: ['bearer', 'isCustomer']
  },

  WalletController: {
    balance: ['bearer', 'isCustomer']
  },

};
