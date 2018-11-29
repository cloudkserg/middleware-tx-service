/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const ProviderService = require('../services/ProviderService'),
  constants = require('../config/constants'),
  config = require('../config'),
  Promise = require('bluebird'),
  providers = config.node[`${constants.blockchains.eth}`].providers;
const providerService = new ProviderService(constants.blockchains.eth, providers);

module.exports = {
  isNodeReadyForOrder: async () => {
    return true;
  },
  sendTx: async (raw) => {
    const connector = await providerService.get();
    const connection = await connector.instance.getConnection();
    return await Promise.promisify(connection.eth.sendSignedTransaction)(raw).timeout(10000);
  }
};

