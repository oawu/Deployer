/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

function Err(message, data, other = {}) {
  if (!(this instanceof Err)) {
    return new Err(message, data, other)
  }
  Error.call(this, message)

  this.message = message
  this.data = data
  this.name = "Err"
  for (const key in other) {
    this[key] = other[key]
  }

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, Err)
  } else {
    this.stack = new Error(message).stack
  }
}

// 繼承 Error
Err.prototype = Object.create(Error.prototype)
Err.prototype.constructor = Err

module.exports = Err