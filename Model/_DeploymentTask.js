/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const DeploymentTask = function() {}

DeploymentTask.STATUS_RUNNING = 'running'
DeploymentTask.STATUS_CANCEL  = 'cancel'
DeploymentTask.STATUS_FINISH  = 'finish'
DeploymentTask.STATUS = {}
DeploymentTask.STATUS[DeploymentTask.STATUS_RUNNING] = '進行中'
DeploymentTask.STATUS[DeploymentTask.STATUS_CANCEL]  = '取消'
DeploymentTask.STATUS[DeploymentTask.STATUS_FINISH]  = '完成'

module.exports = DeploymentTask