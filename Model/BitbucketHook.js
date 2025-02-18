/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Hashids = require('hashids/cjs')
const Config = require('@oawu/_Config')
const { Type: T } = require('@oawu/helper')
const hashids = new Hashids(T.str(Config.salt) ? Config.salt : '', 10, 'abcdefhijkmnprstuvwxyz2345678')

const BitbucketHook = function () { }

BitbucketHook.encodeId = id => hashids.encode(id)
BitbucketHook.decodeToken = token => {
  let id = null
  try {
    id = hashids.decode(token)[0]
  } catch (error) {
    id = error
  }

  return id
}

module.exports = BitbucketHook
