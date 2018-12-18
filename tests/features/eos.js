/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const models = require('../../models'),
  config = require('../config'),
  expect = require('chai').expect,
  request = require('request-promise'),
  eosTx = require('../utils/eosTx'),
  Promise = require('bluebird');


module.exports = (ctx) => {

  before (async () => {
    await models.txModel.deleteMany({});
  });


  it('connect to server and send normal eos tx', async () => {
    const address = await eosTx.getAddress();
    const connection = await eosTx.getConnection();

    const nameQueue = 'test_tx_service_eos_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue(nameQueue, config.rabbit.exchange, 
      `${config.rabbit.serviceName}.eos.${address}.*`
    );

    let order;

    await Promise.all([
      (async () => {
        const response = await request(`http://localhost:${config.http.port}/eos`, {
          method: 'POST',
          json: {
            tx: await eosTx.signTransaction(config.dev.eos.address, '0.0001', config.dev.eos.to), 
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

            
              console.log(message.hash);
              await Promise.delay(8000);
            const tx = await eosTx.getTransaction(message.hash);
            expect(tx && tx.block_num != '').to.eq(true);
            await ctx.amqp.channel.deleteQueue(nameQueue);
            res();
          }, {noAck: true});
        });
      })()
    ]);
  });


  

};
