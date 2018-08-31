/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const ProviderService = require('../services/ProviderService'),
  constants = require('../config/constants'),
  config = require('../config'),
  providers = config.node[`${constants.blockchains.bitcoin}`].providers;
const providerService = new ProviderService(constants.blockchains.bitcoin, providers);

module.exports = {
  isNodeReadyForOrder: async () => {
    return true;
  },
  sendTx: async (raw) => {
    const connector = await providerService.get();
    const connection = connector.instance.getConnection();
    return await connection.execute('sendrawtransaction', [raw]);
  }
};
