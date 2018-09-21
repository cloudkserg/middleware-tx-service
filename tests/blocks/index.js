/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const amqpTests = require('./services/AmqpServer'),
  providerTests = require('./services/ProviderServer');

module.exports = (ctx) => {
  describe('services/AmqpServer', () => amqpTests(ctx));
  describe('services/ProviderServer', () => providerTests(ctx));
};
