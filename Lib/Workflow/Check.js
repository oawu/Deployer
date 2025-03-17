/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Path = require('@oawu/_Path')

const Err = require(`${Path.lib}Workflow${Path.$.sep}Err.js`)
const Exec = require(`${Path.lib}Workflow${Path.$.sep}Exec.js`)
const CheckPass = require(`${Path.lib}Workflow${Path.$.sep}CheckPass.js`)

const Check = function (data) {
  if (!(this instanceof Check)) {
    return new Check(data)
  }
  this._data = data
}
Check.prototype._checkDir = async function () {
  const cmd = `if test -d ${this._data.deployment.dir}; then echo "1"; else echo "2"; fi`

  await CheckPass(this._data, `專案目錄`, `checkDir`, cmd).execute(async log => {
    try {
      const { stdout } = await Exec(this._data, cmd)
      log.output = stdout
    } catch (error) {
      throw Err(`確認專案目錄時發生錯誤`, this._data, { cause: error })
    }

    if (log.output.trim() !== '1') {
      throw Err(`找不到專案目錄：${this._data.deployment.dir}`, this._data, { cause: log.output })
    }
    await log.saveWithTime()
  })
}
Check.prototype._isGitDir = async function () {
  const cmd = `if test -d ${this._data.deployment.dir}/.git; then echo "1"; else echo "2"; fi`

  await CheckPass(this._data, `專案是否採用 Git 管理`, `isGitDir`, cmd).execute(async log => {
    try {
      const { stdout } = await Exec(this._data, cmd)
      log.output = stdout
    } catch (error) {
      throw Err(`確認專案是否採用 Git 管理時發生錯誤`, this._data, { cause: error })
    }

    if (log.output.trim() !== '1') {
      throw Err(`專案內沒有 .git 目錄`, this._data, { cause: log.output })
    }
    await log.saveWithTime()
  })
}
Check.prototype.execute = async function () {
  await CheckPass(this._data, `檢查專案`, `check`).execute(async log => {
    await this._checkDir()
    await this._isGitDir()
    await log.saveWithTime()
  })
}

module.exports = Check
