/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  page404 (request, response) {
    response.output(`<h1>哎呀！</h1><article><p>嘿！孩子, 你想幹嘛呢？迷路了嗎？</p><b>：）</b>`, 404)
  },
  index (request, response) {
    response.output(`<h1>哎呀！</h1><article><p>嘿！孩子, 你想幹嘛呢？迷路了嗎？</p><b>：）</b>`, 500)
  },
}