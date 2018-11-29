const amqp = require('amqplib'),
  { Api, JsonRpc, JsSignatureProvider } = require('eosjs'),
  fetch = require('node-fetch'),                            // node only; not needed in browsers
  { TextDecoder, TextEncoder } = require('text-encoding'),  // node, IE11 and IE Edge Browsers
  _ = require('lodash'),
  Promise = require('bluebird'),
  request = require('request-promise'),
  config = require('../config');



const signTransaction = async (address) => {
  const defaultPrivateKey = "5KXQPYAncmiPpM6Zwugw3xsJ48bbt2qd4TthseRTpbMtZsfjWP1"; // useraaaaaaaa
  const signatureProvider = new JsSignatureProvider([defaultPrivateKey]);
  const rpc = new JsonRpc('http://jungle2.cryptolions.io:80', { fetch });
  const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });
  const tx = await api.transact({
    actions: [{
      account: 'eosio.token',
      name: 'transfer',
      authorization: [{
        actor: address,
        permission: 'active',
      }],
      data: {
        from: address,
        to: 'chronobank54',
        quantity: '0.0001 EOS',
        memo: '',
      },
    }]
  }, {
    blocksBehind: 3,
    expireSeconds: 30,
    broadcast: false
  });
  return {
    serializedTransaction: new Buffer(tx.serializedTransaction).toString('hex'),
    signatures: tx.signatures
  };
};


const getAddress = () => {
  return 'chronobank21';
};


const main = async () => {

  const amqpInstance = await amqp.connect(this.url);
  const channel = await amqpInstance.createChannel();

  const address = getAddress();
  const maxCount = 1;

  await Promise.all([
    (async () => {
      await Promise.map(_.range(0, maxCount), async (r) => {

        console.log('try ' + r);
        const txNext = await signTransaction(address);
        console.log('send ' + r);

        const response = await request('http://localhost:8082/eos', {
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
        channel.assertQueue('test_tx_service_eos_features');
        channel.bindQueue('test_tx_service_eos_features', config.rabbit.exchange, `${config.rabbit.serviceName}.eos.*.*`);
        channel.consume('test_tx_service_eos_features', async (data) => {
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
