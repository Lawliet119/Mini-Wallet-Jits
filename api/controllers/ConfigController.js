/**
 * ConfigController.js
 *
 * Read-only APIs for seeded transaction configuration.
 */
var codeMap = function(err) {
  return respCode[err.code] || respCode.SERVER_ERROR;
};

var makeError = function(code) {
  var err = new Error(code);
  err.code = code;
  return err;
};

var toPublicService = function(service) {
  return {
    id: service.id,
    code: service.code,
    name: service.name,
    version: service.version,
    type: service.type,
    authMethod: service.authMethod,
    status: service.status,
    description: service.description,
    metadata: service.metadata || {}
  };
};

module.exports = {
  listServices: async function(req, res) {
    try {
      var services = await ServiceConfig.find({
        status: 'active'
      }).sort('code ASC');

      return res.ok({
        services: services.map(toPublicService)
      });
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  },

  serviceDetail: async function(req, res) {
    try {
      var codeOrId = req.params.code;
      var service = await ServiceConfig.findOne({
        or: [
          { code: codeOrId },
          { id: codeOrId }
        ]
      });

      if (!service) {
        throw makeError('BAD_REQUEST');
      }

      var definitions = await TransactionDefinition.find({
        service: service.id
      }).sort('stepOrder ASC');
      var fields = await TransactionField.find({
        service: service.id
      }).sort('order ASC');
      var validations = await TransactionValidation.find({
        service: service.id
      }).sort('ruleOrder ASC');

      return res.ok({
        service: toPublicService(service),
        definitions: definitions,
        fields: fields,
        validations: validations
      });
    } catch (err) {
      sails.log.warn(err);
      return res.error(codeMap(err));
    }
  }
};
