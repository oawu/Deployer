/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  _tasks: [],
  async run (closure = null) {
    for (const task of this._tasks) {
      try { await task() }
      catch (_) { }
    }

    if (typeof closure == 'function') {
      try { await closure() }
      catch (_) { }
    }
    
    process.exit(1)
  },
  push (...data) {
    this._tasks.push(...data)
    return this
  },
}