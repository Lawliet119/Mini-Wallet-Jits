/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {

  /***************************************************************************
  *                                                                          *
  * Make the view located at `views/homepage.ejs` your home page.            *
  *                                                                          *
  * (Alternatively, remove this and add an `index.html` file in your         *
  * `assets` directory)                                                      *
  *                                                                          *
  ***************************************************************************/

  '/': { view: 'pages/homepage' },
  'GET /styles/importer.css': 'AssetController.styles',
  'GET /js/wallet-app.js': 'AssetController.walletApp',

  'POST /api/v1/access/login': 'AccessController.login',
  'POST /api/v1/customers/register': 'AccessController.registerCustomer',
  'POST /api/v1/customers/login': 'AccessController.loginCustomer',
  'POST /api/v1/officers/register': 'AccessController.registerOfficer',
  'POST /api/v1/officers/login': 'AccessController.loginOfficer',
  'GET /api/v1/access/me': 'AccessController.me',
  'GET /api/v1/wallet/balance': 'WalletController.balance',
  'GET /api/v1/billers': 'BillerController.list',
  'GET /api/v1/config/services': 'ConfigController.listServices',
  'GET /api/v1/config/services/:code': 'ConfigController.serviceDetail',
  'GET /api/v1/transactions/history': 'TransactionController.history',
  'GET /api/v1/transactions/trails/:transRefId': 'TransactionController.trailDetail',
  'GET /api/v1/transactions/:id': 'TransactionController.detail',
  'POST /api/v1/transactions/request': 'TransactionController.request',
  'POST /api/v1/transactions/confirm': 'TransactionController.confirm',
  'POST /api/v1/transactions/verify': 'TransactionController.verify',


  /***************************************************************************
  *                                                                          *
  * More custom routes here...                                               *
  * (See https://sailsjs.com/config/routes for examples.)                    *
  *                                                                          *
  * If a request to a URL doesn't match any of the routes in this file, it   *
  * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
  * not match any of those, it is matched against static assets.             *
  *                                                                          *
  ***************************************************************************/


};
