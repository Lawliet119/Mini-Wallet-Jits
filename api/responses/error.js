module.exports = function error(codeDef, data) {
  var res = this.res;
  var safeCodeDef = codeDef || respCode.SERVER_ERROR;
  var payload = Object.assign({
    err: safeCodeDef.code,
    message: safeCodeDef.message
  }, data || {});

  return res.status(200).json(payload);
};
