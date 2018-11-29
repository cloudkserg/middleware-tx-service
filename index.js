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
  authLib = require('middleware_auth_lib'),
  AmqpService = require('middleware_common_infrastructure/AmqpService'),
  InfrastructureInfo = require('middleware_common_infrastructure/InfrastructureInfo'),
  InfrastructureService = require('middleware_common_infrastructure/InfrastructureService'),
  handlers = require('./handlers'),
  OwnAmqpService = require('./services/AmqpService'),
  sendTxListener = require('./listeners/sendTxListener'),
  log = bunyan.createLogger({name: 'tx-service'}),
  helmet = require('helmet');


const runSystem = async function () {
  const rabbit = new AmqpService(
    config.system.rabbit.url, 
    config.system.rabbit.exchange,
    config.system.rabbit.serviceName
  );
  const info = new InfrastructureInfo(require('./package.json'), config.system.waitTime);
  const system = new InfrastructureService(info, rabbit, {checkInterval: 10000});
  await system.start();
  system.on(system.REQUIREMENT_ERROR, (requirement, version) => {
    log.error(`Not found requirement with name ${requirement.name} version=${requirement.version}.` +
        ` Last version of this middleware=${version}`);
    process.exit(1);
  });
  await system.checkRequirements();
  system.periodicallyCheck();
};


mongoose.Promise = Promise;
mongoose.connect(config.mongo.data.uri, { useNewUrlParser: true});
mongoose.set('useCreateIndex', true);
  
const init = async () => {
  // if (config.system.checkSystem)
  //   await runSystem();

  [mongoose.connection].forEach(connection =>
    connection.on('disconnected', () => {
      throw new Error('mongo disconnected!');
    })
  );

  models.init();

  const amqpService = new OwnAmqpService(config.rabbit);
  amqpService.on(amqpService.TX_SEND, async (data) => {
    await sendTxListener(data, amqpService);
  });

  await amqpService.start();


  const app = express();
  app.use(helmet());
  app.use(express.json());
  // const auth = authLib.authMiddleware({
  //   serviceId: config.id,
  //   provider: config.oauthService.url
  // });
  // app.use(auth);

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
