/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const chains = require('../config/constants')['blockchains'],
  types = {
    [`${chains.bitcoin}`]: require('./createBitcoinTx'),
    [`${chains.eth}`]: require('./createEthTx'),
    [`${chains.nem}`]: require('./createNemTx'),
    [`${chains.waves}`]: require('./createWavesTx'),
  };

module.exports = (blockchainType) => {
  if (!types[blockchainType]) 
    throw new Error(`not found tx type ${blockchainType}`);
  
  return {
    createTx: types[blockchainType]
  };
};
