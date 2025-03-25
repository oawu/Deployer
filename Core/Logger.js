/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const fs = require('fs/promises')
const Path = require('@oawu/_Path')
const { date, Sigint, promisify } = require('@oawu/helper')

const _Log = {
  _funcs: [],
  _ing: false,
  _finish: null,
  push (func) {
    if (this._finish) {
      return this
    }

    this._funcs.push(func)
    this.execute()
    return this
  },
  async execute () {
    if (this._ing) {
      return
    }

    const func = this._funcs.shift()
    if (func) {
      this._ing = true
      await func()
      this._ing = false
      this.execute()
    } else {
      if (this._finish) {
        this._finish()
      }
    }
  },
  finish (callback = null) {
    return promisify(callback, done => this.execute(this._finish = done))
  }
}

module.exports = {
  server:         id => (...texts) => _Log.push(async _ => await fs.writeFile(`${Path.file.log.server}${date('Y-m-d')}.log`, `${date('H:i:s')} ${id} ${texts.join(' ─ ')}\n`, { flag: 'a', encoding: 'utf8' })),
  cli:            id => (...texts) => _Log.push(async _ => await fs.writeFile(`${Path.file.log.cli}${date('Y-m-d')}.log`, `${date('H:i:s')} ${id} ${texts.join(' ─ ')}\n`, { flag: 'a', encoding: 'utf8' })),
  request:        id => (...texts) => _Log.push(async _ => await fs.writeFile(`${Path.file.log.request}${date('Y-m-d')}.log`, `${date('H:i:s')} ${id} ${texts.join(' ─ ')}\n`, { flag: 'a', encoding: 'utf8' })),
  waitFinish: _ => Sigint.push(async _ => await _Log.finish())
}