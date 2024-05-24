/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const FileSystem = require('fs').promises
const moment     = require('moment')

const Queue      = require('@oawu/queue')
const { Model }  = require('@oawu/mysql-orm')
const Dog        = require('@oawu/dog')

const Helper     = require('@oawu/_Helper')
const Path       = require('@oawu/_Path')
const Config     = require('@oawu/_Config')


module.exports = {
  show (request, response) {
    if (!(typeof this.queries.token == 'string' && this.queries.token !== '')) {
      return response.output(`<h1>哎呀！</h1><article><p>發生錯誤囉(1)！</p><b>：）</b>`, 400)
    }

    const id = Model.BitbucketHook.decodeToken(this.queries.token)
    
    if (id instanceof Error) {
      return response.output(`<h1>哎呀！</h1><article><p>發生錯誤囉(2)！</p><b>：）</b>`, 400)
    }

    const dog = Dog().bite(food => {
      if (food instanceof Error) {
        return response.output(error)
      }

      const [template1, template2] = food
      return response.output([template1, [
        `window.baseUrl = "${Config.webUrl}"`,
        `window.socketUrl = "${Config.socketUrl}"`,
        `window.token = "${this.queries.token}"`,
        ].join(';'), template2].join(''))
    })

    // Lalilo 的 tmp/2024/0510-deploy ，指令 node Build.js --min --merge
    Promise.all([
      FileSystem.readFile(`${Path.asset}hook-1.template`, { encoding: 'utf8' }),
      FileSystem.readFile(`${Path.asset}hook-2.template`, { encoding: 'utf8' }),
    ])
      .then(dog.eat)
      .catch(dog.eat)
  },
}