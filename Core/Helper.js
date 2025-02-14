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
  resolve(stdout, stderr)
}))

module.exports = {
  syslog,
  exec,
}
