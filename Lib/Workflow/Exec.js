/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const { Type: T } = require('@oawu/helper')

const Path = require('@oawu/_Path')


const _Exec = require('child_process').exec
const _exec = (command, option = { maxBuffer: 1024 }) => new Promise((resolve, reject) => _Exec(command, option, (error, stdout, stderr) => error
  ? reject(error)
  : resolve({ stdout, stderr })))


const Map = require(`${Path.lib}Workflow${Path.$.sep}Map.js`)

module.exports = async (data, cmd) => {
  const sshConnect = Map.sshConnect.get(data.workflow.id)

  if (sshConnect === false) {
    return await _exec(cmd)
  }

  if (!T.obj(sshConnect)) {
    throw new Error(`連線失效`)
  }

  return await new Promise((resolve, reject) => {
    sshConnect.exec(cmd, (error, stream) => {
      if (error) {
        return reject(error)
      }

      let stdout = ''
      let stderr = ''
      stream.on('close', _ => resolve({ stdout, stderr }))
      stream.on('data', data => stdout = data.toString())
      stream.stderr.on('data', data => stderr = data.toString())
    })
  })
}