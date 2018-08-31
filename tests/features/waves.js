/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const models = require('../../models'),
  config = require('../config'),
  _ = require('lodash'),
  expect = require('chai').expect,
  request = require('request-promise'),
  wavesTx = require('./utils/wavesTx'),
  Promise = require('bluebird'),
  spawn = require('child_process').spawn;


module.exports = (ctx) => {

  before (async () => {
    await models.txModel.remove({});
    ctx.nodePid = spawn('java', ['-jar', 'tests/utils/waves/waves.jar', 'tests/utils/waves/waves-devnet.conf'], 
      {env: process.env, stdio: 'ignore'}
    );
    await Promise.delay(10000);
  });


  it('connect to server and send normal waves tx', async () => {
    const address = await wavesTx.getAddress();
    const connection = await wavesTx.getConnection();

    const nameQueue = 'test_tx_service_waves_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue('test_addr', 'events', 
      `${config.rabbit.serviceName}.waves.${address}.*`
    );

    let order;

    await Promise.all([
      (async () => {
        const response = await request('http://localhost:${config.http.port}/waves', {
          method: 'POST',
          json: {
            tx: await wavesTx.signTransaction(connection, address), 
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
            expect(tx.id).to.equal(message.hash);
            await ctx.amqp.channel.deleteQueue(nameQueue);
            res();
          }, {noAck: true});
        });
      })()
    ]);
  });


  after ('kill environment', async () => {
    ctx.nodePid.kill();
  });
};
