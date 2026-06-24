/**
 * bearer.js
 *
 * Verifies Authorization: Bearer <jwt> and attaches req.info.
 */
module.exports = async function(req, res, proceed) {
  var header = req.get('authorization') || '';
  var parts = header.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.error(respCode.UNAUTHORIZED);
  }

  try {
    var payload = tokenService.verify(parts[1]);
    var Model = payload.role === 'officer' ? Officer : Customer;
    var user = await Model.findOne({ id: payload.sub });

    if (!user || user.status !== 'active') {
      return res.error(respCode.UNAUTHORIZED);
    }

    req.info = {
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        status: user.status
      },
      role: payload.role
    };

    return proceed();
  } catch (unusedErr) {
    return res.error(respCode.UNAUTHORIZED);
  }
};
