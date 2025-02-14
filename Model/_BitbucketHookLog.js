/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const BitbucketHookLog = function() {}

BitbucketHookLog.STATUS_ING  = 'ing'
BitbucketHookLog.STATUS_DONE = 'done'
BitbucketHookLog.STATUS_FAIL = 'fail'

BitbucketHookLog.STATUS = {}
BitbucketHookLog.STATUS[BitbucketHookLog.STATUS_ING]  = '進行中'
BitbucketHookLog.STATUS[BitbucketHookLog.STATUS_DONE] = '完成'
BitbucketHookLog.STATUS[BitbucketHookLog.STATUS_FAIL] = '失敗'

Object.defineProperty(BitbucketHookLog.prototype, 'socketStruct', {
  get () {
    return {
      id: this.id,
      title: this.title,
      output: this.output,
      status: this.status,
      at: {
        update: this.updateAt.value,
        create: this.createAt.value,
      },
      time: {
        s: Number.parseFloat(this.sTime).toFixed(3) * 1,
        e: Number.parseFloat(this.eTime).toFixed(3) * 1,
        d: Number.parseFloat(this.dTime).toFixed(3) * 1,
      },
    }
  }
})

module.exports = BitbucketHookLog