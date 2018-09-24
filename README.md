# middleware-tx-service [![Build Status](https://travis-ci.org/ChronoBank/middleware-tx-service.svg?branch=master)](https://travis-ci.org/ChronoBank/middleware-tx-service)

Middleware service for sending transactions
 
### Installation

This module is a part of middleware services. You can install it in 2 ways:

1) through core middleware installer  [middleware installer](https://github.com/ChronoBank/middleware)
2) by hands: just clone the repo, do 'npm install', set your .env - and you are ready to go


#### About
This module is used for sending transactions. This happens through the layer, which on built on express.
This module get hex of tx (hex view of tx object) for selected blockchain and send in order, in which user sernding transactions.


#### How does it work?

Tx send service open endpoint http://localhost:{port}/:blockchain for post requests.

```
blockchain = bitcoin|eth|nem|waves
port = REST_PORT from config
```

Every POST request to this endpoint we need send a tx sign structure
and get response with data for assign order.

Response:
```
{ok: true, order: order}
where order = order in database for this transaction
```

Example for bitcoin request:
```
POST http://localhost:8081/bitcoin
body: {
    tx: 01000000030269fbc7957ff425c7d402e88f8625567de210493b133398c0d6009924f336dc000000006a47304402200f632e11638253a1917ae44cb5e344763fcfbf863490fad27448ff76da807cca02207a6fde726b2dae017e28ec99a6ce2972eb014c3f80060a7dfef49f8ec45013fb0121026a7b01d16b89980be3829f128899d5579f81bb6e62f360c68bad450200f2f541ffffffff0544535e5d37241c03aa7b24083b7400f1a884b3692cea41480ea96116b1b9fa000000006b483045022100f9e6ef2fb4b79d5e8ef54f530554fb5c57b865147f7988d3793a0c6aa85682cf0220396ac7661497c08c4a780fa6a7ad2e34dd5d49666f6097890ab312749a088e560121026a7b01d16b89980be3829f128899d5579f81bb6e62f360c68bad450200f2f541ffffffff0ca9574b470ce78cc1ec0a31b6e74a272d7e6f8b38117ce32d9ecd892b791416000000006a473044022050902ffcab4eca7e41a52853ae18f12c3af33faec6369eec0f6f4de5b958626f0220220939d27b65fb625d9c399119a7185af9886dd8e4f7209b72b4ba9360ef25c00121026a7b01d16b89980be3829f128899d5579f81bb6e62f360c68bad450200f2f541ffffffff0200f90295000000001976a914e50d9a3865faef5a9b7c60f0a64fb8b1f710794188acfe67814a000000001976a914f14e84f99bb70e9457edf57533c33127ed3ca56c88ac00000000,
    address: RXH6zNbLM6SG2qVPbvjyiH9N2ySEp1Ym6J
}

where 
tx - hex of signed bitcoin transaction (mtx.toTX().toRaw().toString('hex'))
address - from address  for bitcoin transaction (keyring.getAddress().toString())
```

Example for eth request:
```
POST http://localhost:8081/eth
body: {tx: 0x010000000199363a7e27973843aaae9ea7056417302ec3b9ecabed3ae3e90cdcd1a52326b5000000006a4730440220, address: 0x293433453435345}

where 
tx - hex of signed eth transaction (with 0x) from '0x' + tx.serialize().toString('hex')
address - from address  for eth transaction
```

Example for nem request:
```
POST http://localhost:8081/nem
body: {tx: {"data":"010100000100006037876e06200000008e997e65732dd0fe1c141fd86a83a41834e2f3971d20e08131469696e6a9fb23a086010000000000b7d86f0628000000544158374f55484d51535444584f4d594a494b4846494c524b4f4c565947454347343746504b47510a000000000000000d000000010000000500000048656c6c6f","signature":"8ee196c14b7f645b5f80c6189fd0d23a897ec7f8d2d8a3528ab06a251f107cbebe555fa3dbcbd67f5d5ee2b0f2ffff76faee8eab46f7f7ac96713bee608b8a0c"}, address: 0x293433453435345}

where 
tx - JSON.stringify of object {data, signature}
    where data - hex result from serialization transaction
    signature -signature of transaction
    see nem-sdk method announce[second argument] | nem-sdk method send
address - from address  for nem transaction
```

Example for waves request:
```
POST http://localhost:8081/waves
body: {tx: tx, address: 0x293433453435345}

where 
tx - JSON.stringify of waves transaction [for comments see waves documentation - transfer transaction]
{
    transactionType: null, //'transfer',
    senderPublicKey: tx.senderPublicKey,
    assetId: tx.assetId === 'WAVES' ? null : tx.assetId,
    feeAsset: tx.feeAssetId === 'WAVES' ? null : tx.feeAssetId,
    timestamp: tx.timestamp,
    amount: tx.amount,
    fee: tx.fee || MINIMUM_FEE,
    recipient: removeRecipientPrefix(tx.recipient),
    attachment: tx.attachment,
    signature: tx.signature
}
address - from address  for waves transaction
```

After get response, tx in background send to blockchain.
This may finished with two situations.

1 Success
We get rabbitmq message 
with routing = ```serviceName.blockchain.address.order```  
on exchange ```exchange```
message = ```{ok: true, hash: hash}```

```
    serviceName = from config
    blockchain = bitcoin,eth,nem,waves, as in endpoint variable
    address = address from for this transaction
    order = order as get from response

    exchange = from config, default=internal
    hash = hash transaction in blockchain
```

2 Failure
We get rabbitmq message 
with routing = ```serviceName.blockchain.address.order```  
on exchange ```exchange```
message = ```{ok: false, msg: msg}```

```
    serviceName = from config
    blockchain = bitcoin,eth,nem,waves, as in endpoint variable
    address = address from for this transaction
    order = order as get from response

    exchange = from config, default=internal
    msg = error message from blockchain
```

For every request on this endpoint? we create a delay request to node to sendTransaction.
All requests from user orderBy time sended OR nonce in eth blockchain and send in this sequence;

##### сonfigure your .env

To apply your configuration, create a .env file in root folder of repo (in case it's not present already).
Below is the expamle configuration:

```
RABBIT_URI=amqp://localhost:5672
ETH_PROVIDERS=http://localhost:8545
BITCOIN_PROVIDERS=/tmp/bitcoin
REST_PORT=8082
```

The options are presented below:

| name | description|
| ------ | ------ |
| REST_PORT   | http port for work this middleware
| MONGO_URI   | the URI string for mongo connection
| MONGO_COLLECTION_PREFIX   | the default prefix for all mongo collections. The default value is 'tx_service'
| RABBIT_EXCHANGE | rabbitmq exchange name - default = internal
| RABBIT_URI   | rabbitmq URI connection string
| RABBIT_SERVICE_NAME   | namespace for all rabbitmq queues, like 'tx_service'
| ETH_PROVIDERS   | the paths to http/ipc eth interface, written with comma sign
| BITCOIN_PROVIDERS   | the paths to http/ip bitcoin interface, written with comma sign
| NEM_PROVIDERS   | the paths to http/ipc nem interface, written with comma sign
| WAVES_PROVIDERS   | the paths to http waves interface, written with comma sign
| WAIT_ORDER_TIME | the time where we wait the skipped transaction in order


License
----
 [GNU AGPLv3](LICENSE)


Copyright
----
LaborX PTY
