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

const Update = function (data) {
  if (!(this instanceof Update)) {
    return new Update(data)
  }
  this._data = data
}
Update.prototype._gitFetch = async function () {
  const cmd = `cd ${this._data.deployment.dir} && git fetch --all`

  await CheckPass(this._data, `取得最新的變更`, `gitFetch`, cmd).execute(async log => {
    try {
      const { stdout } = await Exec(this._data, cmd)
      log.output = stdout
    } catch (error) {
      throw Err(`取得最新的變更時發生錯誤`, this._data, { cause: error })
    }

    await log.saveWithTime()
  })
}
Update.prototype._gitReset = async function () {
  const cmd = `cd ${this._data.deployment.dir} && git reset --hard origin/${this._data.deployment.branch}`

  await CheckPass(this._data, `重置為最新`, `gitReset`, cmd).execute(async log => {
    try {
      const { stdout } = await Exec(this._data, cmd)
      log.output = stdout
    } catch (error) {
      throw Err(`重置為最新時發生錯誤`, this._data, { cause: error })
    }

    await log.saveWithTime()
  })
}
Update.prototype._gitPull = async function () {
  const cmd = `cd ${this._data.deployment.dir} && git pull origin ${this._data.deployment.branch}`

  await CheckPass(this._data, `拉取並合併`, `gitPull`, cmd).execute(async log => {
    try {
      const { stdout } = await Exec(this._data, cmd)
      log.output = stdout
    } catch (error) {
      throw Err(`拉取並合併時發生錯誤`, this._data, { cause: error })
    }

    await log.saveWithTime()
  })
}
Update.prototype.execute = async function () {
  await CheckPass(this._data, `更新專案`, `update`).execute(async log => {
    await this._gitFetch()
    await this._gitReset()
    await this._gitPull()
    await log.saveWithTime()
  })
}

module.exports = Update
