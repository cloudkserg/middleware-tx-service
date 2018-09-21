/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const models = require('../../models'),
  config = require('../config'),
  expect = require('chai').expect,
  request = require('request-promise'),
  bitcoinTx = require('../utils/bitcoinTx'),
  ethTx = require('../utils/ethTx'),
  wavesTx = require('../utils/wavesTx'),
  Promise = require('bluebird'),
  fs = require('fs-extra'),
  spawn = require('child_process').spawn;


module.exports = (ctx) => {

  before (async () => {
    await models.txModel.deleteMany({});
  });


  it('send bitcoin for non exist node - get error', async () => {
    const keyring = await bitcoinTx.generateKeyring();
    const address = keyring.getAddress().toString();

    const nameQueue = 'test_tx_service_bitcoin_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue(nameQueue, config.rabbit.exchange,
      `${config.rabbit.serviceName}.bitcoin.${address}.*`
    );


    await Promise.all([
      (async () => {
        const response = await request(`http://localhost:${config.http.port}/bitcoin`, {
          method: 'POST',
          json: {
            tx: await bitcoinTx.signTransaction(null, keyring), 
            address
          }
        });
        //after generate address
        expect(response.ok).to.equal(true);
      })(),
      (async () => {
        await new Promise(res => {
          ctx.amqp.channel.consume(nameQueue, async (data) => {
            if (!data) 
              return;
            const message = JSON.parse(data.content);
            expect(message.ok).to.equal(false);

            await ctx.amqp.channel.deleteQueue(nameQueue);
            res();
          }, {noAck: true});
        });
      })()
    ]);
  });

  it('send eth for non exist node - get error', async () => {
    const address = await ethTx.getAddress();
    const nameQueue = 'test_tx_service_eth_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue(nameQueue, config.rabbit.exchange,
      `${config.rabbit.serviceName}.eth.${address}.*`
    );

    await Promise.all([
      (async () => {
        const response = await request(`http://localhost:${config.http.port}/eth`, {
          method: 'POST',
          json: {
            tx: await ethTx.signTransaction(null, address), 
            address
          }
        });
        //after generate address
        expect(response.ok).to.equal(true);
      })(),
      (async () => {
        await new Promise(res => {
          ctx.amqp.channel.consume(nameQueue, async (data) => {
            if (!data) 
              return;
            const message = JSON.parse(data.content);
            expect(message.ok).to.equal(false);

            await ctx.amqp.channel.deleteQueue(nameQueue);
            res();
          }, {noAck: true});
        });
      })()
    ]);
  });

  it('send eth for exist node, by less nonce - get error', async () => {
    await fs.remove('testrpc_db');
    ctx.nodePid = spawn('node', ['--max_old_space_size=4096', 'tests/utils/ipcConverter.js'], {
      env: process.env,
      stdio: 'ignore'
    });
    await Promise.delay(5000);

    const address = await ethTx.getAddress();
    const nameQueue = 'test_tx_service_eth_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue(nameQueue, config.rabbit.exchange, 
      `${config.rabbit.serviceName}.eth.${address}.*`
    );

    await Promise.all([
      (async () => {
        const response = await request(`http://localhost:${config.http.port}/eth`, {
          method: 'POST',
          json: {
            tx: await ethTx.signTransaction(null, address, 2), 
            address
          }
        });
        //after generate address
        expect(response.ok).to.equal(true);
      })(),
      (async () => {
        await new Promise(res => {
          ctx.amqp.channel.consume(nameQueue, async (data) => {
            if (!data) 
              return;
            const message = JSON.parse(data.content);
            expect(message.ok).to.equal(false);

            await ctx.amqp.channel.deleteQueue(nameQueue);
            res();
          }, {noAck: true});
        });
      })()
    ]);
    ctx.nodePid.kill();
  });

 
  it('send waves for non exist node - get error', async () => {
    const address = await wavesTx.getAddress();
    const nameQueue = 'test_tx_service_waves_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue(nameQueue, config.rabbit.exchange,
      `${config.rabbit.serviceName}.nem.${address}.*`
    );

    await Promise.all([
      (async () => {
        const response = await request(`http://localhost:${config.http.port}/waves`, {
          method: 'POST',
          json: {
            tx: await wavesTx.signTransaction(null, address), 
            address
          }
        });
        //after generate address
        expect(response.ok).to.equal(true);
      })(),
      (async () => {
        await new Promise(res => {
          ctx.amqp.channel.consume(nameQueue, async (data) => {
            if (!data) 
              return;
            const message = JSON.parse(data.content);
            expect(message.ok).to.equal(false);

            await ctx.amqp.channel.deleteQueue(nameQueue);
            res();
          }, {noAck: true});
        });
      })()
    ]);
  });
};
