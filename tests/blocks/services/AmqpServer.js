/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const expect = require('chai').expect,
  EventEmitter = require('events'),
  AmqpServer = require('../../../services/AmqpServer'),
  Promise = require('bluebird'),
  config = require('../../config');
  module.exports = (ctx) => {

  afterEach(async () => {
    if (ctx.amqp.queue)
      await ctx.amqp.channel.deleteQueue(ctx.amqp.queue.queue);
    await Promise.delay(1000);
  });


  it('construct without parameters - errors', async () => {
    expect( function(){ new AmqpServer(); } ).to.throw();
  });


  it('construct with right parameters', async () => {
    const server = new AmqpServer(config.rabbit);
    expect(server.url).to.equal(config.rabbit.url);
    expect(server.exchange).to.equal(config.rabbit.exchange);
    expect(server.serviceName).to.equal(config.rabbit.serviceName);
    expect(server).instanceOf(EventEmitter);
    expect(server).instanceOf(AmqpServer);
  });


  it('start() and close() - check that up', async () => {
    const server = new AmqpServer(config.rabbit);
    await server.start();

    expect(server.amqpInstance.connection.stream._readableState.ended).to.equal(false);
    expect(server.channel.connection.stream._readableState.ended).to.equal(false);

    await server.close();
  });

  
  it('addBind(routing) - check that bind on this and not another routing', async () => {
    const routing = 'routing';

    const server = new AmqpServer(config.rabbit);
    await server.start();
    await server.addBind(routing);

    await Promise.all([
      (async () =>{
        await ctx.amqp.channel.publish(config.rabbit.exchange, 'test', new Buffer(JSON.stringify({
          tx:125
        })));
        await ctx.amqp.channel.publish(config.rabbit.exchange, routing, new Buffer(JSON.stringify({
          tx:124
        })));
      })(),
      new Promise(res => server.on(server.MESSAGE, msg => {
        expect(msg.routing).to.equal(routing);
        expect(msg.data).to.deep.equal({tx: 124});
        res();
      }))
    ]);
    await server.close();
  });

  it('delBind(routing) - connect to one, disconnect and connect to another - get only another', async () => {
    const routing = 'routing';

    const server = new AmqpServer(config.rabbit);
    await server.start();
    await server.addBind('test');
    await server.delBind('test');
    await server.addBind(routing);
    await Promise.delay(1000);
    await Promise.all([
      (async () =>{
        await ctx.amqp.channel.publish(config.rabbit.exchange, 'test', new Buffer(JSON.stringify({
          tx:123
        })));
        await ctx.amqp.channel.publish(config.rabbit.exchange, routing, new Buffer(JSON.stringify({
          tx:124
        })));
      })(),
      new Promise(res => server.on(server.MESSAGE, msg => {
        expect(msg.routing).to.equal(routing);
        expect(msg.data).to.deep.equal({tx: 124});
        res();
      }))
    ]);
    await server.close();
  });


};
