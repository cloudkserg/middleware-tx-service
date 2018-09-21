const bcoin = require('bcoin'),
  ProviderService = require('../../services/ProviderService'),
  Network = require('bcoin/lib/protocol/network'),
  constants = require('../../config/constants').blockchains,
  _ = require('lodash'),
  config = require('../config');

const getConnection = async () => {
  const providerService = new ProviderService(
    constants.bitcoin,
    config.node[`${constants.bitcoin}`].providers
  );
  const connector = await providerService.get();
  return connector.instance.getConnection();
};
const generateKeyring = async () => {
  const network = Network.get('regtest');
  const keyPair = bcoin.hd.generate(network);
  return new bcoin.keyring(keyPair.privateKey, network);
};
const afterTransaction = async (connection, keyring) => {
  await connection.execute('generatetoaddress', [1, keyring.getAddress().toString()]).catch(console.error);
};

const signTransaction = async (connection, keyring) => {

  const network = Network.get('regtest');
  const keyPair2 = bcoin.hd.generate(network);

  let keyring2 = new bcoin.keyring(keyPair2.privateKey, network);
  let coins = [];
  if (connection) {
    await connection.execute('generatetoaddress', [60, keyring.getAddress().toString()]).catch(console.error);
    await connection.execute('generatetoaddress', [60, keyring2.getAddress().toString()]).catch(console.error);

    coins = await connection.execute('getcoinsbyaddress', [keyring.getAddress().toString()]);
  }
  let inputCoins = _.chain(coins)
    .transform((result, coin) => {
      result.coins.push(bcoin.coin.fromJSON(coin));
      result.amount += coin.value;
    }, {amount: 0, coins: []})
    .value();
  const mtx = new bcoin.mtx();
  mtx.addOutput({
    address: keyring2.getAddress(),
    value: Math.round(inputCoins.amount * 0.2)
  });
  await mtx.fund(inputCoins.coins, {
    rate: 10000,
    changeAddress: keyring.getAddress()
  });
  mtx.sign(keyring);
  const tx = mtx.toTX();
  return tx.toRaw().toString('hex');
};


module.exports = {signTransaction, generateKeyring, afterTransaction, getConnection};
