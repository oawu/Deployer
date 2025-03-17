/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const _WORKFLOW_IS_RUNNING = new Map()
const _WORKFLOW_TELEGRAM = new Map()
const _WORKFLOW_SSH_CONNECT = new Map()

module.exports = {
  isRunning: _WORKFLOW_IS_RUNNING,
  telegram: _WORKFLOW_TELEGRAM,
  sshConnect: _WORKFLOW_SSH_CONNECT,
}
