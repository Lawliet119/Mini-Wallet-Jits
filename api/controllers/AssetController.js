/**
 * AssetController.js
 *
 * Serves the small hand-written frontend without relying on Grunt output.
 */
var path = require('path');

var sendAsset = function(res, relativePath, contentType) {
  res.type(contentType);
  return res.sendFile(path.resolve(sails.config.appPath, relativePath));
};

module.exports = {
  styles: function(req, res) {
    return sendAsset(res, 'assets/styles/importer.less', 'text/css');
  },

  walletApp: function(req, res) {
    return sendAsset(res, 'assets/js/wallet-app.js', 'application/javascript');
  }
};
