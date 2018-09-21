const bcoin = require('bcoin'),
  ProviderService = require('./services/ProviderService'),
  Network = require('bcoin/lib/protocol/network'),
  constants = require('./config/constants').blockchains,
  amqp = require('amqplib'),
  request = require('request-promise'),

  _ = require('lodash'),
  Promise = require('bluebird'),
  config = require('./config');

const getConnection = async () => {
  const providerService = new ProviderService(
    constants.bitcoin,
    config.node[`${constants.bitcoin}`].providers
  );
  const connector = await providerService.get();
  return connector.instance.getConnection();
};

const generateKeyring = async () => {
  const network = Network.get('regtest');
  const keyPair = bcoin.hd.generate(network);
  return new bcoin.keyring(keyPair.privateKey, network);
};

const afterTransaction = async (connection, keyring) => {
  await connection.execute('generatetoaddress', [1, keyring.getAddress().toString()]).catch(console.error);
};

const signTransaction = async (connection, keyring) => {

  const network = Network.get('regtest');
  const keyPair2 = bcoin.hd.generate(network);

  let keyring2 = new bcoin.keyring(keyPair2.privateKey, network);
  await connection.execute('generatetoaddress', [60, keyring.getAddress().toString()]).catch(console.error);
  await connection.execute('generatetoaddress', [60, keyring2.getAddress().toString()]).catch(console.error);

  let coins = await connection.execute('getcoinsbyaddress', [keyring.getAddress().toString()]);
  let inputCoins = _.chain(coins)
    .transform((result, coin) => {
      result.coins.push(bcoin.coin.fromJSON(coin));
      result.amount += coin.value;
    }, {amount: 0, coins: []})
    .value();
  const mtx = new bcoin.mtx();
  mtx.addOutput({
    address: keyring2.getAddress(),
    value: Math.round(inputCoins.amount * 0.2)
  });
  await mtx.fund(inputCoins.coins, {
    rate: 10000,
    changeAddress: keyring.getAddress()
  });
  mtx.sign(keyring);
  const tx = mtx.toTX();
  return tx.toRaw().toString('hex');
};


const main = async () => {

  const amqpInstance = await amqp.connect(this.url);
  const channel = await amqpInstance.createChannel();

  const keyring = await generateKeyring();
  const connection = await getConnection();
  const maxCount = 10;

  await Promise.all([
    (async () => {
      await Promise.map(_.range(0, maxCount), async () => {
      const response = await request('http://localhost:8082/bitcoin', {
        method: 'POST',
        json: {tx: await signTransaction(connection, keyring), address: keyring.getAddress().toString()}
      });
        //after generate address
      await afterTransaction(connection, keyring);
      if (response.ok == true)
        console.log(`send tx ${response.order}`)
      else
        console.log('send with error', response);
      });
    })(),
    (async () => {
      await new Promise(res => {
        let r = 0;
        channel.assertQueue('test_tx_service_bitcoin_features');
        channel.bindQueue('test_tx_service_bitcoin_features', config.rabbit.exchange, `${config.rabbit.serviceName}.bitcoin.*.*`);
        channel.consume('test_tx_service_bitcoin_features', async (data) => {
          const message = JSON.parse(data.content.toString());
          if (message.ok == true) {
            r++;
            console.log(`get hash ${message.order}=${message.hash}`);

            //const tx = await connection.execute('getrawtransaction', [message.hash]);
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
