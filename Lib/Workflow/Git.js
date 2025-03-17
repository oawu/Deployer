/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const { Model } = require('@oawu/mysql-orm')

const Path = require('@oawu/_Path')

const Err = require(`${Path.lib}Workflow${Path.$.sep}Err.js`)
const Exec = require(`${Path.lib}Workflow${Path.$.sep}Exec.js`)
const CheckPass = require(`${Path.lib}Workflow${Path.$.sep}CheckPass.js`)

const Git = function (data) {
  if (!(this instanceof Git)) {
    return new Git(data)
  }
  this._dirBr = null
  this._data = data
}
Git.prototype._gitStatus = async function () {
  if (this._data.deployment.force == Model.Deployment.FORCE_YES) {
    return
  }

  const cmd = `cd ${this._data.deployment.dir} && git status --porcelain`

  await CheckPass(this._data, `檢查狀態`, `gitStatus`, cmd).execute(async log => {
    try {
      const { stdout } = await Exec(this._data, cmd)
      log.output = stdout
    } catch (error) {
      throw Err(`檢查狀態時發生錯誤`, this._data, { cause: error })
    }

    if (log.output.trim() !== '') {
      throw Err(`專案內有未 Commit 的異動`, this._data, { cause: log.output })
    }
    await log.saveWithTime()
  })
}
Git.prototype._gitBr1 = async function () {
  const cmd = `cd ${this._data.deployment.dir} && git rev-parse --abbrev-ref HEAD`

  return await CheckPass(this._data, `取得分支`, `gitBr1`, cmd).execute(async log => {
    try {
      const { stdout } = await Exec(this._data, cmd)
      log.output = stdout
      this._dirBr = stdout.trim()
    } catch (error) {
      throw Err(`取得分支時發生錯誤`, this._data, { cause: error })
    }
    await log.saveWithTime()
  })
}
Git.prototype._gitBr2 = async function () {
  await CheckPass(this._data, `比對/檢查分支`, `gitBr2`).execute(async log => {
    if (this._dirBr === '') {
      throw Err(`目前專案分支為「空字串」`, this._data)
    }

    if (this._dirBr != this._data.deployment.branch) {
      throw Err(`目前專案分支是「${this._dirBr}」，不是指定的分支「${this._data.deployment.branch}」`, this._data)
    }

    await log.saveWithTime()
  })
}
Git.prototype.execute = async function () {
  await CheckPass(this._data, `Git 指令`, `git`).execute(async log => {
    await this._gitStatus()
    await this._gitBr1()
    await this._gitBr2()
    await log.saveWithTime()
  })
}

module.exports = Git