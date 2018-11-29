/**
 * Chronobank/waves-rest configuration
 * @module config
 * @returns {Object} Configuration
 * 
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
*/
require('dotenv').config();
const constants = require('./constants'),
  _ = require('lodash');

const parseProviders = (providerString, def) => _.chain(providerString).split(',')
  .map(provider => provider.trim())
  .filter(provider => provider.length)
  .thru(prov => prov.length ? prov : def)
  .value();

module.exports = {
  http: {
    port: parseInt(process.env.REST_PORT) || 8081,
  },
  mongo: {
    collectionPrefix: process.env.MONGO_COLLECTION_PREFIX || 'tx_service',
    data: { uri: process.env.MONGO_URI || 'mongodb://localhost:27017/data' }
  },
  rabbit: {
    exchange: process.env.RABBIT_EXCHANGE || 'internal',
    url: process.env.RABBIT_URI || 'amqp://localhost:5672',
    serviceName: process.env.RABBIT_SERVICE_NAME || 'tx_service'
  },
  oauthService: {
    url: process.env.OAUTH_SERVICE_URI || 'http://localhost:8082'
  },
  system: {
    rabbit: {
      url: process.env.SYSTEM_RABBIT_URI || process.env.RABBIT_URI || 'amqp://localhost:5672',
      exchange: process.env.SYSTEM_RABBIT_EXCHANGE || 'internal',
      serviceName: process.env.SYSTEM_RABBIT_SERVICE_NAME || 'system' 
    },
    waitTime: process.env.SYSTEM_WAIT_TIME ? parseInt(process.env.SYSTEM_WAIT_TIME) : 10000, 
    checkSystem: process.env.CHECK_SYSTEM ? parseInt(process.env.CHECK_SYSTEM) : true,
  },
  id: process.env.NAME || 'middleware_tx_service',
  secret: process.env.SECRET || '123',
  node: {
    waitOrderTime: process.env.WAIT_ORDER_TIME || 1000,
    [`${constants.blockchains.bitcoin}`]: {
      providers: parseProviders(process.env.BITCOIN_PROVIDERS,['/tmp/bitcoin'])
    },
    [`${constants.blockchains.eth}`]: {
      providers: parseProviders(process.env.ETH_PROVIDERS, ['/tmp/development/geth.ipc'])
    },
    [`${constants.blockchains.nem}`]: {
      providers: parseProviders(process.env.NEM_PROVIDERS, ['http://192.3.61.243:7890'])
    },
    [`${constants.blockchains.eos}`]: {
      providers: parseProviders(process.env.EOS_PROVIDERS, ['http://jungle2.cryptolions.io:80'])
    },
    [`${constants.blockchains.waves}`]: {
      providers: parseProviders(process.env.WAVES_PROVIDERS, ['http://localhost:6869'])
    },
  }
};
