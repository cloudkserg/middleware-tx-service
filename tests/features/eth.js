/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const models = require('../../models'),
  config = require('../config'),
  expect = require('chai').expect,
  request = require('request-promise'),
  ethTx = require('../utils/ethTx'),
  Promise = require('bluebird'),
  fs = require('fs-extra'),
  spawn = require('child_process').spawn;


module.exports = (ctx) => {

  before (async () => {
    await models.txModel.deleteMany({});

    await fs.remove('testrpc_db');
    ctx.nodePid = spawn('node', ['--max_old_space_size=4096', 'tests/utils/ipcConverter.js'], {
      env: process.env,
      stdio: 'inherit'
    });
    await Promise.delay(5000);
  });


  it('connect to server and send normal eth tx', async () => {
    const address = await ethTx.getAddress();
    const connection = await ethTx.getConnection();

    const nameQueue = 'test_tx_service_eth_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue(nameQueue, config.rabbit.exchange,
      `${config.rabbit.serviceName}.eth.${address}.*`
    );

    let order;

    await Promise.all([
      (async () => {
        const response = await request(`http://localhost:${config.http.port}/eth`, {
          method: 'POST',
          json: {
            tx: await ethTx.signTransaction(connection, address), 
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
console.log(message);
            expect(message.ok).to.equal(true);
            expect(message.order).to.equal(order);

            const tx = await Promise.promisify(connection.eth.getTransaction)(message.hash).timeout(10000);
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
