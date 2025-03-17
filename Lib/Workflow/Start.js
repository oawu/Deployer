/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const { Client } = require('ssh2')
const fs = require('fs/promises')

const { Model } = require('@oawu/mysql-orm')
const { Sigint, Type: T } = require('@oawu/helper')

const Path = require('@oawu/_Path')

const Map = require(`${Path.lib}Workflow${Path.$.sep}Map.js`)
const Err = require(`${Path.lib}Workflow${Path.$.sep}Err.js`)
const CheckPass = require(`${Path.lib}Workflow${Path.$.sep}CheckPass.js`)

const Start = function (data) {
  if (!(this instanceof Start)) {
    return new Start(data)
  }
  this._data = data
}


Start.prototype._dataBind = async function () {
  await CheckPass(this._data, `資料綁定`, `dataBind`).execute(async log => {
    this._data.deployment.workflowId = this._data.workflow.id

    this._data.workflow.status = Model.Workflow.STATUS_RUNNING
    this._data.workflow.sTime = Date.now() / 1000

    await Promise.all([
      this._data.deployment.save(),
      this._data.workflow.save(),
      log.saveWithTime(),
    ])
  })
}
Start.prototype._telegram = async function () {
  await CheckPass(this._data, `Telegram 連線`, 'telegram').execute()
}

Start.prototype._sshConnect = async function () {
  if (this._data.deployment.type == Model.Deployment.TYPE_LOCAL) {
    Map.sshConnect.set(this._data.workflow.id, false)
    return
  }

  const host = this._data.deployment.sshHost
  const port = this._data.deployment.sshPort
  const username = this._data.deployment.sshUser
  const path = this._data.deployment.sshKeyPath

  const sshConnect = await CheckPass(this._data, `SSH 連線`, `sshConnect`, `ssh ${username}@${host}:${port}`).execute(async log => {

    try {
      await fs.access(path, fs.constants.R_OK)
    } catch (error) {
      throw Err(`SSH 私鑰路徑無法讀取，路徑：${path}`, this._data)
    }

    const stat = await fs.stat(path)
    if (stat.isDirectory()) {
      throw Err(`SSH 私鑰路徑不存在，路徑：${path}`, this._data)
    }

    const privateKey = await fs.readFile(path, { encoding: `utf8` })

    const [sshConnect] = await Promise.all([
      new Promise((resolve, reject) => {
        const _connect = new Client()
        _connect.on('ready', _ => resolve(_connect))
        _connect.on('error', _ => reject(new Err(`SSH 連線失敗`, this._data)))
        _connect.connect({ host, port, username, privateKey })
      }),
      log.saveWithTime()
    ])

    return sshConnect
  })

  if (!T.obj(sshConnect)) {
    throw Err(`無法建立 SSH 連線`, this._data)
  }

  Map.sshConnect.set(this._data.workflow.id, sshConnect)
  Sigint.push(async _ => await sshConnect.end())
}
Start.prototype.execute = async function () {
  await CheckPass(this._data, `開始`, `start`).execute(async log => {
    await this._dataBind()
    await this._telegram()
    await this._sshConnect()
    await log.saveWithTime()
  })
}

module.exports = Start