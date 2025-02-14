/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const SocketIO = require('socket.io')
// const Helper    = require('@oawu/_Helper')
// const { Model } = require('@oawu/mysql-orm')
// const Path      = require('@oawu/_Path')
// const HookEvent = require(`${Path.lib}HookEvent`)

// const SID = new Map()

// const disconnect = socket => {
//   const sid = socket._.sid
//   SID.delete(sid)
//   HookEvent.unsubscribe(socket)
//   Helper.print('SOCKET', '斷線', sid, socket.handshake.headers.token || '?', SID.size)
// }

module.exports = {
  create: async http => {

    let server = SocketIO(http, { path: '/hook-ui/', cors: { origin: '*' }})

    server.sockets.on('connection', socket => {
    //   socket.on('disconnect', _ => disconnect(socket))

    //   socket._ = {
    //     sid: socket.conn.id,
    //     hookId: null,
    //     token: null,
    //   }

    //   SID.set(socket._.sid, socket)

    //   Helper.print('SOCKET', '連線', socket._.sid, socket.handshake.headers.token || '?', SID.size)

    //   if (socket.handshake.headers.token === undefined) {
    //     return disconnect(socket, socket.disconnect())
    //   }

    //   if (!(typeof socket.handshake.headers.token == 'string' && socket.handshake.headers.token !== '')) {
    //     return disconnect(socket, socket.disconnect())
    //   }

    //   let id = Model.BitbucketHook.decodeToken(socket.handshake.headers.token)

    //   if (id instanceof Error) {
    //     socket.emit('db-error', `Token 錯誤，錯誤原因：${Helper.error(id)}`)
    //     id = 0
    //   }

    //   socket._.token = socket.handshake.headers.token
    //   socket._.hookId = id

    //   HookEvent.subscribe(socket, (key, { error, data }) => socket.emit(key, error ? Helper.error(error) : data))

    //   socket.on('hook', _ => {
    //     Model.BitbucketHook
    //     .where('id', socket._.hookId)
    //     .one((error, hook) => {
    //       if (error) {
    //         return HookEvent.emit(socket._.hookId, 'db-error', { error, data: null })
    //       }
    //       if (hook) {
    //         return HookEvent.emit(hook.id, 'hook', { error: null, data: hook.socketStruct })
    //       }
    //       return HookEvent.emit(socket._.hookId, 'hook', { error: null, data: null })
    //     })
    //   })

    //   socket.on('logs', _ => Model.BitbucketHookLog
    //     .where('bitbucketHookId', socket._.hookId)
    //     .order('id DESC')
    //     .all((error, logs) => error
    //       ? HookEvent.emit(socket._.hookId, 'db-error', { error, data: null })
    //       : HookEvent.emit(socket._.hookId, 'logs', { error: null, data: logs.map(log => log.socketStruct) })))
    })
  }
}