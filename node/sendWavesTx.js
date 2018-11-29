/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
// const rpc = global.get('settings.node.rpc');
// const requests = global.get('settings.requests');
const ProviderService = require('../services/ProviderService'),
  constants = require('../config/constants'),
  config = require('../config'),
  providers = config.node[`${constants.blockchains.waves}`].providers;
const providerService = new ProviderService(constants.blockchains.waves, providers);


module.exports = {
  isNodeReadyForOrder: async () => {
    return true;
  },
  sendTx: async (txRaw) => {
    const connector = await providerService.get();
    const connection = await connector.instance.getConnection();
    const resultTx = await connection.broadcast(txRaw);
    return resultTx.id;
  }
};
