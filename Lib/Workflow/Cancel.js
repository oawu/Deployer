/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const { Model } = require('@oawu/mysql-orm')
const { tryFunc, date, Type: T } = require('@oawu/helper')

const Path = require('@oawu/_Path')
const { during } = require('@oawu/_Helper')

const Telegram = require(`${Path.lib}Telegram.js`)
const Map = require(`${Path.lib}Workflow${Path.$.sep}Map.js`)
const CheckPass = require(`${Path.lib}Workflow${Path.$.sep}CheckPass.js`)

const Cancel = function (data) {
  if (!(this instanceof Cancel)) {
    return new Cancel(data)
  }
  this._checkEnable = false
  this._data = data
}
Cancel.prototype._updateStatus = async function () {
  await CheckPass(this._data, `更新資料`, `updateCancelStatus`).checkEnable(this._checkEnable).execute(async log => {
    await Promise.all([
      this._data.workflow.saveWithTimeStatus(Model.Workflow.STATUS_CANCEL),
      log.saveWithTime(),
    ])
  })
}
Cancel.prototype._closeSSHConnect = async function () {
  await CheckPass(this._data, `關閉 SSH 連線`, `closeSSHConn`).checkEnable(this._checkEnable).execute(async log => {
    const sshConnect = Map.sshConnect.get(this._data.workflow.id)
    Map.sshConnect.delete(this._data.workflow.id)

    if (sshConnect) {
      await sshConnect.end()
    }
    await log.saveWithTime()
  })
}
Cancel.prototype._closeTelegram = async function () {
  await CheckPass(this._data, `關閉 Telegram`, `closeCancelTelegram`).checkEnable(this._checkEnable).execute(async (log, telegram) => {
    Map.telegram.delete(this._data.workflow.id)

    const texts = []
    const logs = []
    if (this._data.trigger.cli instanceof Model.CliTrigger) {
      texts.push(
        '-'.repeat(32),
        `🚀 狀態：部署取消 cli #${this._data.trigger.cli.id}`,
        `⏰ 時間：${date()}`,
        `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
      )
      logs.push(
        '-'.repeat(32),
        `🚀 狀態：部署取消 cli #${this._data.trigger.cli.id}`,
        `⏰ 時間：${date()}`,
        `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
      )
    }
    if (this._data.trigger.hook instanceof Model.BitbucketHook) {
      texts.push(
        '-'.repeat(32),
        `🚀 狀態：部署取消 #${this._data.trigger.hook.id}`,
        `⏰ 時間：${date()}`,
        `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
      )
      logs.push(
        '-'.repeat(32),
        `🚀 狀態：部署取消 #${this._data.trigger.hook.id}`,
        `⏰ 時間：${date()}`,
        `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
      )
    }

    for (const log of logs) {
      this._data.logger(log)
    }

    await telegram.push(Telegram.Message(texts.join('\n')))

    await log.saveWithTime()
  })
}
Cancel.prototype.execute = async function () {
  await tryFunc(CheckPass(this._data, `取消`, 'cancel').checkEnable(this._checkEnable).execute(async log => {
    await this._updateStatus()
    await this._closeSSHConnect()
    await this._closeTelegram()
    await log.saveWithTime()
  }))
}

module.exports = Cancel