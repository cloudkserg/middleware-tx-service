/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const Web3 = require('web3'),
  net = require('net'),
  Promise = require('bluebird');

class EthInstance {
  constructor (uri) {
    this.instance = this._getConnectorFromURI(uri);
  }

  _getConnectorFromURI (providerURI) {
    const provider = /^http/.test(providerURI) ?
      new Web3.providers.HttpProvider(providerURI) :
      new Web3.providers.IpcProvider(`${/^win/.test(process.platform) ? '\\\\.\\pipe\\' : ''}${providerURI}`, net);

    this.web3 = new Web3();
    this.web3.setProvider(provider);
  }

  async getBlockCount () {
    return await Promise.promisify(this.web3.eth.getBlockNumber)().timeout(5000);
  }

  getConnection () {
    return this.web3;
  }

  async isConnected () {
    return await new Promise((res, rej) => {
      this.web3.sendAsync({
        id: 9999999999,
        jsonrpc: '2.0',
        method: 'net_listening',
        params: []
      }, (err, result) => err ? rej(err) : res(result.result));
    });
  }

  disconnect () {
    if (this.web3.reset)
      this.web3.reset();
  }
}

module.exports = EthInstance;
