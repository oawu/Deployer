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

Router.get('hook').controller('Hook@show')
Router.post('hook/bitbucket').controller('Bitbucket@index')

// Router.options('*').func((_, response) => {
//   response.writeHead(204, Router.cros.headers)
//   response.end()
// })
