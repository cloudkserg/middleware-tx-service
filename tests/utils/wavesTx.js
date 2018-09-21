const ProviderService = require('../../services/ProviderService'),
  constants = require('../../config/constants').blockchains,
  amqp = require('amqplib'),

  _ = require('lodash'),
  Promise = require('bluebird'),
  WavesAPI = require('@waves/waves-api'),
  request = require('request-promise'),
  Bytebuffer = require('bytebuffer'),
  curve25519 = require('axlsign'),
  Base58 = require('base58-native'),
  config = require('../config');

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
  if (x !== Math.floor(x) || x < negativeMax || x > unsignedMax) 
    throw new Error(
      x + ' is not a ' + (numBytes * 8) + ' bit integer');
  let bytes = [];
  let current;
  // Number type 0 is in the positive int range, 1 is larger than signed int,
  // and 2 is negative int.
  let numberType = x >= 0 && x <= signedMax ? 0 :
    x > signedMax && x <= unsignedMax ? 1 : 2;
  if (numberType === 2) 
    x = (x * -1) - 1;
  for (let i = 0; i < numBytes; i++) {
    if (numberType === 2) 
      current = 255 - (x % 256);
    else 
      current = x % 256;

    if (opt_bigEndian) 
      bytes.unshift(current);
    else 
      bytes.push(current);
    

    if (numberType === 1) 
      x = Math.floor(x / 256);
    else 
      x = x >> 8;
      
  }
  return bytes;
};

const int16ToBytes = (x, opt_bigEndian) => {
  return intToBytes(x, 2, 65535, opt_bigEndian)
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
    decodeRecipient, attachmentLength, attachment]).buffer;
};

const sign = (privateKey, dataToSign) => {
  let rawPrivateKey = Base58.decode(privateKey);
  let signatureArrayBuffer = curve25519.sign(rawPrivateKey, dataToSign);
  return Base58.encode(new Uint8Array(signatureArrayBuffer));
};

const signTransaction = async (connection, address) => {

  const tx = {
    senderPublicKey: config.dev.waves.publicKey,
    // An arbitrary address; mine, in this example
    recipient: config.dev.waves.to,
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
  const signature = sign('', signatureData(tx));
  return JSON.stringify(_.merge(tx, {signature}));
};


const getAddress = () => {
  return config.dev.waves.address;
};


const getConnection = async () => {
  const providerService = new ProviderService(
    constants.waves,
    config.node[`${constants.waves}`].providers
  );
  const connector = await providerService.get();
  return connector.instance.getConnection();
};

module.exports = { getAddress, signTransaction, getConnection };
