/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */

const bunyan = require('bunyan'),
  sem = require('semaphore')(1),
  Promise = require('bluebird'),
  EventEmitter = require('events'),
  log = bunyan.createLogger({name: 'app.services.providerService'}),
  createInstance = require('../node/instances/instanceFabric');


/**
 * @service
 * @description the service for handling connection to node
 * @returns Object<ProviderService>
 */

class ProviderService extends EventEmitter {

  constructor (type, providers) {
    super();
    this.connector = null;
    this.type = type;
    this.providers = providers;

    if (this.providers.length > 1)
      this.findBestNodeInterval = setInterval(() => {
        this.switchConnectorSafe();
      }, 60000 * 5);
  }


  /** @function
   * @description reset the current connection
   * @return {Promise<void>}
   */
  async resetConnector () {
    this.connector.instance.disconnect();
    this.switchConnectorSafe();
    this.emit('disconnected');
  }


  /**
   * @function
   * @description choose the connector
   * @return {Promise<null|*>}
   */
  async switchConnector () {

    const provider = await Promise.any(this.providers.map(async provider => {
      const instance = createInstance(this.type, provider);
      await instance.getBlockCount();
      instance.disconnect();
      return provider;
    })).catch((e) => {
      console.log(e);
      log.error(`no available connection for ${this.type}!`);
      process.exit(0);
    });

    const currentProvider = this.connector ? this.connector.currentProvider : '';
    if (currentProvider === provider && this.connector.instance.isConnected()) 
      return this.connector;
    
    this.connector = {
      instance: createInstance(this.type, provider),
      currentProvider: provider
    };

    return this.connector;
  }

  /**
   * @function
   * @description safe connector switching, by moving requests to
   * @return {Promise<bluebird>}
   */
  async switchConnectorSafe () {

    return new Promise(res => {
      sem.take(async () => {
        await this.switchConnector();
        res(this.connector);
        sem.leave();
      });
    });
  }

  /**
   * @function
   * @description
   * @return {Promise<*|bluebird>}
   */
  async get () {
    return this.connector || await this.switchConnectorSafe();
  }

}

module.exports = ProviderService;
