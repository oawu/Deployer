/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const { log: sysLog, exec } = require('@oawu/_Helper') 
const { Type: T, tryIgnore } = require('@oawu/helper') 
const { Model } = require('@oawu/mysql-orm')
const uuid = require('uuid')

const Workflow = function() {}

Workflow.STATUS_PENDING  = 'pending'
Workflow.STATUS_RUNNING  = 'running'
Workflow.STATUS_FAILURE  = 'failure'
Workflow.STATUS_CANCEL   = 'cancel'
Workflow.STATUS_SUCCESS  = 'success'
Workflow.STATUS = {}
Workflow.STATUS[Workflow.STATUS_PENDING]  = '未開始'
Workflow.STATUS[Workflow.STATUS_RUNNING]  = '進行中'
Workflow.STATUS[Workflow.STATUS_FAILURE]  = '失敗'
Workflow.STATUS[Workflow.STATUS_CANCEL]   = '取消'
Workflow.STATUS[Workflow.STATUS_SUCCESS]  = '成功'

Workflow.prototype.saveWithTimeStatus = async function(status) {
  this.eTime = Date.now() / 1000
  this.dTime = Math.max(this.eTime - this.sTime, 0)
  this.status = status
  return await this.save()
}

const _Pass = function(message, data) {
  if (!(this instanceof _Pass)) {
    return new _Pass(message, data)
  }
  Error.call(this, message)
  this.message = message
  this.data = data
}
_Pass.prototype = Object.create(Error.prototype)

const _Error = function(message, data, workflowLog) {
  if (!(this instanceof _Error)) {
    return new _Error(message, data, workflowLog)
  }
  Error.call(this, message)
  this.message = message
  this.data = { ...data, workflowLog }
}
_Error.prototype = Object.create(Error.prototype)






const _Workflow = new Map()

const _reset = async (hook, deployment) => {
  deployment.bitbucketHookId = 0
  deployment.workflowId = 0

  hook.deploymentId = 0
  hook.workflowId = 0

  const _workflows = await Promise.all([
    tryIgnore(Model.Workflow.where('bitbucketHookId', hook.id).select('id', 'status').all(), null),
    tryIgnore(Model.Workflow.where('deploymentId', deployment.id).select('id', 'status').all(), null),
  ])

  const workflows = _workflows
    .reduce((a, b) => a.concat(b), [])
    .filter(workflow => workflow !== null && [Workflow.STATUS_PENDING, Workflow.STATUS_RUNNING].includes(workflow.status))
    .map(async workflow => {
      _Workflow.delete(workflow.id)

      return await Promise.all([
        Model.WorkflowLog.create({ workflowId: workflow.id, title: `取消`, output: '有新的部署請求，故取消。' }),
        workflow.saveWithTimeStatus(Workflow.STATUS_CANCEL),
      ])
    })

  const uid = uuid.v4()

  await Promise.all([
    ...workflows,
    deployment.save(),
    hook.save(),
  ])

  return true
}

const _checkPass = async (percent, data, name, title, cmd = null) => {
  if (!_Workflow.get(data.workflow.id)) {
    throw _Pass(title, data)
  }

  sysLog('Workflow', data.hook.id, title)
  
  return await Model.WorkflowLog.create({ workflowId: data.workflow.id, percent, output: '', funcName: T.str(name) ? name : '', title: T.str(title) ? title : '', cmd: T.str(cmd) ? cmd : '', sTime: Date.now() / 1000 })
}

const _dataBind = async (data, percent) => {
  const log = await _checkPass(percent, data, 'dataBind', `資料綁定`)
  
  const { hook, deployment, workflow } = data

  hook.deploymentId = deployment.id
  hook.workflowId = workflow.id

  deployment.bitbucketHookId = hook.id
  deployment.workflowId = workflow.id

  workflow.status = Workflow.STATUS_RUNNING
  workflow.sTime = Date.now() / 1000

  await Promise.all([
    hook.save(),
    deployment.save(),
    workflow.save(),
    log.saveWithTime(),
  ])
}
const _checkDir = async (data, percent) => {
  const cmd = `if test -d ${data.deployment.dir}; then echo "1"; else echo "2"; fi`
  const log = await _checkPass(percent, data, 'checkDir', `檢查專案目錄`, cmd)
  log.output = await exec(cmd)

  if (log.output.trim() !== '1') {
    throw _Error(`找不到專案目錄：${data.deployment.dir}`, data, log)
  }

  await log.saveWithTime()
}

const _isGitDir = async (data, percent) => {
  const cmd = `if test -d ${data.deployment.dir}/.git; then echo "1"; else echo "2"; fi`
  const log = await _checkPass(percent, data, 'isGitDir', `檢查專案是否採用 Git 管理`, cmd)
  log.output = await exec(cmd)

  if (log.output.trim() !== '1') {
    throw _Error(`專案內沒有 .git 目錄`, data, log)
  }
  await log.saveWithTime()
}
const _gitStatus = async (data, percent) => {
  const cmd = `cd ${data.deployment.dir} && git status --porcelain`
  const log = await _checkPass(percent, data, 'gitStatus', `檢查 Git 狀態`, cmd)
  log.output = await exec(cmd)
  
  if (log.output.trim() !== '') {
    throw _Error(`專案內有未 Commit 的異動`, data, log)
  }
  await log.saveWithTime()
}
const _gitBr1 = async (data, percent) => {
  const cmd = `cd ${data.deployment.dir} && git rev-parse --abbrev-ref HEAD`
  const log = await _checkPass(percent, data, 'gitBr1', `取得 Git 分支`, cmd)
  const result = await exec(cmd)
  log.output = result
  await log.saveWithTime()
  return result.trim()
}
const _gitBr2 = async (dirBr, data, percent) => {
  const log = await _checkPass(percent, data, 'gitBr2', `比對/檢查 Git 分支`)

  if (dirBr === '') {
    throw _Error(`目前專案分支為「空字串」`, data, log)
  }

  if (dirBr != data.deployment.branch) {
    throw _Error(`目前專案分支是「${dirBr}」，不是指定的分支「${data.deployment.branch}」`, data, log)
  }

  await log.saveWithTime()
}

const _gitFetch = async (data, percent) => {
  data.workflow.percent = percent

  const cmd = `cd ${data.deployment.dir} && git fetch --all`
  const log = await _checkPass(percent, data, 'gitFetch', `取得最新的變更`, cmd)
  log.output = await exec(cmd)
  await log.saveWithTime()
}
const _gitReset = async (data, percent) => {
  const cmd = `cd ${data.deployment.dir} && git reset --hard origin/${data.deployment.branch}`
  const log = await _checkPass(percent, data, 'gitReset', `重置`, cmd)
  log.output = await exec(cmd)
  await log.saveWithTime()
}
const _gitPull = async (data, percent) => {
  const cmd = `cd ${data.deployment.dir} && git pull origin ${data.deployment.branch}`
  const log = await _checkPass(percent, data, 'gitPull', `拉取並合併`, cmd)
  log.output = await exec(cmd)
  await log.saveWithTime()
}
const _runCmds = async (data, percent) => {
  const log = await _checkPass(percent, data, 'runCmds', `執行附加指令`)

  for (const i in data.commands) {
    const command = data.commands[i]
    const _log = await _checkPass(percent, data, `runCmds #${i}`, `執行附加指令：${command.title}`, command.cmd)
    _log.output = await exec(`cd ${data.deployment.dir} && ${command.cmd}`)
    _log.saveWithTime()
  }

  await log.saveWithTime()
}
const _finally = async (data, percent) => {
  sysLog('Workflow', data.hook.id, '完成')

  await tryIgnore(Promise.all([
    Model.WorkflowLog.create({ workflowId: data.workflow.id, title: `成功`, percent, output: '' }),
    data.workflow.saveWithTimeStatus(Workflow.STATUS_SUCCESS),
  ]))
}


Workflow.start = async (hook, header, payload, isIgnoreErrors = true) => {
  await new Promise(r => r())
  
  const deployment = await tryIgnore(Model.Deployment
      .where('enable', Model.Deployment.ENABLE_YES)
      .where('fullname', hook.fullname)
      .where('branch', hook.commitBranch)
      .one(), null)

  if (deployment === null) {
    return
  }

  if (await tryIgnore(_reset(hook, deployment), null) !== true) {
    return
  }

  try {
    const [commands, workflow] = await Promise.all([
      Model.DeploymentCommand.where('deploymentId', deployment.id).all(),
      Workflow.create({ deploymentId: deployment.id, bitbucketHookId: hook.id, uid: uuid.v4() }),
    ])
    _Workflow.set(workflow.id, true)

    await Model.WorkflowLog.create({ workflowId: workflow.id, title: `開始`, percent: 0.00, output: '' })
    const data = { hook, header, payload, deployment, workflow, commands }

    await _dataBind(data, 0.09)
    await _checkDir(data, 0.18)
    await _isGitDir(data, 0.27)
    
    if (deployment.force != Model.Deployment.FORCE_YES) {
      await _gitStatus(data, 0.36)
    }

    const dirBr = await _gitBr1(data, 0.45)
    await _gitBr2(dirBr, data, 0.54)

    await _gitFetch(data, 0.63)
    await _gitReset(data, 0.72)
    await _gitPull(data, 0.81)
    await _runCmds(data, 0.90)
    await _finally(data, 1.00)

  } catch (error) {
    if (error instanceof _Pass) {
      return sysLog('Workflow', hook.id, '取消')
    }

    if (error instanceof _Error) {
      await tryIgnore(Promise.all([
        Model.WorkflowLog.create({ workflowId: error.data.workflow.id, title: `失敗`, output: `錯誤訊息：${error.message}` }),
        error.data.workflowLog.saveWithTime(),
        error.data.workflow.saveWithTimeStatus(Workflow.STATUS_FAILURE),
      ]))

      return sysLog('Workflow', hook.id, '發生錯誤(1)', error)
    }

    if (!isIgnoreErrors) {
      throw error
    } else {
      sysLog('Workflow', hook.id, '發生錯誤(2)', error)
    }
  }
}

module.exports = Workflow