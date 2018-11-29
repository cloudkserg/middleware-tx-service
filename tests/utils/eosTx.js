const ProviderService = require('../../services/ProviderService'),
  constants = require('../../config/constants').blockchains,
  config = require('../config'),
  request = require('request-promise'),
  { Api, JsonRpc, JsSignatureProvider } = require('eosjs'),
  fetch = require('node-fetch'),                            // node only; not needed in browsers
  { TextDecoder, TextEncoder } = require('text-encoding');  // node, IE11 and IE Edge Browsers


const signTransaction = async (fromAddress, amount, toAddress) => {
  const signatureProvider = new JsSignatureProvider([config.dev.eos.key]);
  const rpc = new JsonRpc(config.dev.eos.http, { fetch });
  const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
  const tx = await api.transact({
    actions: [{
      account: 'eosio.token',
      name: 'transfer',
      authorization: [{
        actor: fromAddress,
        permission: 'active',
      }],
      data: {
        from: fromAddress,
        to: toAddress,
        quantity: amount + ' EOS',
        memo: '',
      },
    }]
  }, {
    blocksBehind: 3,
    expireSeconds: 30,
    broadcast: false
  });
  return {
    serializedTransaction: new Buffer(tx.serializedTransaction).toString('hex'),
    signatures: tx.signatures
  };
};

const getTransaction = (id) => {
    return await request({
        uri: `${config.dev.eos.httpForGetTransaction}/${id}`,
        method: 'GET',
        json: true
    });
};


const getAddress = () => {
  return config.dev.eos.address;
};


const getConnection = async () => {
  const providerService = new ProviderService(
    constants.eos,
    config.node[`${constants.eos}`].providers
  );
  const connector = await providerService.get();
  return connector.instance.getConnection();
};

module.exports = { getAddress, signTransaction, getConnection, getTransaction };
