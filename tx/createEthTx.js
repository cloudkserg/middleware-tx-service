/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const models = require('../models'),
  ethers = require('ethers'),
  constants = require('../config/constants')['blockchains'];
  /**
 * 
 * @param {Object} txRaw 
 * @param {String} address 
 * @returns {txModel}
 */
module.exports = async (txRaw, address) => {

  const tx = ethers.Wallet.parseTransaction(txRaw);
  const item = new models.txModel();
  item.blockchain = constants.eth;
  item.order = tx.nonce;
  item.address = address;
  item.raw = txRaw;
  await item.save();
  return item;
};
