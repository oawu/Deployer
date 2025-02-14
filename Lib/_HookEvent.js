/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const T = require('@oawu/_Type')

module.exports = {
  $socket: new Map(),

  _emit: async (done, map, eKey, data) => {
    for (const [socket, _closure] of map.entries()) {
        if (typeof _closure == 'function') {
        try {
          await _closure.call(socket, eKey, data)
        } catch (_) { }
      }
    }

    done()
  },
  emit (key, eKey, data, closure = null) {
    const socketClosures = this.$socket.get(key)
    
    if (!(socketClosures instanceof Map)) {
      if (T.func(closure)) {
        return closure()
      }
      return new Promise((resolve, reject) => resolve())
    }

    return T.func(closure)
      ? this._emit(closure, socketClosures, eKey, data)
      : new Promise(resolve => this._emit(resolve, socketClosures, eKey, data))
  },

  _checkSocket (socket) {
    return typeof socket._.hookId == 'number' && !isNaN(socket._.hookId) && socket._.hookId !== Infinity
  },
  // subscribe (socket, closure) {
  //   if (!this._checkSocket(socket)) {
  //     return this
  //   }
  //   const socketClosures = this.$socket.get(socket._.hookId) || new Map()
  //   socketClosures.set(socket, closure)
  //   this.$socket.set(socket._.hookId, socketClosures)
  //   return this
  // },
  // unsubscribe (socket) {
  //   if (!this._checkSocket(socket)) {
  //     return this
  //   }

  //   const socketClosures = this.$socket.get(socket._.hookId)
  //   if (!(socketClosures instanceof Map)) {
  //     return this
  //   }

  //   socketClosures.delete(socket)
  //   if (socketClosures.size != 0) {
  //     this.$socket.set(socket._.hookId, socketClosures)
  //   } else {
  //     this.$socket.delete(socket._.hookId)
  //   }
    
  //   return this
  // }
}
