const ProviderService = require('./services/ProviderService'),
  constants = require('./config/constants').blockchains,
  amqp = require('amqplib'),

  _ = require('lodash'),
  Promise = require('bluebird'),
  nem = require('nem-sdk').default,
  request = require('request-promise'),
config = require('./config');


const signTransaction = async (address) => {
  const privateKey = 'b6e592516a531bae2cfc4854907a5051a0973f5e2739ae29bd8df0f2d911281b'
  const from = address;
  const to = 'TAX7OUHMQSTDXOMYJIKHFILRKOLVYGECG47FPKGQ';
  const sum = 0.00001;

  const common = nem.model.objects.create('common')('',  privateKey);
  const transferTransaction = nem.model.objects.create('transferTransaction')(to, sum, 'Hello');
  const transactionEntity = nem.model.transactions.prepare('transferTransaction')(
    common, 
    transferTransaction, 
    -104
  );
    let kp = nem.crypto.keyPair.create(nem.utils.helpers.fixPrivateKey(privateKey));
    let result = nem.utils.serialization.serializeTransaction(transactionEntity);
    let signature = kp.sign(result);
    let obj = {
        'data': nem.utils.convert.ua2hex(result),
        'signature': signature.toString()
    };
    return JSON.stringify(obj);
}


const getAddress = () => {
  return 'TAHZD4PLMR4OX3OLNMJCC726PNLXCJMCFWR2JI3D';
};


const main = async () => {

  const amqpInstance = await amqp.connect(this.url);
  const channel = await amqpInstance.createChannel();

  const address = getAddress();
  const maxCount = 10;

  await Promise.all([
    (async () => {
      await Promise.map(_.range(0, maxCount), async (r) => {

console.log('try ' + r);
        const txNext = await signTransaction(address)
console.log('send ' + r);

      const response = await request('http://localhost:8082/nem', {
        method: 'POST',
        json: {tx: txNext, address: address}
      });
        //after generate address
      if (response.ok == true)
        console.log(`send tx ${response.order}`)
      else
        console.log('send with error', response);
      });
    })(),
    (async () => {
      await new Promise(res => {
        let r = 0;
        channel.assertQueue('test_tx_service_nem_features');
        channel.bindQueue('test_tx_service_nem_features', config.rabbit.exchange, `${config.rabbit.serviceName}.nem.*.*`);
        channel.consume('test_tx_service_nem_features', async (data) => {
          const message = JSON.parse(data.content.toString());
          if (message.ok == true) {
            r++;
            console.log(`get hash ${message.order}=${message.hash}`);
            if (r === maxCount)
              res();
          }

        }, {noAck: true});
      });
    })()
  ]);
  console.log('finish');
  await amqpInstance.close();
};

main();
