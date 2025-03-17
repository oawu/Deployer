/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Orm = require('@oawu/mysql-orm')
const Path = require('@oawu/_Path')
const Workflow = require(`${Path.lib}Workflow.js`)
const { syslog } = require('@oawu/_Helper')

module.exports = {
  page404(_, output) {
    output(`<h1>哎呀！</h1><article><p>嘿！孩子, 你想幹嘛呢？迷路了嗎？</p><b>：）</b>`, 404)
  },
  index(_, output) {
    output(`<h1>哎呀！</h1><article><p>嘿！孩子, 你想幹嘛呢？迷路了嗎？</p><b>：）</b>`, 500)
  },
  async cli() {
    // const cli = await Orm.Model.CliTrigger.init(this.id, 'foot-print/php', 'prod')

    // await Workflow({ cli }, (...texts) => {
    //   syslog(...texts)
    //   this.logger(...texts)
    // })
  }
}