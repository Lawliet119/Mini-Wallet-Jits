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
  var demoCustomer = await ensureSeedCustomer({
    phone: sails.config.custom.seedCustomerPhone,
    pin: sails.config.custom.seedCustomerPin,
    currency: currency,
    balance: sails.config.custom.seedCustomerBalance
  });
  var demoReceiver = await ensureSeedCustomer({
    phone: sails.config.custom.seedReceiverPhone,
    pin: sails.config.custom.seedCustomerPin,
    currency: currency,
    balance: 0
  });

  sails.log.info('Seed ready:', {
    officerPhone: officer.phone,
    customerPhone: demoCustomer.phone,
    receiverPhone: demoReceiver.phone,
    bankPocket: bankPocket.id,
    systemPocket: systemPocket.id,
    currency: currency
  });

  var biller = await mockBillerService.ensureDefaultData();
  sails.log.info('Mock biller ready:', biller.code);

  var serviceConfigs = await configSeedService.seedDefaults();
  sails.log.info('Service configs ready:', serviceConfigs.map((service) => service.code).join(', '));

};

async function ensureSeedCustomer(options) {
  var customer = await Customer.findOne({ phone: options.phone });

  if (!customer) {
    customer = await Customer.create({
      phone: options.phone,
      pinHash: await pinService.hash(options.pin),
      status: 'active'
    }).fetch();

    sails.log.info('Seeded demo customer:', customer.phone);
  }

  var pocket = await Pocket.findOne({
    customer: customer.id,
    client: 'customer'
  });

  if (!pocket) {
    pocket = await pocketService.createCustomerPocket(customer.id, options.currency);
  }

  if (options.balance > 0 && pocket.balance < options.balance) {
    var nextPocket = Object.assign({}, pocket, {
      balance: options.balance,
      status: 'active'
    });

    await Pocket.updateOne({ id: pocket.id }).set({
      balance: options.balance,
      status: 'active',
      checksum: checksumService.signPocket(nextPocket)
    });
  }

  return customer;
}
