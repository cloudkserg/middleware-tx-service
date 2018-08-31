/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const httpExec = require('./api/httpExec'),
  ipcExec = require('./api/ipcExec');
class BitcoinInstance {
  constructor (uri) {
    this.instance = this._getConnectorFromURI(uri);
  }

  _getConnectorFromURI (providerURI) {
    const isHttpProvider = new RegExp(/(http|https):\/\//).test(providerURI);
    return isHttpProvider ? new httpExec(providerURI) : new ipcExec(providerURI);
  }

  async getBlockCount () {
    await this.instance.execute('getblockcount', []);
  }

  async isConnected () {
    return this.instance.connected();
  }

  getConnection () {
    return this.instance;
  }

  disconnect () {
    if (this.instance.disconnect)
      this.instance.disconnect();
  }
}

module.exports = BitcoinInstance;
