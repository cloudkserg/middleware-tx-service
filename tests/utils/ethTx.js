const ProviderService = require('../../services/ProviderService'),
  constants = require('../../config/constants').blockchains,
  Promise = require('bluebird'),
  ethers = require('ethers'),
  Tx = require('ethereumjs-tx'),
  config = require('../config');


const signTransaction = async (connection, address, nonce = null) => {
  const privateKey = config.dev.eth.key;
  let address1 = 'empty';

  if (connection) {
    const accounts = await Promise.promisify(connection.eth.getAccounts)();
    address1 = ethers.utils.getAddress(accounts[1]);
    nonce = nonce || await Promise.promisify(connection.eth.getTransactionCount)(address);
  }

  const privateKeyHex = new Buffer(privateKey, 'hex');
  const rawTx = {
    nonce: nonce === 0 ? nonce: nonce+1,
    from: address,
    gas:100000,
    to: address1,
    value: '1',
    data: ''
  };

  const tx = new Tx(rawTx);
  tx.sign(privateKeyHex);

  return '0x' + tx.serialize().toString('hex');
};

const getAddress = () => {
  return ethers.utils.getAddress(config.dev.eth.address);
};

const getConnection = async () => {
  const providerService = new ProviderService(
    constants.eth,
    config.node[`${constants.eth}`].providers
  );
  const connector = await providerService.get();
  return connector.instance.getConnection();
};

module.exports = {getAddress, signTransaction, getConnection };
