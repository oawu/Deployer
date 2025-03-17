/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const uuid = require('uuid')
const { Sigint, Type: T } = require('@oawu/helper')
const Logger = require('@oawu/_Logger')
const { syslog } = require('@oawu/_Helper')

const id = uuid.v4()
const logger = Logger.cli(id)

const _syslog = (...texts) => {
  syslog(...texts)
  logger(...texts)
}

const _exit = async _ => {
  logger('')
  logger('='.repeat(20))
  logger('結束')
  logger('='.repeat(20))

  Logger.waitFinish()
  await Sigint.execute()
}

const main = async _ => {
  logger('='.repeat(20))
  logger('開始')
  logger('='.repeat(20))
  process.on('SIGINT', _exit)
  logger('初始', 'ok')

  const { mySQL, migrate, model, route } = require('./_init.js')

  await mySQL(logger)
  await migrate(logger)
  await model(logger)

  const Route = await route(logger)

  const argvs = process.argv.slice(2);

  logger('='.repeat(20))
  logger('執行')
  logger('='.repeat(20))
  const result = await Route.execute(id, logger, argvs.length > 0 ? argvs[0] : '')

  if (result instanceof Error) {
    throw result
  }
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
      if (T.err(error.cause) && T.neStr(error.cause.message)) {
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
  .finally(_exit)
