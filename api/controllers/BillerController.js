/**
 * BillerController.js
 *
 * Read endpoints for available billers.
 */
module.exports = {
  list: async function(req, res) {
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
  }
};
