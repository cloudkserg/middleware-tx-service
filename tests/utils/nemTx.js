const ProviderService = require('./services/ProviderService'),
  constants = require('./config/constants').blockchains,
  nem = require('nem-sdk').default,
  config = require('./config');


const signTransaction = async (connection, address) => {
  const privateKey = config.dev.nem.key;
  const to = config.dev.nem.to;
  const sum = 0.00001;

  const common = nem.model.objects.create('common')('',  privateKey);
  const transferTransaction = nem.model.objects.create('transferTransaction')(to, sum, 'Hello');
  const transactionEntity = nem.model.transactions.prepare('transferTransaction')(
    common, 
    transferTransaction, 
    -104
  );
  let kp = nem.crypto.keyPair.create(nem.utils.helpers.fixPrivateKey(privateKey));
  let result = nem.utils.serialization.serializeTransaction(transactionEntity);
  let signature = kp.sign(result);
  let obj = {
    'data': nem.utils.convert.ua2hex(result),
    'signature': signature.toString()
  };
  return JSON.stringify(obj);
};

const getConnection = async () => {
  const providerService = new ProviderService(
    constants.nem,
    config.node[`${constants.nem}`].providers
  );
  const connector = await providerService.get();
  return connector.instance.getConnection();
};


const getAddress = () => {
  return config.dev.nem.from;
};

module.exports = {getAddress, signTransaction, getConnection };
