/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */

const mongoose = require('mongoose'),
  config = require('../config');

mongoose.set('useCreateIndex', true);
const Tx = new mongoose.Schema({
  raw: {type: mongoose.Schema.Types.Mixed},
  created: {type: Date, required: true, default: Date.now},
  blockchain: {type: String, index: true, required: true},
  address: {type: String, index: true, required: true},
  hash: {type:String, index: true}, //hash or error
  order: {type: Number, index: true, required: true}
});

module.exports = ()=> mongoose.model(`${config.mongo.collectionPrefix}Tx`, Tx);
