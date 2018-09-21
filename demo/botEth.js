const ProviderService = require('./services/ProviderService'),
  constants = require('./config/constants').blockchains,
  amqp = require('amqplib'),

  _ = require('lodash'),
  Promise = require('bluebird'),

  request = require('request-promise'),
  ethers = require('ethers'),
  Tx = require('ethereumjs-tx'),
  config = require('./config');


const signTransaction = async (address, r) => {
  const providerService = new ProviderService(
    constants.eth, 
    config.node[`${constants.eth}`].providers
  );
  const connector = await providerService.get();
  const connection = connector.instance.getConnection();
  const accounts = await Promise.promisify(connection.eth.getAccounts)();

  const address1 = ethers.utils.getAddress(accounts[1]);
  const privateKey = '6b9027372deb53f4ae973a5614d8a57024adf33126ece6b587d9e08ba901c0d2';
  let nonce = await Promise.promisify(connection.eth.getTransactionCount)(address);

  const privateKeyHex = new Buffer(privateKey, 'hex');
  const rawTx = {
    nonce: nonce+r,
    from: address,
    gas:100000,
    to: address1,
    value: '1',
    data: ''
  };

  const tx = new Tx(rawTx);
  tx.sign(privateKeyHex);

  return '0x' + tx.serialize().toString('hex');
};

const getAddress = () => {
  return ethers.utils.getAddress('294f3c4670a56441f3133835a5cbb8baaf010f88');
};


const main = async () => {

  const amqpInstance = await amqp.connect(this.url);
  const channel = await amqpInstance.createChannel();

  const address = getAddress();
  const maxCount = 40;

  await Promise.all([
    (async () => {
      await Promise.map(_.range(0, maxCount), async (r) => {

        const txNext = await signTransaction(address, r);

        const response = await request('http://localhost:8082/eth', {
          method: 'POST',
          json: {tx: txNext, address: address}
        });
        //after generate address
        if (response.ok == true)
          console.log(`send tx ${response.order}`);
        else
          console.log('send with error', response);
      });
    })(),
    (async () => {
      await new Promise(res => {
        let r = 0;
        channel.assertQueue('test_tx_service_eth_features');
        channel.bindQueue('test_tx_service_eth_features', config.rabbit.exchange, `${config.rabbit.serviceName}.eth.*.*`);
        channel.consume('test_tx_service_eth_features', async (data) => {
          const message = JSON.parse(data.content.toString());
          r++;
          if (message.ok == true) 
            console.log(`get hash ${message.order}=${message.hash}`);

          else 
            console.log(` get error ${message.order}=${message.msg}`);
          
          if (r === maxCount)
            res();

        }, {noAck: true});
      });
    })()
  ]);
  console.log('finish');
  await amqpInstance.close();
};

main();
