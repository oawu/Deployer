/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Exec = require('child_process').exec
const { Argv, Type: T } = require('@oawu/helper')

let isPm2 = null
const syslog = (...texts) => {
  if (isPm2 === null) {
    const dash = Argv.dash()
    isPm2 = dash['-PM2'] !== undefined
  }

  const strs = []

  for (const text of texts) {
    if (T.err(text)) {
      strs.push(text.message)
      strs.push(text.stack)
    } else {
      strs.push(`${text}`)
    }
  }

  process.stdout.write(`${strs.join(' ─ ')}${isPm2 ? '' : '\n'}`)
  return true
}

const exec = (command, option = { maxBuffer: 1024 }) => new Promise((resolve, reject) => Exec(command, option, (error, stdout, stderr) => {
  if (error) {
    return reject(`Error: ${error.message}`)
  }
  resolve({ stdout, stderr })
}))

const during = sec => {
  const units = [], contitions = [
    { base: 60, format: '秒' },
    { base: 60, format: '分鐘' },
    { base: 24, format: '小時' },
    { base: 30, format: '天' },
    { base: 12, format: '個月' }
  ]
  let now = parseInt(sec, 10)
  let nowUnit = null

  if (now <= 0) {
    return '太快了…'
  }

  for (const i in contitions) {
    nowUnit = now % contitions[i].base
    if (nowUnit != 0) {
      units.push(nowUnit + contitions[i].format)
    }
    now = Math.floor(now / contitions[i].base)
    if (now < 1) {
      break
    }
  }

  if (now > 0) {
    units.push(`${now} 年`)
  }

  if (units.length < 1) {
    units.push(`${now} 秒`)
  }

  return units.reverse().join(' ')
}

module.exports = {
  syslog,
  exec,
  during,
}
