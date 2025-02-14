/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  page404 (_, output) {
    output(`<h1>哎呀！</h1><article><p>嘿！孩子, 你想幹嘛呢？迷路了嗎？</p><b>：）</b>`, 404)
  },
  async a (_, output) {

    // 模擬多行程式碼複雜運算造成的卡頓 0.5 秒
    // const start = Date.now();
    // while (Date.now() - start < 5000);
    output('a');
    console.error('aaa');
    

    await new Promise(r => setTimeout(r, 5000))
    return 'x'
  },
  b (_, output) {
    output('b');
  },
  index (_, output) {
    output(`<h1>哎呀！</h1><article><p>嘿！孩子, 你想幹嘛呢？迷路了嗎？</p><b>：）</b>`, 500)
  },
}