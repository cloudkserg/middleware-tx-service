const ProviderService = require('../../services/ProviderService'),
  constants = require('../../config/constants').blockchains,
  _ = require('lodash'),
  request = require('request-promise'),
  Promise = require('bluebird'),
  config = require('../config');

const makeRequest =  async (url, method = 'GET', body, headers = {}) => {
    const options = {
      method: method,
      body: body,
      uri: config.dev.waves.http + '/' + url,
      json: true,
      headers: headers
    };
    return Promise.resolve(request(options)).timeout(10000);
};

const signTransaction = async (fromAddress, amount, toAddress) => {
    return await makeRequest('transactions/sign', 'POST', {
        type: 4,
        sender: fromAddress,
        recipient: toAddress,
        amount: amount,
        fee: 100000,
        attachment: 'string'
    }, {
      'X-API-Key': config.dev.waves.apiKey
    });
};



const getAddress = () => {
  return config.dev.waves.address;
};


const getConnection = async () => {
  const providerService = new ProviderService(
    constants.waves,
    config.node[`${constants.waves}`].providers
  );
  const connector = await providerService.get();
  return connector.instance.getConnection();
};

module.exports = { getAddress, signTransaction, getConnection };
