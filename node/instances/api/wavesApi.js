/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const EventEmitter = require('events'),
  Promise = require('bluebird'),
  bunyan = require('bunyan'),
  log = bunyan.createLogger({name: 'tx-service.wavesApi'}),
  request = require('request-promise'),
  URL = require('url').URL;

/**
 * @service
 * @param URI - the endpoint URI
 * @description http provider for nem node
 */

class Api {

  constructor (URI) {
    this.http = URI;
    this.events = new EventEmitter();
  }

  /**
   * @function
   * @description internal method for making requests
   * @param url - endpoint url
   * @param method - the HTTP method
   * @param body - the body of the request
   * @return {Promise<*>}
   * @private
   */
  async _makeRequest (url, method = 'GET', body) {
    const options = {
      method: method,
      body: body,
      uri: new URL(url, this.http),
      json: true
    };

    try {
      return await Promise.resolve(request(options)).timeout(10000);
    }catch (e) {
      log.error(e);
      await Promise.delay(1000);
      this.events.emit('disconnect');
      return null;
    }


  }



  /**
   * @function
   * @description get blockchain current height
   * @return {Promise<*>}
   */
  async getHeight () {
    const data = await this._makeRequest('blocks/height');
    return data.height;
  }


  /**
   * @function
   * @description check node health
   * @return {Promise<*>}
   */
  async heartbeat () {
    const data = await this._makeRequest('blocks/last');
    return data.version;
  }

  async broadcast (tx) {
    return await request({
      uri: new URL('transactions/broadcast', this.http),
      method: 'POST',
      json: tx
      
    });
  }
  async getTx (id) {
    return await this._makeRequest('transactions/info/' + id);
  }
  
  async getUnconfirmedTxs () {
    return await this._makeRequest('/transactions/unconfirmed');
  }

}

module.exports = Api;
