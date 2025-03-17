/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Path = require('path')
const root = Path.resolve(__dirname, ('..' + Path.sep).repeat(1)) + Path.sep

// const core       = root + 'Core' + Path.sep
const model = `${root}Model${Path.sep}`
const migration = `${root}Migration${Path.sep}`
const router = `${root}Router${Path.sep}`
const controller = `${root}Controller${Path.sep}`
const lib = `${root}Lib${Path.sep}`
const asset = `${root}Asset${Path.sep}`
// const webSocket  = root + 'WebSocket' + Path.sep

const file = {
  log: {
    query: `${root}File${Path.sep}Log${Path.sep}Query${Path.sep}`,
    server: `${root}File${Path.sep}Log${Path.sep}Server${Path.sep}`,
    request: `${root}File${Path.sep}Log${Path.sep}Request${Path.sep}`,
    cli: `${root}File${Path.sep}Log${Path.sep}Cli${Path.sep}`,
  }
  //   tmp: root + 'File' + Path.sep + 'Tmp' + Path.sep,
}

module.exports = {
  $: Path,
  root,
  lib,
  // core,
  model,
  asset,
  migration,
  router,
  // router,
  controller,
  file,
  // webSocket,
}