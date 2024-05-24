/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const HookEvent = {
  $socket: new Map(),
  // $closure: new Map(),
  _checkSocket (socket) {
    return typeof socket._.hookId == 'number' && !isNaN(socket._.hookId) && socket._.hookId !== Infinity
  },
  // on (key, closure) {
  //   $closure.
  // }
  emit (key, eKey, data, closure = null) {
    const socketClosures = this.$socket.get(key)
    
    if (!(socketClosures instanceof Map)) {
      if (typeof closure == 'function') {
        closure()
      }
      return this
    }

    for (const [socket, _closure] of socketClosures.entries()) {
      if (typeof _closure == 'function') {
        _closure.call(socket, eKey, data)
      }
    }

    if (typeof closure == 'function') {
      closure()
    }
  },
  subscribe (socket, closure) {
    if (!this._checkSocket(socket)) {
      return this
    }
    const socketClosures = this.$socket.get(socket._.hookId) || new Map()
    socketClosures.set(socket, closure)
    this.$socket.set(socket._.hookId, socketClosures)
    return this
  },
  unsubscribe (socket) {
    if (!this._checkSocket(socket)) {
      return this
    }

    const socketClosures = this.$socket.get(socket._.hookId)
    if (!(socketClosures instanceof Map)) {
      return this
    }

    socketClosures.delete(socket)
    if (socketClosures.size != 0) {
      this.$socket.set(socket._.hookId, socketClosures)
    } else {
      this.$socket.delete(socket._.hookId)
    }
    
    return this
  }
}

module.exports = HookEvent