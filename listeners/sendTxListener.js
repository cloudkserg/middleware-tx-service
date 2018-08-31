/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const sendTxFabric = require('../node/sendTxFabric'),
  bunyan = require('bunyan'),
  _ = require('lodash'),
  config = require('../config'),
  models = require('../models'),
  log = bunyan.createLogger({name: 'tx-service.sendTxListener'});


const findTxs = async (data) => {
  return await models.txModel
    .find({address: data.address, order: {$lte: data.order}, blockchain: data.blockchain, hash: {$exists: false}})
    .sort('order');
};

const getThisTx = (txs, order) => _(txs).filter(tx => tx.order === order).first();
const haveEarlierTxs = (txs, order) => _.filter(txs, tx => tx.order < order).length > 0;
const saveTxError = async (tx, e) => { tx.hash = e.toString(); await tx.save(); };
const saveTxSuccess = async (tx, hash) => { tx.hash = hash; await tx.save(); };

const failSameTx = async (data) => {
  await models.txModel.updateMany({
    order: data.order, blockchain: data.blockchain, address: data.address, hash: {$exists: false}}, {
    hash: 'duplicate'
  });
};
const tryTxLater = async (tx, amqpService) => {  
  if (Date.now()/60 - tx.created/60 > config.node.waitOrderTime) 
    throw new Error(`Time for wait tx with order less than ${tx.order} exceeded, tx skipped`);
  await amqpService.publishTx(tx.blockchain, tx.order, tx.address); 
};

/**
 * send Transaction
 *
 * if error - publish msg with error msg
 * if success - publish msg with hash
 * if not error and need to wait - retranslat this message
 *
 * @param data
 * @param amqpService
 * @returns {Promise<void>}
 */
module.exports = async (data, amqpService) => {

  const sender = await sendTxFabric(data.blockchain);
  const txs = await findTxs(data);
  const thisTx = getThisTx(txs, data.order);

  //error if not has this tx
  if (!thisTx)
    throw new Error(`Not found this tx order=${data.order} type=${data.blockchain} address=${data.address} in db`);

  try {
    //skip if not send earler
    if (haveEarlierTxs(txs, data.order)) {
      log.error(`Try this transaction order=${data.order} type=${data.blockchain} address=${data.address} later - will have earlier txs in db`);
      return await tryTxLater(thisTx, amqpService);
    }

    if (!await sender.isNodeReadyForOrder(data.address, data.order)) {
      log.error(`Try this transaction order=${data.order} type=${data.blockchain} address=${data.address} later - node nonce not ready`);
      return await tryTxLater(thisTx, amqpService);
    }
    
    const hash = await sender.sendTx(thisTx.raw);
    await saveTxSuccess(thisTx, hash);
    await failSameTx(data);
    await amqpService.publishTxOk(thisTx);

  } catch (e) {
    console.log(e);
    log.error(e);
    await saveTxError(thisTx, e);
    return await amqpService.publishTxError(data, e.toString());
  }


};
