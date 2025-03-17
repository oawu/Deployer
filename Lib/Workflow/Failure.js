/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const { Model } = require('@oawu/mysql-orm')
const { tryIgnore, date, Type: T } = require('@oawu/helper')

const Path = require('@oawu/_Path')
const { during } = require('@oawu/_Helper')

const Telegram = require(`${Path.lib}Telegram.js`)
const Map = require(`${Path.lib}Workflow${Path.$.sep}Map.js`)
const CheckPass = require(`${Path.lib}Workflow${Path.$.sep}CheckPass.js`)

const Failure = function (data, error) {
  if (!(this instanceof Failure)) {
    return new Failure(data, error)
  }
  this._error = error
  this._data = data
  this._logs = this._data.logs
  this._data.logs = []
}
Failure.prototype._updateStatus = async function () {
  await CheckPass(this._data, `更新資料`, `updateFailureStatus`).execute(async log => {
    await Promise.all([
      ...this._logs.map(log => log.saveWithTime()),
      this._data.workflow.saveWithTimeStatus(Model.Workflow.STATUS_FAILURE),
      log.saveWithTime(),
    ])
  })
}
Failure.prototype._closeSSHConnect = async function () {
  await CheckPass(this._data, `關閉 SSH 連線`, `closeSSHConn`).execute(async log => {
    const sshConnect = Map.sshConnect.get(this._data.workflow.id)
    Map.sshConnect.delete(this._data.workflow.id)

    if (sshConnect) {
      await sshConnect.end()
    }
    await log.saveWithTime()
  })
}
Failure.prototype._closeTelegram = async function () {
  await CheckPass(this._data, `關閉 Telegram`, `closeFailureTelegram`).execute(async (log, telegram) => {
    Map.telegram.delete(this._data.workflow.id)

    const texts = []
    const logs = []
    if (this._data.trigger.cli instanceof Model.CliTrigger) {
      texts.push(
        '-'.repeat(32),
        `🚀 狀態：部署失敗 cli #${this._data.trigger.cli.id}`,
        `⏰ 時間：${date()}`,
        `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
      )
      logs.push(
        '-'.repeat(32),
        `🚀 狀態：部署失敗 cli #${this._data.trigger.cli.id}`,
        `⏰ 時間：${date()}`,
        `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
      )
      if (T.neStr(this._error.message)) {
        texts.push(`🗒️ 原因：${this._error.message}`)
        logs.push(`🗒️ 原因：${this._error.message}`)
      }
      if (T.err(this._error.cause) && T.neStr(this._error.cause.message)) {
        texts.push(`💬 訊息：${this._error.cause.message}`)
        logs.push(`💬 訊息：${this._error.cause.message}`)
      } else if (T.neStr(this._error.cause)) {
        texts.push(`💬 訊息：${this._error.cause}`)
        logs.push(`💬 訊息：${this._error.cause}`)
      }
    }
    if (this._data.trigger.hook instanceof Model.BitbucketHook) {
      texts.push(
        '-'.repeat(32),
        `🚀 狀態：部署失敗 hook #${this._data.trigger.hook.id}`,
        `⏰ 時間：${date()}`,
        `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
      )
      logs.push(
        '-'.repeat(32),
        `🚀 狀態：部署失敗 hook #${this._data.trigger.hook.id}`,
        `⏰ 時間：${date()}`,
        `⏱️ 耗時：${T.num(this._data.workflow.dTime) ? during(this._data.workflow.dTime) : '?'}`,
      )
      if (T.neStr(this._error.message)) {
        texts.push(`🗒️ 原因：${this._error.message}`)
        logs.push(`🗒️ 原因：${this._error.message}`)
      }
      if (T.err(this._error.cause) && T.neStr(this._error.cause.message)) {
        texts.push(`💬 訊息：${this._error.cause.message}`)
        logs.push(`💬 訊息：${this._error.cause.message}`)
      } else if (T.neStr(this._error.cause)) {
        texts.push(`💬 訊息：${this._error.cause}`)
        logs.push(`💬 訊息：${this._error.cause}`)
      }
    }

    for (const log of logs) {
      this._data.logger(log)
    }

    await telegram.push(Telegram.Message(texts.join('\n')))

    await log.saveWithTime()
  })
}
Failure.prototype.execute = async function () {
  await tryIgnore(CheckPass(this._data, `失敗`, 'failure').execute(async log => {
    await this._updateStatus()
    await this._closeSSHConnect()
    await this._closeTelegram()
    await log.saveWithTime()
  }))

  Map.isRunning.delete(this._data.workflow.id)
}

module.exports = Failure
