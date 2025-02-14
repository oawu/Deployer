/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const { Model } = require('@oawu/mysql-orm')

const WorkflowLog = function() {}

WorkflowLog.prototype.saveWithTime = async function() {
  this.eTime = Date.now() / 1000
  this.dTime = Math.max(this.eTime - this.sTime, 0)
  return await this.save()
}

module.exports = WorkflowLog