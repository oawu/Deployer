/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Path = require('@oawu/_Path')

const Exec = require(`${Path.lib}Workflow${Path.$.sep}Exec.js`)
const CheckPass = require(`${Path.lib}Workflow${Path.$.sep}CheckPass.js`)
const Err = require(`${Path.lib}Workflow${Path.$.sep}Err.js`)

const RunCmds = function (data) {
  if (!(this instanceof RunCmds)) {
    return new RunCmds(data)
  }
  this._data = data
}
RunCmds.prototype._execute = async function (i, title, dir, cmd) {
  await CheckPass(this._data, `執行附加指令：${title}`, `runCmds #${i}`, `cd ${dir} && ${cmd}`).execute(async log => {
    try {
      const { stdout } = await Exec(this._data, `cd ${dir} && ${cmd}`)
      log.output = stdout
    } catch (error) {
      throw Err(`執行附加指令「${title}」時發生錯誤`, this._data, { cause: error })
    }
    await log.saveWithTime()
  })
}
RunCmds.prototype.execute = async function () {
  await CheckPass(this._data, `附加指令`, `runCmds`).execute(async log => {

    for (const i in this._data.commands) {
      const { title, cmd } = this._data.commands[i]
      await this._execute(i, title, this._data.deployment.dir, cmd)
    }

    await log.saveWithTime()
  })
}

module.exports = RunCmds
