/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const EventEmitter = require('events'),
  amqp = require('amqplib');

const TX_SEND = 'txSend';
/**
 * Class for subscribe on amqp events
 * from other middlewares
 * listen only selected messages
 *
 * @class AmqpServer
 * @extends {EventEmitter}
 */
class AmqpService extends EventEmitter
{
  /**
   *
   * constructor
   * @param {Object} config
   * options are:
   * url - url for rabbit
   * exchange - name exchange in rabbit
   * serviceName - service name of  created queues for binding in rabbit
   *
   * @memberOf AmqpServer
   */
  constructor (config) {
    super();
    this.url  = config.url;
    this.exchange = config.exchange;
    this.serviceName = config.serviceName;
    this.TX_SEND = TX_SEND;
  }


  /**
   * function for start (connect to rabbit)
   *
   * @memberOf AmqpServer
   */
  async start () {
    this.amqpInstance = await amqp.connect(this.url);

    this.channel = await this.amqpInstance.createChannel();
    await this.channel.assertExchange(this.exchange, 'topic',  {durable: false});
    this._onClosed = () => {
      throw new Error('rabbitmq process has finished!');
    };
    this.channel.on('close', this._onClosed);

    await this._addBind(this.serviceName);
  }


  /**
   * function to subscribe to this channel
   *
   * @param {String} routing
   *
   * @memberOf AmqpServer
   */
  async _addBind (routing) {
    await this.channel.assertQueue(`${routing}`);
    await this.channel.bindQueue(`${routing}`, this.exchange, routing);
    this.channel.consume(`${routing}`, async (data) => {
      this.emit(this.TX_SEND, JSON.parse(data.content));
      this.channel.ack(data);
    });
  }


  async _publish (msg) {
    await this.channel.publish(this.exchange, this.serviceName, 
      new Buffer(JSON.stringify(msg)));
  }

  async publishTx (blockchain, order, address) {
    const msg = {blockchain, order, address};

    await this.channel.publish(this.exchange, this.serviceName, 
      new Buffer(JSON.stringify(msg)));
  }

  async publishTxError (data, msg) {
    console.log('ERRROR');
    const routing = `${this.serviceName}.${data.blockchain}.${data.address}.${data.order}`;
    await this.channel.publish(this.exchange, routing, 
      new Buffer(JSON.stringify({ok: false, order: data.order, msg})));
  }

  async publishTxOk (txModel) {
    console.log('SUCCESS');
    const routing = `${this.serviceName}.${txModel.blockchain}.${txModel.address}.${txModel.order}`;
    await this.channel.publish(this.exchange, routing, 
      new Buffer(JSON.stringify({ok: true, hash: txModel.hash, order: txModel.order})));
  }


  /**
   * Function for close connection to rabbitmq
   *
   *
   * @memberOf AmqpServer
   */
  async close () {
    if (this._onClosed && this.channel)
      this.channel.removeListener('close', this._onClosed);
    await this.amqpInstance.close();
  }

}

module.exports = AmqpService;
