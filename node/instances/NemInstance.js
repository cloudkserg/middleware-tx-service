/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const Api = require('./api/nemApi'),
  Promise = require('bluebird');

class NemInstance {
  constructor (uri) {
    this.instance = this._getConnectorFromURI(uri);
  }

  _getConnectorFromURI (providerURI) {
    return new Api(providerURI);
  }

  async getBlockCount () {
    return await this.instance.getHeight();
  }

  getConnection () {
    return this.instance;
  }

  async isConnected () {
    return await this.instance.heartbeat().catch(() => false);
  }

  disconnect () {
    return true;
  }
}

module.exports = NemInstance;
