/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const { Model } = require('@oawu/mysql-orm')
const uuid = require('uuid')
const Exec = require('child_process').exec
const Helper = require('@oawu/_Helper') 

const _task = new Map()

const _Pass = function(message) {
  if (!(this instanceof _Pass)) {
    return new _Pass(message)
  }
  Error.call(this, message)
  this.message = message
}
_Pass.prototype = Object.create(Error.prototype)
_Pass.prototype.constructor = _Pass

const _Error = function(message) {
  if (!(this instanceof _Error)) {
    return new _Error(message)
  }
  Error.call(this, message)
  this.message = message
}
_Error.prototype = Object.create(Error.prototype)
_Error.prototype.constructor = _Error

const ExecPromise = (command, option = { maxBuffer: 1024 }) => new Promise((resolve, reject) => Exec(command, option, (error, stdout, stderr) => {
  if (error) {
    return reject(`Error: ${error.message}`)
  }
  resolve(stdout, stderr)
}))

const _init = async deployment => {
  const uid = uuid.v4()

  const promises = [
    Model.DeploymentCommand.where('deploymentId', deployment.id).all(),
    Model.DeploymentTask.create({ deploymentId: deployment.id, uid, status: Model.DeploymentTask.STATUS_RUNNING }),
  ]

  const tasks = await Promise.all([
    Model.DeploymentTask.where('id', deployment.deploymentTaskId).one(),
    Model.DeploymentTask.where('deploymentId', deployment.id).one(),
  ])

  for (const task of tasks.filter(task => task && task.status == Model.DeploymentTask.STATUS_RUNNING).map(task => {
    _task.delete(task.id)
    task.status = Model.DeploymentTask.STATUS_CANCEL
    return task.save()
  })) {
    promises.push(task)
  }

  deployment.deploymentTaskId = 0
  promises.push(deployment.save())

  const hook = await Model.BitbucketHook.where('id', deployment.bitbucketHookId).one()
  if (hook && [Model.BitbucketHook.STATUS_STRUCTURING, Model.BitbucketHook.STATUS_PENDING, Model.BitbucketHook.STATUS_PROCESSING].includes(hook.status)) {
    hook.status = Model.BitbucketHook.STATUS_PASS
    promises.push(hook.save())
  }
  
  return await Promise.all(promises)
}

const _check = async (hook, task, title, desc) => {
  if (_task.get(task.id)) {
    Helper.print('DeployStep', hook.id, title, desc)
    return
  }
  throw _Pass(title)
}
const _start = async ({ hook, task, deployment }) => {
  _check(hook, task, 'start', `開始`)

  deployment.deploymentTaskId = task.id
  deployment.bitbucketHookId = hook.id

  hook.status = Model.BitbucketHook.STATUS_PROCESSING
  hook.sTime = Date.now() / 1000

  await Promise.all([
    deployment.save(),
    hook.save(),
  ])
}

const _isDir = async (hook, header, payload, deployment, task, commands) => {
  _check(hook, task, 'isDir', `檢查專案目錄是否存在`)

  const result = await ExecPromise(`if test -d ${deployment.dir}; then echo "1"; else echo "2"; fi`)

  if (result.trim() !== '1') {
    throw _Error(`找不到專案目錄：${deployment.dir}`)
  }
}
const _isGitDir = async (hook, header, payload, deployment, task, commands) => {
  _check(hook, task, 'isGitDir', `檢查專案是否採用 Git 管理`)

  const result = await ExecPromise(`if test -d ${deployment.dir}/.git; then echo "1"; else echo "2"; fi`)

  if (result.trim() !== '1') {
    throw _Error(`專案內沒有 .git 檔案`)
  }
}
const _gitStatus = async (hook, header, payload, deployment, task, commands) => {
  _check(hook, task, 'gitStatus', `檢查 Git 狀態，執行指令 git status --porcelain`)

  const result = await ExecPromise(`cd ${deployment.dir} && git status --porcelain`)

  if (result.trim() !== '') {
    throw _Error(`專案內有未 Commit 的異動`)
  }
}
const _gitBr1 = async (hook, header, payload, deployment, task, commands) => {
  _check(hook, task, 'gitBr1', `檢查分支 1，執行指令 git rev-parse --abbrev-ref HEAD`)
  const result = await ExecPromise(`cd ${deployment.dir} && git rev-parse --abbrev-ref HEAD`)
  return result.trim()
}
const _gitBr2 = async (br, hook, header, payload, deployment, task, commands) => {
  _check(hook, task, 'gitBr2', `檢查分支 2，檢查專案分支是否為指定的「${deployment.branch}」`)

  if (br === '') {
    throw _Error(`目前專案分支為「空字串」`)
  }

  if (br != deployment.branch) {
    throw _Error(`目前專案分支是「${br}」，不是指定的分支「${deployment.branch}」`)
  }
}
const _gitFetch = async (hook, header, payload, deployment, task, commands) => {
  _check(hook, task, 'gitFetch', `執行指令 git fetch --all`)
  await ExecPromise(`cd ${deployment.dir} && git fetch --all`)
}
const _gitReset = async (hook, header, payload, deployment, task, commands) => {
  _check(hook, task, 'gitReset', `執行指令 git reset --hard origin/${deployment.branch}`)
  await ExecPromise(`cd ${deployment.dir} && git reset --hard origin/${deployment.branch}`)
}
const _gitPull = async (hook, header, payload, deployment, task, commands) => {
  _check(hook, task, 'gitPull', `執行指令 git pull origin ${deployment.branch}`)
  await ExecPromise(`cd ${deployment.dir} && git pull origin ${deployment.branch}`)
}
const _runCmds = async (hook, header, payload, deployment, task, commands) => {
  _check(hook, task, 'runCmds')

  for (const command of commands) {
    _check(hook, task, 'runCmd', command.title !== '' ? `執行「${command.title}」，指令：${command.cmd}` : `執行指令：${command.cmd}`)
    await ExecPromise(`cd ${deployment.dir} && ${command.cmd}`)
  }
}
const _finallyFail = async (hook, header, payload, deployment, task, commands) => {
  if (!_task.get(task.id)) {
    throw _Pass('_finallyFail')
  }
  
  hook.eTime = Date.now() / 1000
  hook.dTime = Math.max(hook.eTime - hook.sTime, 0)
  hook.status = Model.BitbucketHook.STATUS_SUCCESS
  
  task.status = Model.DeploymentTask.STATUS_FINISH
  deployment.deploymentTaskId = 0
    
  await Promise.all([
    hook.save(),
    task.save(),
    deployment.save(),
  ])

  _task.delete(task.id)
}

module.exports = async (hook, header, payload, isIgnoreErrors = true) => {
  await new Promise(r => r())

  if (hook.status != Model.BitbucketHook.STATUS_PENDING) {
    return
  }

  try {
    const deployment = await Model.Deployment.where('enable', Model.Deployment.ENABLE_YES).where('fullname', hook.fullname).where('branch', hook.commitBranch).one()
    if (deployment === null) { return }

    const [commands, task] = await _init(deployment)
    _task.set(task.id, true)

    const data = { hook, header, payload, deployment, task, commands }

    await _start(data)
    await _isDir(data)
    await _isGitDir(data)
    await _gitStatus(data)
    const br = await _gitBr1(data)
    await _gitBr2(br, data)
    await _gitFetch(data)
    await _gitReset(data)
    await _gitPull(data)
    await _runCmds(data)
    await _finallyFail(data)

  } catch (error) {
    if (error instanceof _Pass) {
      try {
        hook.status = Model.BitbucketHook.STATUS_PASS
        await hook.save()
      } catch (_) {}
      return console.error(`_Pass ${error.message}`)
    }






    
    if (error instanceof _Error) {
      return console.error(`_Error ${error.message}`)
    }

    if (!isIgnoreErrors) {
      throw error
    }
  }
}
