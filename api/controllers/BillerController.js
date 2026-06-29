/**
 * BillerController.js
 *
 * Read endpoints for available billers.
 */
var codeMap = function(err) {
  return respCode[err.code] || respCode.SERVER_ERROR;
};

module.exports = {
  list: async function(req, res) {
    try {
      var billers = await Biller.find({ status: 'active' });

      return res.ok({
        billers: billers.map((biller) => {
          return {
            id: biller.id,
            code: biller.code,
            name: biller.name,
            status: biller.status
          };
        })
      });
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  }
};
