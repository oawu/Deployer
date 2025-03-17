/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const uuid = require('uuid')

const { Sigint, Type: T } = require('@oawu/helper')
const Config = require('@oawu/_Config')
const Logger = require('@oawu/_Logger')
const { syslog } = require('@oawu/_Helper')

const id = uuid.v4()
const logger = Logger.server(id)

const _syslog = (...texts) => {
  syslog(...texts)
  logger(...texts)
}

const _exit = async _ => {
  _syslog('')
  _syslog('='.repeat(20))
  _syslog('結束')
  _syslog('='.repeat(20))

  Logger.waitFinish()
  await Sigint.execute()
}


const main = async _ => {
  _syslog('='.repeat(20))
  _syslog('初始')
  _syslog('='.repeat(20))
  process.on('SIGINT', _exit)
  _syslog('初始', `ok`)

  const { mySQL, migrate, model, route } = require('./_init.js')

  await mySQL(_syslog)
  await migrate(_syslog)
  await model(_syslog)

  const Route = await route(_syslog)

  const Http = await new Promise((resolve, reject) => {
    const Http = require('http').Server()
    Http.on('error', error => {
      _syslog('Http', 'err', `${error}`)
      reject(error)
    })
    Http.listen(Config.port, _ => resolve(Http))
    Http.on('request', (request, response) => Route.dispatch(id, request, response))
    Http.setTimeout(10 * 1000)
  })

  _syslog('開啟 Http', 'ok', `http://127.0.0.1:${Config.port}`)

  _syslog('='.repeat(20))
  _syslog('Http')
  _syslog('='.repeat(20))
}

main()
  .catch(async error => {
    _syslog('')
    _syslog('='.repeat(20))
    _syslog('發生錯誤')
    _syslog('='.repeat(20))

    if (T.neStr(error.message)) {
      _syslog('訊息', `${error.message}`)
    }

    if (error.cause !== undefined) {
      if (error.cause instanceof Error && T.neStr(error.cause.message)) {
        _syslog('原因', `${error.cause.message}`)
      }
      if (T.neStr(error.cause)) {
        _syslog('原因', `${error.cause}`)
      }
    }

    if (T.neStr(error.stdout)) {
      _syslog('輸出', `${error.stdout}`)
    }

    if (T.neStr(error.stack)) {
      _syslog('追蹤', `${error.stack}`)
    }
  })
