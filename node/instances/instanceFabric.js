/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Egor Zuev <zyev.egor@gmail.com>
 */
const constants = require('../../config/constants');
const instances = {
  [`${constants.blockchains.bitcoin}`]: require('./BitcoinInstance'),
  [`${constants.blockchains.eth}`]: require('./EthInstance'),
  [`${constants.blockchains.nem}`]: require('./NemInstance'),
  [`${constants.blockchains.waves}`]: require('./WavesInstance'),
};
/**
 * 
 * @param {String} type 
 * @param {String} uri 
 * @returns {Object}
 */
module.exports = (type, uri) => {
  if (!type || !instances[type]) 
    throw new Error(`not found instance for type ${type}`);
  const instance = instances[type];
  return new instance(uri);
};
