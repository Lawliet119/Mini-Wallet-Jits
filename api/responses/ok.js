module.exports = function ok(data) {
  var res = this.res;
  var payload = Object.assign({
    err: respCode.SUCCESS.code,
    message: respCode.SUCCESS.message
  }, data || {});

  return res.status(200).json(payload);
};
