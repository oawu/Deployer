/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Workflow = function () { }

Workflow.STATUS_PENDING = 'pending'
Workflow.STATUS_RUNNING = 'running'
Workflow.STATUS_FAILURE = 'failure'
Workflow.STATUS_CANCEL = 'cancel'
Workflow.STATUS_SUCCESS = 'success'
Workflow.STATUS = {}
Workflow.STATUS[Workflow.STATUS_PENDING] = '未開始'
Workflow.STATUS[Workflow.STATUS_RUNNING] = '進行中'
Workflow.STATUS[Workflow.STATUS_FAILURE] = '失敗'
Workflow.STATUS[Workflow.STATUS_CANCEL] = '取消'
Workflow.STATUS[Workflow.STATUS_SUCCESS] = '成功'

Workflow.prototype.saveWithTimeStatus = async function (status) {
  this.eTime = Date.now() / 1000
  this.dTime = Math.max(this.eTime - this.sTime, 0)
  this.status = status
  return await this.save()
}

module.exports = Workflow