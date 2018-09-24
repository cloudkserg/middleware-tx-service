const ProviderService = require('./services/ProviderService'),
  constants = require('./config/constants').blockchains,
  amqp = require('amqplib'),

  _ = require('lodash'),
  Promise = require('bluebird'),
  WavesAPI = require('@waves/waves-api');
request = require('request-promise'),
Bytebuffer = require('bytebuffer'),
curve25519 = require('axlsign'),
Base58 = require('base58-native'),
config = require('./config');

const stringToByteArray = (str) => {
  str = unescape(encodeURIComponent(str));

  let bytes = new Array(str.length);
  for (let i = 0; i < str.length; ++i)
    bytes[i] = str.charCodeAt(i);

  return bytes;
};

const intToBytes = (x, numBytes, unsignedMax, opt_bigEndian) => {
  let signedMax = Math.floor(unsignedMax / 2);
  let negativeMax = (signedMax + 1) * -1;
  if (x != Math.floor(x) || x < negativeMax || x > unsignedMax) 
    throw new Error(
      x + ' is not a ' + (numBytes * 8) + ' bit integer');
  
  let bytes = [];
  let current;
  // Number type 0 is in the positive int range, 1 is larger than signed int,
  // and 2 is negative int.
  let numberType = x >= 0 && x <= signedMax ? 0 :
    x > signedMax && x <= unsignedMax ? 1 : 2;
  if (numberType == 2) 
    x = (x * -1) - 1;
  
  for (let i = 0; i < numBytes; i++) {
    if (numberType == 2) 
      current = 255 - (x % 256);
    else 
      current = x % 256;
      

    if (opt_bigEndian) 
      bytes.unshift(current);
    else 
      bytes.push(current);
      

    if (numberType == 1) 
      x = Math.floor(x / 256);
    else 
      x = x >> 8;
      
  }
  return bytes;
};

const int16ToBytes = (x, opt_bigEndian) => {
  return intToBytes(x, 2, 65535, opt_bigEndian);
};

const bytesToByteArrayWithSize = (input) => {
  if (!(input instanceof Array)) 
    input = Array.prototype.slice.call(input);

  const lengthBytes = int16ToBytes(input.length, true);
  return [...lengthBytes, ...input];
};


const process = (value) => {
  if (typeof value === 'string') 
    value = Uint8Array.from(stringToByteArray(value));

  const valueWithLength = bytesToByteArrayWithSize(value);
  return Uint8Array.from(valueWithLength);
};

const signatureData = (tx) => {
     
  let typeBytes = new Bytebuffer()
    .writeByte(tx.type)
    .flip()
    .toArrayBuffer();

  let timestampBytes = new Bytebuffer(tx.timestamp.toString().length)
    .writeLong(tx.timestamp)
    .flip()
    .toArrayBuffer();

  const amountAssetFlag = (tx.assetId) ? 1 : 0;
  let amountAssetFlagBytes = new Bytebuffer()
    .writeByte(amountAssetFlag) //waves
    .flip()
    .toArrayBuffer();
  let amountAssetIdBytes = amountAssetFlag ? Base58.decode(tx.assetId) : [];

  let amountBytes = new Bytebuffer()
    .writeLong(tx.amount)
    .flip()
    .toArrayBuffer();

  const feeAssetFlag = (tx.feeAsset) ? 1 : 0;
  let feeAssetFlagBytes = new Bytebuffer()
    .writeByte(feeAssetFlag) //waves
    .flip()
    .toArrayBuffer();
  let feeAssetIdBytes = feeAssetFlag ? Base58.decode(tx.feeAsset) : [];

  let feeBytes = new Bytebuffer()
    .writeLong(tx.fee)
    .flip();



  const attachment = process(tx.attachment) || [];
  let attachmentLength = new Bytebuffer()
    .writeShort(attachment.length)
    .flip()
    .toArrayBuffer();

  let decodePublicKey = Base58.decode(tx.senderPublicKey);
  let decodeRecipient = Base58.decode(tx.recipient);


  return Bytebuffer.concat([
    typeBytes, 
    decodePublicKey,
    amountAssetFlagBytes, amountAssetIdBytes,
    feeAssetFlagBytes, feeAssetIdBytes,
    timestampBytes,
    amountBytes,
    feeBytes,
    decodeRecipient, attachment]).buffer;
  // attachmentLength, attachment]).buffer;
};

const sign = (privateKey, dataToSign) => {
  let rawPrivateKey = Base58.decode(privateKey);
  let signatureArrayBuffer = curve25519.sign(rawPrivateKey, dataToSign);
  return Base58.encode(new Uint8Array(signatureArrayBuffer));
};

const signTransaction = async (address) => {

  const tx = {
    senderPublicKey: 'GbGEY3XVc2ohdv6hQBukVKSTQyqP8rjQ8Kigkj6bL57S',
    // An arbitrary address; mine, in this example
    recipient: '3Jk2fh8aMBmhCQCkBcUfKBSEEa3pDMkDjCr',
    // ID of a token, or WAVES
    assetId: 'WAVES',
    // The real amount is the given number divided by 10^(precision of the token)
    amount: 10000000,
    // The same rules for these two fields
    feeAssetId: 'WAVES',
    fee: 100000,
    // 140 bytes of data (it's allowed to use Uint8Array here)
    attachment: '',
    timestamp: Date.now()
  };
  const signature = sign('FYLXp1ecxQ6WCPD4axTotHU9RVfPCBLfSeKx1XSCyvdT', signatureData(tx));
  return JSON.stringify(_.merge(tx, {signature}));
};


const getAddress = () => {
  return '3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5';
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
        const txNext = await signTransaction(address);
        console.log('send ' + r);

        const response = await request('http://localhost:8082/waves', {
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
        channel.assertQueue('test_tx_service_waves_features');
        channel.bindQueue('test_tx_service_waves_features', config.rabbit.exchange, `${config.rabbit.serviceName}.waves.*.*`);
        channel.consume('test_tx_service_waves_features', async (data) => {
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
