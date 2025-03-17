/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const { Model } = require('@oawu/mysql-orm')
const { Type: T } = require('@oawu/helper')

const Path = require('@oawu/_Path')

const Map = require(`${Path.lib}Workflow${Path.$.sep}Map.js`)
const Pass = require(`${Path.lib}Workflow${Path.$.sep}Pass.js`)

const CheckPass = function (data, title, funcName = '', cmd = '') {
  if (!(this instanceof CheckPass)) {
    return new CheckPass(data, title, funcName, cmd)
  }
  this._data = null
  this._title = ''
  this._funcName = ''
  this._cmd = ''
  this._checkEnable = true

  this.data(data).title(title).funcName(funcName).cmd(cmd)
}
CheckPass.prototype.data = function (data) {
  if (T.obj(data)) {
    this._data = data
  }
  return this
}
CheckPass.prototype.title = function (title) {
  if (T.str(title)) {
    this._title = title
  }
  return this
}
CheckPass.prototype.funcName = function (funcName) {
  if (T.str(funcName)) {
    this._funcName = funcName
  }
  return this
}
CheckPass.prototype.cmd = function (cmd) {
  if (T.str(cmd)) {
    this._cmd = cmd
  }
  return this
}
CheckPass.prototype.checkEnable = function (checkEnable) {
  if (T.bool(checkEnable)) {
    this._checkEnable = checkEnable
  }
  return this
}
CheckPass.prototype.execute = async function (func = null) {
  if (this._checkEnable && !Map.isRunning.get(this._data.workflow.id)) {
    throw Pass(this._title, this._data)
  }

  if (!T.obj(this._data)) {
    return
  }

  const telegram = Map.telegram.get(this._data.workflow.id)
  if (!telegram) {
    return
  }

  return await telegram.task(this._data.logger, this._data.logs.length, this._title, async _ => {
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

module.exports = CheckPass