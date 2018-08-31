/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const models = require('../models'),
  constants = require('../config/constants')['blockchains'];
module.exports = async (txRaw, address) => {
  const item = new models.txModel();
  item.blockchain = constants.bitcoin;
  item.order = Date.now();
  item.address = address;
  item.raw = txRaw;
  await item.save();

  return item;
};
