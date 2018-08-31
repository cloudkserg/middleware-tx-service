/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const createTxFabric = require('../tx/createTxFabric'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'tx-service'});

module.exports = async (blockchain, body, response, amqpService) => {
  try {
    const creator = createTxFabric(blockchain);
    const tx = await creator.createTx(body['tx'], body['address']);
    await amqpService.publishTx(blockchain, tx.order, tx.address);
    response.send({order: tx.order, ok: true});
  } catch (e) {
    log.error('throw error:' + e.toString());
    response.status(400);
    response.send('Failure in send tx');
  }
};
