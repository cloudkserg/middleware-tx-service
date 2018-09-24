/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const bitcoinTests = require('./bitcoin'),
  ethTests = require('./eth'),
  nemTests = require('./nem'),
  wavesTests = require('./waves');

module.exports = (ctx) => {
  describe('bitcoin', () => bitcoinTests(ctx));
  describe('eth', () => ethTests(ctx));
  describe('nem', () => nemTests(ctx));
  describe('waves', () => wavesTests(ctx));
};
