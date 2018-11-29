/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 */
const config = require('../../config');
config.dev = {
  nem: {
    from: 'TAHZD4PLMR4OX3OLNMJCC726PNLXCJMCFWR2JI3D',
    to: 'TAX7OUHMQSTDXOMYJIKHFILRKOLVYGECG47FPKGQ',
    key: 'b6e592516a531bae2cfc4854907a5051a0973f5e2739ae29bd8df0f2d911281b'
  },
  eth: {
    address: '294f3c4670a56441f3133835a5cbb8baaf010f88',
    key: '6b9027372deb53f4ae973a5614d8a57024adf33126ece6b587d9e08ba901c0d2'
  },
  waves: {
    address: '3JfE6tjeT7PnpuDQKxiVNLn4TJUFhuMaaT5',
    key: 'FYLXp1ecxQ6WCPD4axTotHU9RVfPCBLfSeKx1XSCyvdT',
    publicKey: 'GbGEY3XVc2ohdv6hQBukVKSTQyqP8rjQ8Kigkj6bL57S',
    http: 'http://localhost:6869',
    apiKey: 'password',  
    to: '3Jk2fh8aMBmhCQCkBcUfKBSEEa3pDMkDjCr'
  },
  eos: {
    http: 'http://jungle2.cryptolions.io:80',
    httpForGetTransaction: 'https://junglehistory.cryptolions.io:4433/v1/history/get_transaction'
    address: 'chronobank21',
    key: '5KXQPYAncmiPpM6Zwugw3xsJ48bbt2qd4TthseRTpbMtZsfjWP1',
    to: 'chronobank54'
  }
};

module.exports = config;
