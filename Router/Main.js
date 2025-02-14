/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Router = require(`@oawu/_Route`)
const Config = require(`@oawu/_Config`)

Router.page404.controller('Main@page404')
Router.get('').controller('Main@index')
Router.get('a').controller('Main@a')
Router.get('b').controller('Main@b')
// Router.get('a').func(async _ => {
//   await new Promise(r => setTimeout(r, 5000))
//   return 'a'
// })
// Router.get('b').func(async _ => {
//   return 'b'
// })

Router.get('hook').controller('Hook@show')
Router.post('hook/bitbucket').controller('Bitbucket@index')
// Router.post('hook/bitbucket').func(_ => {
//   return 'x'
// })

// Router.options('*').func((_, response) => {
//   response.writeHead(204, Router.cros.headers)
//   response.end()
// })
