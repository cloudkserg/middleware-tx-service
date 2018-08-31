/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const models = require('../../models'),
  config = require('../config'),
  expect = require('chai').expect,
  request = require('request-promise'),
  nemTx = require('./utils/nemTx'),
  Promise = require('bluebird');


module.exports = (ctx) => {

  before (async () => {
    await models.txModel.remove({});
  });


  it('connect to server and send normal nem tx', async () => {
    const address = await nemTx.getAddress();
    const connection = await nemTx.getConnection();

    const nameQueue = 'test_tx_service_nem_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue('test_addr', 'events', 
      `${config.rabbit.serviceName}.nem.${address}.*`
    );

    let order;

    await Promise.all([
      (async () => {
        const response = await request('http://localhost:${config.http.port}/nem', {
          method: 'POST',
          json: {
            tx: await nemTx.signTransaction(connection, address), 
            address
          }
        });
        //after generate address
        expect(response.ok).to.equal(true);
        order = response.order;
      })(),
      (async () => {
        await new Promise(res => {
          ctx.amqp.channel.consume(nameQueue, async (data) => {
            if (!data) 
              return;
            const message = JSON.parse(data.content);
            expect(message.ok).to.equal(true);
            expect(message.order).to.equal(order);

            const tx = await connection.getTx(message.hash);
            expect(tx.hash).to.equal(message.hash);
            await ctx.amqp.channel.deleteQueue(nameQueue);
            res();
          }, {noAck: true});
        });
      })()
    ]);
  });


  

};
