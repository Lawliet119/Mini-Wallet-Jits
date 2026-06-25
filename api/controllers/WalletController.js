/**
 * WalletController.js
 *
 * Customer wallet read endpoints.
 */
var codeMap = function(err) {
  return respCode[err.code] || respCode.SERVER_ERROR;
};

module.exports = {
  balance: async function(req, res) {
    try {
      var pocket = await Pocket.findOne({
        customer: req.info.user.id,
        client: 'customer'
      });

      if (!pocket) {
        return res.error(respCode.POCKET_NOT_FOUND);
      }

      var verifiedPocket = await pocketService.getVerifiedPocket(pocket.id);

      return res.ok({
        pocket: {
          id: verifiedPocket.id,
          client: verifiedPocket.client,
          currency: verifiedPocket.currency,
          balance: verifiedPocket.balance,
          status: verifiedPocket.status
        }
      });
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  }
};
