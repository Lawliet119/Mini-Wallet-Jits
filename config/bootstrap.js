/**
 * Seed Function
 * (sails.config.bootstrap)
 *
 * A function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also create a hook.
 *
 * For more information on seeding your app with fake data, check out:
 * https://sailsjs.com/config/bootstrap
 */

module.exports.bootstrap = async function() {
  if (!sails.config.custom.bootstrapSeed) {
    return;
  }

  var currency = sails.config.custom.seedCurrency;
  var officerPhone = sails.config.custom.seedOfficerPhone;

  var officer = await Officer.findOne({ phone: officerPhone });
  if (!officer) {
    officer = await Officer.create({
      phone: officerPhone,
      name: 'Default Officer',
      pinHash: await pinService.hash(sails.config.custom.seedOfficerPin),
      status: 'active'
    }).fetch();

    sails.log.info('Seeded default officer:', officer.phone);
  }

  var bankPocket = await pocketService.createInternalPocket('bank', {
    currency: currency,
    balance: sails.config.custom.seedBankBalance
  });
  var systemPocket = await pocketService.createInternalPocket('system', {
    currency: currency,
    balance: 0
  });

  sails.log.info('Seed ready:', {
    officerPhone: officer.phone,
    bankPocket: bankPocket.id,
    systemPocket: systemPocket.id,
    currency: currency
  });

};
