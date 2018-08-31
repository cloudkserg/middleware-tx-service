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
  bitcoinTx = require('./utils/bitcoinTx'),
  Promise = require('bluebird'),
  spawn = require('child_process').spawn;


module.exports = (ctx) => {

  before (async () => {
    await models.txModel.remove({});

    ctx.nodePid = spawn('node', ['tests/utils/bcoin/node.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(10000);
  });


  it('connect to server and send 150 bitcoin tx', async () => {
    const keyring = await bitcoinTx.generateKeyring();
    const address = keyring.getAddress().toString();
    const connection = await bitcoinTx.getConnection();

    const nameQueue = 'test_tx_service_bitcoin_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue('test_addr', 'events', 
      `${config.rabbit.serviceName}.bitcoin.${address}.*`
    );

    let order;

    await Promise.all([
      (async () => {
        const response = await request('http://localhost:${config.http.port}/bitcoin', {
          method: 'POST',
          json: {
            tx: await bitcoinTx.signTransaction(connection, keyring), 
            address
          }
        });
        //after generate address
        await bitcoinTx.afterTransaction(connection, keyring);
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

            const tx = await connection.execute('getrawtransaction', [message.hash]);
            expect(tx.hash).to.equal(message.hash);
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
