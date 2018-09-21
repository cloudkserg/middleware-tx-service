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

const MINIMUM_FEE = 100000;


function removeRecipientPrefix (original) {
  if (original.slice(0, 8) === 'address:')
    return original.slice(8);
  else
    return original;
}

const prepareTransaction = (tx) => {
  return {
    transactionType: null, //'transfer',
    senderPublicKey: tx.senderPublicKey,
    assetId: tx.assetId === 'WAVES' ? null : tx.assetId,
    feeAsset: tx.feeAssetId === 'WAVES' ? null : tx.feeAssetId,
    timestamp: tx.timestamp,
    amount: tx.amount,
    fee: tx.fee || MINIMUM_FEE,
    recipient: removeRecipientPrefix(tx.recipient),
    attachment: tx.attachment,
    signature: tx.signature
  };
};

module.exports = {
  isNodeReadyForOrder: async () => {
    return true;
  },
  sendTx: async (txRaw) => {
    const connector = await providerService.get();
    const connection = await connector.instance.getConnection();
    const txObj = JSON.parse(txRaw);
    return await connection.broadcast(prepareTransaction(txObj));
  }
};
