/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const _os = require('os')

const CliTrigger = function () { }

CliTrigger.init = async function (uid, fullname, branch) {
  const { username, os, version, publicIp, networks } = await (async _ => {

    const { Json: { encode } } = require('@oawu/helper')

    const publicIp = await new Promise((resolve, reject) => require('dns').lookup('myip.opendns.com', { family: 4 }, (err, address) => {
      err || !address
          ? require('https').get('https://api64.ipify.org?format=json', resp => {
              let data = ''
              resp.on('data', chunk => { data += chunk })
              resp.on('end', () => { resolve(JSON.parse(data).ip) })
          }).on('error', reject)
          : resolve(address)
    }))

    const networks = encode((_ => {
      const interfaces = _os.networkInterfaces()
      const networks = []
      for (const name in interfaces) {
        networks.push({
          name,
          infos: interfaces[name].map(iface => ({
            mac: iface.mac,
            family: iface.family,
            address: iface.address
          }))
        })
      }

      return networks;
    })())

    if (networks instanceof Error) {
      throw networks
    }

    return {
      username: _os.userInfo().username,
      os: _os.type(),
      version: _os.release(),
      publicIp,
      networks: networks,
    }
  })()

  return await CliTrigger.create({ uid, fullname, branch, username, os, version, publicIp, networks })
}

module.exports = CliTrigger