/**
 * Copyright 2017–2018, LaborX PTY
 * Licensed under the AGPL Version 3 license.
 * @author Kirill Sergeev <cloudkserg11@gmail.com>
 * 
 * @service
 * @param URI - the endpoint URI
 * @description http provider for nem node
 */
const request = require('request-promise');

class Api {

  constructor (url) {
    this.url = url;
  }

  /**
   * @function
   * @description get blockchain current height
   * @return {Promise<*>}
   */
  async getHeight () {
    const response = await request({
      uri: `${this.url}/v1/chain/get_info`,
      method: 'POST',
      json: true
    });
    return response.head_block_num;
  }


  /**
   * @function
   * @description check node health
   * @return {Promise<*>}
   */
  async heartbeat () {
    const response = await request({
      uri: `${this.url}/v1/chain/get_info`,
      method: 'POST',
      json: true
    });
    return response;
  }



  async pushTransaction (transaction, signatures) {
    const response = await request({
      uri: `${this.url}/v1/chain/push_transaction`,
      method: 'POST',
      json: {
        signatures, 
        packed_trx: transaction,
        compression: false,
        packed_context_free_data: ''
      }
    });
    return response;
  }

}

module.exports = Api;
