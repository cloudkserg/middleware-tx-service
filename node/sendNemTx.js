/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const ProviderService = require('../services/ProviderService'),
  constants = require('../config/constants'),
  config = require('../config'),
  providers = config.node[`${constants.blockchains.nem}`].providers;
const providerService = new ProviderService(constants.blockchains.nem, providers);

module.exports = {
  isNodeReadyForOrder: async () => {
    return true;
  },
  sendTx: async (raw) => {
    const connector = await providerService.get();
    const connection = await connector.instance.getConnection();

    const sendReply = await connection.announce(
      JSON.parse(raw)
    ).catch(e => {throw new Error(e);});

    if (!sendReply) 
      throw new Error('not reply from announce');

    if (sendReply.code !== 0 && sendReply.code !== 1)
      throw new Error(sendReply.message);
    
    return sendReply.transactionHash.data;
  }
};
