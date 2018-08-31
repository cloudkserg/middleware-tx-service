/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */


const config = require('../config'),
  models = require('../../models'),
  spawn = require('child_process').spawn,
  _ = require('lodash'),
  memwatch = require('memwatch-next'),
  expect = require('chai').expect,
  request = require('request-promise'),
  bitcoinTx = require('./utils/bitcoinTx'),
  ethTx = require('./utils/ethTx'),
  fs = require('fs-extra'),
  Promise = require('bluebird');


module.exports = (ctx) => {

  before (async () => {
    await models.txModel.remove({});
  });

  it('validate memory for bitcoin 20 tx', async () => {
    ctx.nodePid = spawn('node', ['tests/utils/bcoin/node.js'], {env: process.env, stdio: 'ignore'});
    await Promise.delay(10000);

    let hd = new memwatch.HeapDiff();

    const keyring = await bitcoinTx.generateKeyring();
    const address = keyring.getAddress().toString();
    const connection = await bitcoinTx.getConnection();

    const nameQueue = 'test_tx_service_bitcoin_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue('test_addr', 'events', 
      `${config.rabbit.serviceName}.bitcoin.${address}.*`
    );

    await Promise.all([
      (async () => {
        await Promise.map(_.range(0, 20), async (r) => {
          await request('http://localhost:${config.http.port}/bitcoin', {
            method: 'POST',
            json: {
              tx: await bitcoinTx.signTransaction(connection, keyring), 
              address
            }
          });
          //after generate address
          await bitcoinTx.afterTransaction(connection, keyring);
        });
      })(),
      (async () => {
        await new Promise(res => {
          let r = 0;
          ctx.amqp.channel.consume(nameQueue, async (data) => {
            if (!data) 
              return;
            r++;
            if (r >= 20) {
              await ctx.amqp.channel.deleteQueue(nameQueue);
              res();
            }
          }, {noAck: true});
        });
      })()
    ]);


    let diff = hd.end();
    let leakObjects = _.filter(diff.change.details, detail => detail.size_bytes / 1024 / 1024 > 3);

    expect(leakObjects.length).to.be.eq(0);

    ctx.nodePid.kill();
    
  });

  it('validate memory for eth 20 tx', async () => {
    await fs.remove('testrpc_db');
    ctx.nodePid = spawn('node', ['--max_old_space_size=4096', 'tests/utils/ipcConverter.js'], {
      env: process.env,
      stdio: 'ignore'
    });
    await Promise.delay(5000);

    let hd = new memwatch.HeapDiff();

    const address = await ethTx.getAddress();
    const connection = await ethTx.getConnection();

    const nameQueue = 'test_tx_service_eth_feature'; 
    await ctx.amqp.channel.assertQueue(nameQueue, {autoDelete: true, durable: false, noAck: true});
    await ctx.amqp.channel.bindQueue('test_addr', 'events', 
      `${config.rabbit.serviceName}.eth.${address}.*`
    );

    await Promise.all([
      (async () => {
        await Promise.map(_.range(0, 20), async (r) => {
          await request('http://localhost:${config.http.port}/eth', {
            method: 'POST',
            json: {
              tx: await ethTx.signTransaction(connection, address), 
              address
            }
          });
        });
      })(),
      (async () => {
        await new Promise(res => {
          let r = 0;
          ctx.amqp.channel.consume(nameQueue, async (data) => {
            if (!data) 
              return;
            r++;
            if (r >= 20) {
              await ctx.amqp.channel.deleteQueue(nameQueue);
              res();
            }
          }, {noAck: true});
        });
      })()
    ]);


    let diff = hd.end();
    let leakObjects = _.filter(diff.change.details, detail => detail.size_bytes / 1024 / 1024 > 3);

    expect(leakObjects.length).to.be.eq(0);

    ctx.nodePid.kill();
    
  });

  it('validate timeout for bitcoin 50 requests', async () => {
    const keyring = await bitcoinTx.generateKeyring();
    const address = keyring.getAddress().toString();
    const connection = await bitcoinTx.getConnection();

    const start = Date.now();
    await Promise.map(_.range(0, 50), async (r) => {
      await request('http://localhost:${config.http.port}/bitcoin', {
        method: 'POST',
        json: {
          tx: await bitcoinTx.signTransaction(connection, keyring), 
          address
        }
      });
    });
    expect(Date.now() - start).to.be.below(50000);
  });



};
