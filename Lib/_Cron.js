/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const { Model } = require('@oawu/mysql-orm')

const Cron = function(deployment, commands) {
  if (!(this instanceof Cron)) {
    return new Cron(deployment, commands)
  }

  this.deployment = deployment
  this.commands   = commands

  this.model = null
  this.error = null
}


Cron.prototype.dbCheck = async function() {
  // // 檢查資料庫格式

  const hook = await Model.BitbucketHook
    .where('fullname', this.deployment.fullname)
    .where('commitBranch', this.deployment.branch)
    .where('status', Model.BitbucketHook.STATUS_PENDING)
    .order('id DESC')
    .one()

  const [header, payload] = await Promise.all([
    Model.BitbucketHookHeader.where('id', hook.bitbucketHookHeaderId).one(),
    Model.BitbucketHookPayload.where('id', hook.bitbucketHookPayloadId).one(),
  ])

  
}

Cron.prototype.run = async function() {
  // this.queue
  //   .enqueue(this.dbCheck.bind(this))
  //   .enqueue(this.updateDeployment.bind(this))
  //   .enqueue(this.setProcessing.bind(this))
  //   .enqueue(this.isDir.bind(this))
  //   .enqueue(this.isGitDir.bind(this))
  //   .enqueue(this.gitStatus.bind(this))
  //   .enqueue(this.gitBr.bind(this))
  //   .enqueue(this.gitFetch.bind(this))
  //   .enqueue(this.gitReset.bind(this))
  //   .enqueue(this.gitPull.bind(this))
  //   .enqueue(this.runCmds.bind(this))
  //   .enqueue(this.finally.bind(this))
  //   .enqueue(this.timeout.bind(this))

  // await new Promise(resolve => setTimeout(resolve, this.deployment.timer))
  // this.error = null
  // this.model = null

  // await this.run()

  return this
}

module.exports = Cron(deployment, commands).run()
