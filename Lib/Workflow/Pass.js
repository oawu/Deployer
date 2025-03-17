/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

function Pass(message, data, other = {}) {
  if (!(this instanceof Pass)) {
    return new Pass(message, data, other)
  }
  Error.call(this, message)
  this.name = "Pass"
  this.data = data
  for (const key in other) {
    this[key] = other[key]
  }

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Pass)
  } else {
    this.stack = new Error(message).stack
  }
}

// 繼承 Error
Pass.prototype = Object.create(Error.prototype)
Pass.prototype.constructor = Pass

module.exports = Pass