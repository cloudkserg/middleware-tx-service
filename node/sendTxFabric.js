/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const constants = require('../config/constants');

const senders = {
  [`${constants.blockchains.bitcoin}`]: require('./sendBitcoinTx'),
  [`${constants.blockchains.eth}`]: require('./sendEthTx'),
  [`${constants.blockchains.nem}`]: require('./sendNemTx'),
  [`${constants.blockchains.waves}`]: require('./sendWavesTx'),
};
/**
 * 
 * @param {String} blockchain 
 * @returns {Function}
 */
module.exports = (blockchain) => {
  if (!senders[blockchain])
    throw new Error('Not found sender for blockchain ' + blockchain);
  const sender = senders[blockchain];
  return sender;
};
