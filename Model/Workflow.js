/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const fs = require('fs/promises')
const uuid = require('uuid')
const { Client } = require('ssh2')

const { Model } = require('@oawu/mysql-orm')
const { Sigint, Type: T, tryIgnore, date } = require('@oawu/helper')

const Path = require('@oawu/_Path')
const { syslog, exec, during } = require('@oawu/_Helper')

const Telegram = require(`${Path.lib}Telegram.js`)

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

const _WORKFLOW_IS_RUNNING = new Map()
const _WORKFLOW_TELEGRAM = new Map()
const _WORKFLOW_SSH_CONNECT = new Map()

Telegram.Message.Status.prototype.data = function (tel = false) {
  if (!((T.obj(this._data) && T.str(this._data.title)) || T.str(this._data))) {
    return null
  }

  const text = tel
    ? `${this._data.title}`
    : `#${this._data.hook.id} ${this._data.title.replace(/<\/?[^>]+(>|$)/ig, '')}`

  if (!T.bool(this._status)) {
    return `${this.prefix()}${tel ? '⏳' : '[-]'} ${text}…`
  }

  if (this._status) {
    return `${this.prefix()}${tel ? '✅' : '[v]'} ${text}`
  }

  return `${this.prefix()}${tel ? '❌' : '[x]'} ${text}`
}





const _Pass = function (message, data) {
  if (!(this instanceof _Pass)) {
    return new _Pass(message, data)
  }
  Error.call(this, message)
  this.name = '_Pass'
  this.data = data
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, _Pass)
  }
}
_Pass.prototype = Object.create(Error.prototype)
_Pass.prototype.constructor = _Pass

const _Error = function (message, data) {
  if (!(this instanceof _Error)) {
    return new _Error(message, data)
  }
  Error.call(this, message)
  this.name = '_Error'
  this.data = data
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, _Error)
  }
}
_Error.prototype = Object.create(Error.prototype)
_Error.prototype.constructor = _Error








const _CheckPass = function (data, title, funcName = '', cmd = '') {
  if (!(this instanceof _CheckPass)) {
    return new _CheckPass(data, title, funcName, cmd)
  }
  this._data = null
  this._title = ''
  this._funcName = ''
  this._cmd = ''
  this._checkEnable = true
  this.data(data).title(title).funcName(funcName).cmd(cmd)
}
_CheckPass.prototype.data = function (data) {
  if (T.obj(data)) {
    this._data = data
  }
  return this
}
_CheckPass.prototype.title = function (title) {
  if (T.str(title)) {
    this._title = title
  }
  return this
}
_CheckPass.prototype.funcName = function (funcName) {
  if (T.str(funcName)) {
    this._funcName = funcName
  }
  return this
}
_CheckPass.prototype.cmd = function (cmd) {
  if (T.str(cmd)) {
    this._cmd = cmd
  }
  return this
}
_CheckPass.prototype.checkEnable = function (checkEnable) {
  if (T.bool(checkEnable)) {
    this._checkEnable = checkEnable
  }
  return this
}
_CheckPass.prototype.execute = async function (func = null) {
  if (this._checkEnable && !_WORKFLOW_IS_RUNNING.get(this._data.workflow.id)) {
    throw _Pass(this._title, this._data)
  }

  if (!T.obj(this._data)) {
    return
  }


  const telegram = _WORKFLOW_TELEGRAM.get(this._data.workflow.id)
  if (!telegram) {
    return
  }

  return await telegram.task(this._data.logs.length, { title: this._title, ...this._data }, async _ => {

    const log = await Model.WorkflowLog.create({
      workflowId: this._data.workflow.id,
      workflowLogId: this._data.logs.length ? this._data.logs[this._data.logs.length - 1].id : 0,
      title: this._title,
      funcName: this._funcName,
      cmd: this._cmd,
      output: '',
      sTime: Date.now() / 1000
    })
    this._data.logs.push(log)

    let result = null
    if (T.func(func)) {
      result = func(log, telegram)
    }
    if (T.asyncFunc(func)) {
      result = await func(log, telegram)
    }
    if (T.promise(func)) {
      result = await func
    }
    if (func === null) {
      await log.saveWithTime()
    }

    this._data.logs.pop(log)
    return result
  })
}








const _exec = async (data, cmd) => {
  const sshConnect = _WORKFLOW_SSH_CONNECT.get(data.workflow.id)

  if (sshConnect === false) {
    return await exec(cmd)
  }

  if (!T.obj(sshConnect)) {
    throw new Error(`連線失效`)
  }

  return await new Promise((resolve, reject) => {
    sshConnect.exec(cmd, (error, stream) => {
      if (error) {
        reject(error)
      }

      let stdout = ''
      let stderr = ''
      stream.on('close', _ => resolve({ stdout, stderr }))
      stream.on('data', data => stdout = data.toString())
      stream.stderr.on('data', data => stderr = data.toString())
    })
  })
}








const _telegram = async data => {
  const telegram = Telegram()

  _WORKFLOW_TELEGRAM.set(data.workflow.id, telegram)

  process.stdout.write(`${await telegram.push(Telegram.Message([
    `【部署開始】#${data.hook.id}`,
    [
      `<blockquote>`,
      [
        `📂 專案：<code>${data.deployment.title}</code> | 🌲 分支：<code>${data.deployment.branch}</code>`,
        `🧑🏽‍💻 提交者：<a href="${data.payload.actorLink}">${data.payload.actorName}（${data.payload.actorNickname}）</a>`,
        `⏰ 時間：<code>${data.hook.createAt}</code>`,
        `📝 紀錄：<a href="${data.payload.chgNewLink}">${data.payload.chgNewHash}</a>`,
      ].join('\n'),
      `</blockquote>`,
    ].join(''),
  ].join('\n')))}\n`)

  return telegram
}








const _Start = function (data) {
  if (!(this instanceof _Start)) {
    return new _Start(data)
  }
  this._data = data
}
_Start.prototype._telegram = async function () {
  await _CheckPass(this._data, `Telegram 連線`, 'telegram').execute()
}
_Start.prototype._dataBind = async function () {
  await _CheckPass(this._data, `資料綁定`, `dataBind`).execute(async log => {
    // this._data.hook.deploymentId = this._data.deployment.id
    // this._data.hook.workflowId = this._data.workflow.id

    this._data.deployment.bitbucketHookId = this._data.hook.id
    this._data.deployment.workflowId = this._data.workflow.id

    this._data.workflow.status = Workflow.STATUS_RUNNING
    this._data.workflow.sTime = Date.now() / 1000

    await Promise.all([
      // this._data.hook.save(),
      this._data.deployment.save(),
      this._data.workflow.save(),
      log.saveWithTime(),
    ])
  })
}
_Start.prototype._sshConnect = async function () {
  if (this._data.deployment.type == Model.Deployment.TYPE_LOCAL) {
    _WORKFLOW_SSH_CONNECT.set(this._data.workflow.id, false)
    return
  }

  const host = this._data.deployment.sshHost
  const port = this._data.deployment.sshPort
  const username = this._data.deployment.sshUser
  const path = this._data.deployment.sshKeyPath

  const sshConnect = await _CheckPass(this._data, `SSH 連線`, `sshConnect`, `ssh ${username}@${host}:${port}`).execute(async log => {

    try {
      await fs.access(path, fs.constants.R_OK)
    } catch (error) {
      throw _Error(`SSH 私鑰路徑無法讀取，路徑：${path}`, this._data)
    }

    const stat = await fs.stat(path)
    if (stat.isDirectory()) {
      throw _Error(`SSH 私鑰路徑不存在，路徑：${path}`, this._data)
    }

    const privateKey = await fs.readFile(path, { encoding: `utf8` })

    const [sshConnect] = await Promise.all([
      new Promise((resolve, reject) => {
        const _connect = new Client()
        _connect.on('ready', _ => resolve(_connect))
        _connect.on('error', _ => reject(new _Error(`SSH 連線失敗`, this._data)))
        _connect.connect({ host, port, username, privateKey })
      }),
      log.saveWithTime()
    ])

    return sshConnect
  })

  if (!T.obj(sshConnect)) {
    throw _Error(`無法建立 SSH 連線`, this._data)
  }

  _WORKFLOW_SSH_CONNECT.set(this._data.workflow.id, sshConnect)
  Sigint.push(async _ => await sshConnect.end())
}
_Start.prototype.execute = async function () {
  await _CheckPass(this._data, `開始`, `start`).execute(async log => {
    await this._dataBind()
    await this._telegram()
    await this._sshConnect()
    await log.saveWithTime()
  })
}








const _Check = function (data) {
  if (!(this instanceof _Check)) {
    return new _Check(data)
  }
  this._data = data
}
_Check.prototype._checkDir = async function () {
  const cmd = `if test -d ${this._data.deployment.dir}; then echo "1"; else echo "2"; fi`

  await _CheckPass(this._data, `專案目錄`, `checkDir`, cmd).execute(async log => {
    const { stdout } = await _exec(this._data, cmd)
    log.output = stdout

    if (log.output.trim() !== '1') {
      throw _Error(`找不到專案目錄：${this._data.deployment.dir}`, this._data)
    }
    await log.saveWithTime()
  })
}
_Check.prototype._isGitDir = async function () {
  const cmd = `if test -d ${this._data.deployment.dir}/.git; then echo "1"; else echo "2"; fi`

  await _CheckPass(this._data, `專案是否採用 Git 管理`, `isGitDir`, cmd).execute(async log => {
    const { stdout } = await _exec(this._data, cmd)
    log.output = stdout

    if (log.output.trim() !== '1') {
      throw _Error(`專案內沒有 .git 目錄`, this._data)
    }
    await log.saveWithTime()
  })
}
_Check.prototype.execute = async function () {
  await _CheckPass(this._data, `檢查專案`, `check`).execute(async log => {
    await this._checkDir()
    await this._isGitDir()
    await log.saveWithTime()
  })
}








const _Git = function (data) {
  if (!(this instanceof _Git)) {
    return new _Git(data)
  }
  this._dirBr = null
  this._data = data
}
_Git.prototype._gitStatus = async function () {
  if (this._data.deployment.force == Model.Deployment.FORCE_YES) {
    return
  }

  const cmd = `cd ${this._data.deployment.dir} && git status --porcelain`

  await _CheckPass(this._data, `檢查狀態`, `gitStatus`, cmd).execute(async log => {
    const { stdout } = await _exec(this._data, cmd)
    log.output = stdout

    if (log.output.trim() !== '') {
      throw _Error(`專案內有未 Commit 的異動`, this._data)
    }
    await log.saveWithTime()
  })
}
_Git.prototype._gitBr1 = async function () {
  const cmd = `cd ${this._data.deployment.dir} && git rev-parse --abbrev-ref HEAD`

  return await _CheckPass(this._data, `取得分支`, `gitBr1`, cmd).execute(async log => {
    const { stdout } = await _exec(this._data, cmd)
    log.output = stdout
    this._dirBr = stdout.trim()
    await log.saveWithTime()
  })
}
_Git.prototype._gitBr2 = async function () {
  await _CheckPass(this._data, `比對/檢查分支`, `gitBr2`).execute(async log => {
    if (this._dirBr === '') {
      throw _Error(`目前專案分支為「空字串」`, this._data)
    }

    if (this._dirBr != this._data.deployment.branch) {
      throw _Error(`目前專案分支是「${this._dirBr}」，不是指定的分支「${this._data.deployment.branch}」`, this._data)
    }

    await log.saveWithTime()
  })
}
_Git.prototype.execute = async function () {
  await _CheckPass(this._data, `Git 指令`, `git`).execute(async log => {
    await this._gitStatus()
    await this._gitBr1()
    await this._gitBr2()
    await log.saveWithTime()
  })
}








const _Update = function (data) {
  if (!(this instanceof _Update)) {
    return new _Update(data)
  }
  this._data = data
}
_Update.prototype._gitFetch = async function () {
  const cmd = `cd ${this._data.deployment.dir} && git fetch --all`

  await _CheckPass(this._data, `取得最新的變更`, `gitFetch`, cmd).execute(async log => {
    const { stdout } = await _exec(this._data, cmd)
    log.output = stdout
    await log.saveWithTime()
  })
}
_Update.prototype._gitReset = async function () {
  const cmd = `cd ${this._data.deployment.dir} && git reset --hard origin/${this._data.deployment.branch}`

  await _CheckPass(this._data, `重置為最新`, `gitReset`, cmd).execute(async log => {
    const { stdout } = await _exec(this._data, cmd)
    log.output = stdout
    await log.saveWithTime()
  })
}
_Update.prototype._gitPull = async function () {
  const cmd = `cd ${this._data.deployment.dir} && git pull origin ${this._data.deployment.branch}`

  await _CheckPass(this._data, `拉取並合併`, `gitPull`, cmd).execute(async log => {
    const { stdout } = await _exec(this._data, cmd)
    log.output = stdout
    await log.saveWithTime()
  })
}
_Update.prototype.execute = async function () {
  await _CheckPass(this._data, `更新專案`, `update`).execute(async log => {
    await this._gitFetch()
    await this._gitReset()
    await this._gitPull()
    await log.saveWithTime()
  })
}








const _RunCmds = function (data) {
  if (!(this instanceof _RunCmds)) {
    return new _RunCmds(data)
  }
  this._data = data
}
_RunCmds.prototype._execute = async function (i, title, dir, cmd) {
  await _CheckPass(this._data, `執行附加指令：${title}`, `runCmds #${i}`, `cd ${dir} && ${cmd}`).execute(async log => {
    const { stdout } = await _exec(this._data, `cd ${dir} && ${cmd}`)
    log.output = stdout
    await log.saveWithTime()
  })
}
_RunCmds.prototype.execute = async function () {
  await _CheckPass(this._data, `附加指令`, `runCmds`).execute(async log => {

    for (const i in this._data.commands) {
      const { title, cmd } = this._data.commands[i]
      await this._execute(i, title, this._data.deployment.dir, cmd)
    }

    await log.saveWithTime()
  })
}








const _Success = function (data) {
  if (!(this instanceof _Success)) {
    return new _Success(data)
  }
  this._data = data
}
_Success.prototype._updateStatus = async function () {
  await _CheckPass(this._data, `更新資料`, `updateSuccessStatus`).execute(async log => {
    await Promise.all([
      this._data.workflow.saveWithTimeStatus(Workflow.STATUS_SUCCESS),
      log.saveWithTime(),
    ])
  })
}
_Success.prototype._closeSSHConnect = async function () {
  await _CheckPass(this._data, `關閉 SSH 連線`, `closeSSHConn`).execute(async log => {
    const sshConnect = _WORKFLOW_SSH_CONNECT.get(this._data.workflow.id)
    _WORKFLOW_SSH_CONNECT.delete(this._data.workflow.id)

    if (sshConnect) {
      await sshConnect.end()
    }

    await log.saveWithTime()
  })
}
_Success.prototype._closeTelegram = async function () {
  await _CheckPass(this._data, `關閉 Telegram`, `closeSuccessTelegram`).execute(async (log, telegram) => {
    _WORKFLOW_TELEGRAM.delete(this._data.workflow.id)

    process.stdout.write(`${await telegram.push(Telegram.Message([
      '-'.repeat(32),
      `🚀 狀態：部署成功 #${this._data.hook.id}`,
      `⏰ 時間：${date()}`,
      `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
    ].join('\n')))}\n`)

    await log.saveWithTime()
  })
}
_Success.prototype.execute = async function () {
  await tryIgnore(_CheckPass(this._data, `完成`, 'success').execute(async log => {
    await this._updateStatus()
    await this._closeSSHConnect()
    await this._closeTelegram()
    await log.saveWithTime()
  }))
  _WORKFLOW_IS_RUNNING.delete(this._data.workflow.id)
}








const _Cancel = function (data) {
  if (!(this instanceof _Cancel)) {
    return new _Cancel(data)
  }
  this._checkEnable = false
  this._data = data
}
_Cancel.prototype._updateStatus = async function () {
  await _CheckPass(this._data, `更新資料`, `updateCancelStatus`).checkEnable(this._checkEnable).execute(async log => {
    await Promise.all([
      this._data.workflow.saveWithTimeStatus(Workflow.STATUS_CANCEL),
      log.saveWithTime(),
    ])
  })
}
_Cancel.prototype._closeSSHConnect = async function () {
  await _CheckPass(this._data, `關閉 SSH 連線`, `closeSSHConn`).checkEnable(this._checkEnable).execute(async log => {
    const sshConnect = _WORKFLOW_SSH_CONNECT.get(this._data.workflow.id)
    _WORKFLOW_SSH_CONNECT.delete(this._data.workflow.id)

    if (sshConnect) {
      await sshConnect.end()
    }
    await log.saveWithTime()
  })
}
_Cancel.prototype._closeTelegram = async function () {
  await _CheckPass(this._data, `關閉 Telegram`, `closeCancelTelegram`).checkEnable(this._checkEnable).execute(async (log, telegram) => {
    _WORKFLOW_TELEGRAM.delete(this._data.workflow.id)

    process.stdout.write(`${await telegram.push(Telegram.Message([
      '-'.repeat(32),
      `🚀 狀態：部署取消 #${this._data.hook.id}`,
      `⏰ 時間：${date()}`,
      `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
    ].join('\n')))}\n`)

    await log.saveWithTime()
  })
}
_Cancel.prototype.execute = async function () {
  await tryIgnore(_CheckPass(this._data, `取消`, 'cancel').checkEnable(this._checkEnable).execute(async log => {
    await this._updateStatus()
    await this._closeSSHConnect()
    await this._closeTelegram()
    await log.saveWithTime()
  }))
}








const _Failure = function (data, error) {
  if (!(this instanceof _Failure)) {
    return new _Failure(data, error)
  }
  this._error = error
  this._data = data
  this._logs = this._data.logs
  this._data.logs = []
}
_Failure.prototype._updateStatus = async function () {
  await _CheckPass(this._data, `更新資料`, `updateFailureStatus`).execute(async log => {
    await Promise.all([
      ...this._logs.map(log => log.saveWithTime()),
      this._data.workflow.saveWithTimeStatus(Workflow.STATUS_FAILURE),
      log.saveWithTime(),
    ])
  })
}
_Failure.prototype._closeSSHConnect = async function () {
  await _CheckPass(this._data, `關閉 SSH 連線`, `closeSSHConn`).execute(async log => {
    const sshConnect = _WORKFLOW_SSH_CONNECT.get(this._data.workflow.id)
    _WORKFLOW_SSH_CONNECT.delete(this._data.workflow.id)

    if (sshConnect) {
      await sshConnect.end()
    }
    await log.saveWithTime()
  })
}
_Failure.prototype._closeTelegram = async function () {
  await _CheckPass(this._data, `關閉 Telegram`, `closeFailureTelegram`).execute(async (log, telegram) => {
    _WORKFLOW_TELEGRAM.delete(this._data.workflow.id)

    process.stdout.write(`${await telegram.push(Telegram.Message([
      '-'.repeat(32),
      `🚀 狀態：部署失敗#${this._data.hook.id}`,
      `⏰ 時間：${date()}`,
      `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
      `🗒️ 原因：${this._error.message}`,
    ].join('\n')))}\n`)

    await log.saveWithTime()
  })
}
_Failure.prototype.execute = async function () {
  await tryIgnore(_CheckPass(this._data, `失敗`, 'failure').execute(async log => {
    await this._updateStatus()
    await this._closeSSHConnect()
    await this._closeTelegram()
    await log.saveWithTime()
  }))

  _WORKFLOW_IS_RUNNING.delete(this._data.workflow.id)
}








const _reset = async (hook, deployment) => {
  deployment.bitbucketHookId = 0
  deployment.workflowId = 0

  const _workflows = await Promise.all([
    tryIgnore(Model.Workflow.where('bitbucketHookId', hook.id).select('id', 'status', 'sTime', 'eTime', 'dTime').all(), null),
    tryIgnore(Model.Workflow.where('deploymentId', deployment.id).select('id', 'status', 'sTime', 'eTime', 'dTime').all(), null),
  ])

  const workflows = _workflows
    .reduce((a, b) => a.concat(b), [])
    .filter(workflow => workflow !== null && [Workflow.STATUS_PENDING, Workflow.STATUS_RUNNING].includes(workflow.status))

  const _tmp = {}

  for (const workflow of workflows) {
    if (_tmp[workflow.id] === true) {
      continue
    } else {
      _tmp[workflow.id] = true
    }

    _WORKFLOW_IS_RUNNING.delete(workflow.id)
    _Cancel({ hook, deployment, workflow, logs: [] }).execute()
  }

  await deployment.save()
}

const _start = async (hook, header, payload, deployment, isIgnoreErrors = true) => {
  await _reset(hook, deployment)

  try {
    const [commands, workflow] = await Promise.all([
      Model.DeploymentCommand.where('deploymentId', deployment.id).all(),
      Workflow.create({ deploymentId: deployment.id, bitbucketHookId: hook.id, uid: uuid.v4() }),
    ])

    _WORKFLOW_IS_RUNNING.set(workflow.id, true)

    const data = { hook, header, payload, deployment, workflow, commands, logs: [] }
    const telegram = await _telegram(data)

    await _Start(data).execute()
    await _Check(data).execute()
    await _Git(data).execute()
    await _Update(data).execute()
    await _RunCmds(data).execute()
    await _Success(data).execute()
  } catch (error) {
    if (error instanceof _Error) {
      return await _Failure(error.data, error).execute()
    }
    if (error instanceof _Pass) {
      return syslog('Workflow', hook.id, '取消')
    }

    syslog('Workflow', hook.id, '發生錯誤(2)', error)

    if (!isIgnoreErrors) {
      throw error
    }
  }
}








Workflow.start = async (hook, header, payload, isIgnoreErrors = true) => {
  const deployments = await Model.Deployment
    .where('enable', Model.Deployment.ENABLE_YES)
    .where('fullname', hook.fullname)
    .where('branch', hook.commitBranch)
    .all()

  await Promise.all(deployments.map(deployment => _start(hook, header, payload, deployment, isIgnoreErrors)))
}

module.exports = Workflow