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

  'POST /api/v1/customers/register': 'AccessController.registerCustomer',
  'POST /api/v1/customers/login': 'AccessController.loginCustomer',
  'POST /api/v1/officers/register': 'AccessController.registerOfficer',
  'POST /api/v1/officers/login': 'AccessController.loginOfficer',
  'GET /api/v1/access/me': 'AccessController.me',
  'POST /api/v1/transactions/p2p/request': 'TransactionController.requestP2P',
  'POST /api/v1/transactions/p2p/confirm': 'TransactionController.confirmP2P',
  'POST /api/v1/transactions/p2p/verify': 'TransactionController.verifyP2P',


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
