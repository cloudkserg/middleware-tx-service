/** 
* Copyright 2017–2018, LaborX PTY
* Licensed under the AGPL Version 3 license.
* @author Kirill Sergeev <cloudkserg11@gmail.com>
*/

const mongoose = require('mongoose'),
  config = require('./config'),
  models = require('./models'),
  express = require('express'),
  bunyan = require('bunyan'),
  handlers = require('./handlers'),
  AmqpService = require('./services/AmqpService'),
  sendTxListener = require('./listeners/sendTxListener'),
  log = bunyan.createLogger({name: 'tx-service'}),
  helmet = require('helmet');

mongoose.Promise = Promise;
mongoose.connect(config.mongo.data.uri, { useNewUrlParser: true});
mongoose.set('useCreateIndex', true);
  
const init = async () => {

  [mongoose.connection].forEach(connection =>
    connection.on('disconnected', () => {
      throw new Error('mongo disconnected!');
    })
  );

  models.init();

  const amqpService = new AmqpService(config.rabbit);
  amqpService.on(amqpService.TX_SEND, async (data) => {
    await sendTxListener(data, amqpService);
  });

  await amqpService.start();


  const app = express();
  app.use(helmet());
  app.use(express.json());

  app.post('/:blockchain', async (request, response) => {
    await handlers.sendTxHandler(
      request.params.blockchain, request.body, 
      response, amqpService
    );
  });

  app.listen(config.http.port);
  log.info(`Tx service started at port ${config.http.port}`);
};

module.exports = init();
