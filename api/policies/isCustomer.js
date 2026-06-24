module.exports = async function(req, res, proceed) {
  if (req.info && req.info.role === 'customer') {
    return proceed();
  }

  return res.error(respCode.FORBIDDEN);
};
