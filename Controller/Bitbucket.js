/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const moment    = require('moment')
const { Model } = require('@oawu/mysql-orm')

const { Type: T, Json }         = require('@oawu/helper')

// const Path      = require('@oawu/_Path')
// const HookEvent = require(`${Path.lib}HookEvent`)
// const DeployStep = require(`${Path.lib}DeployStep`)

const _parse = {
  header: async (hook, _header) => {
    const header = Json.decode(_header)

    if (T.error(header)) { throw new Error(`解析 Header 失敗(2)`, { cause: header }) }
    if (!T.obj(header)) { throw new Error('Header 不是 object') }
    if (!T.str(header['x-event-key'])) { throw new Error('Header 中找不到 x-event-key') }
    if (!T.str(header['x-hook-uuid'])) { throw new Error('Header 中找不到 x-hook-uuid') }
    if (!T.str(header['x-request-uuid'])) { throw new Error('Header 中找不到 x-request-uuid') }
    if (!T.str(header['x-attempt-number'])) { throw new Error('Header 中找不到 x-attempt-number') }
    if (isNaN(header['x-attempt-number'])) { throw new Error('Header 的 x-attempt-number 不是整數') }

    const param = {
      bitbucketHookId: hook.id,
      raw:             _header,
      eventKey:        header['x-event-key'],
      uuidHook:        header['x-hook-uuid'],
      uuidRequest:     header['x-request-uuid'],
      attemptNumber:   header['x-attempt-number'] * 1,
    }

    return await Model.BitbucketHookHeader.create(param)
  },
  payload: async (hook, payload) => {
    const payloadJson = Json.decode(payload)
    
    if (T.error(payloadJson)) {
      throw new Error(`解析 Payload 失敗(2)`, { cause: payloadJson })
    }
    if (!T.obj(payloadJson)) {
      throw new Error('Payload 不是 object')
    }

    const param = {
      bitbucketHookId: hook.id,
      raw:             payload,
      actorName:       '',
      actorNickname:   '',
      actorAvatar:     '',
      actorLink:       '',
      
      repoFullname:    '',
      repoName:        '',

      chgOldName:      '',
      chgOldHash:      '',
      chgOldDate:      null,
      chgOldAuthor:    '',

      chgNewName:      '',
      chgNewHash:      '',
      chgNewDate:      null,
      chgNewAuthor:    '',
    }

    const { actorName, actorNickname, actorAvatar, actorLink } = _parse.payloadActor(payloadJson.actor)
    param.actorName = actorName
    param.actorNickname = actorNickname
    param.actorAvatar = actorAvatar
    param.actorLink = actorLink
    
    const { repoFullname, repoName } = _parse.payloadRepo(payloadJson.repository)
    param.repoFullname = repoFullname
    param.repoName = repoName

    hook.fullname = repoFullname
              
    if (T.obj(payloadJson.push) && Array.isArray(payloadJson.push.changes) && payloadJson.push.changes.length > 0 && T.obj(payloadJson.push.changes[payloadJson.push.changes.length - 1])) {
      const { name: chgNewName, hash: chgNewHash, date: chgNewDate, author: chgNewAuthor, link: chgNewLink, msg: chgNewMsg } = _parse.payloadChg(payloadJson.push.changes[payloadJson.push.changes.length - 1].new)
      param.chgNewName = chgNewName
      param.chgNewHash = chgNewHash
      param.chgNewDate = chgNewDate
      param.chgNewAuthor = chgNewAuthor
      param.chgNewLink = chgNewLink
      param.chgNewMsg = chgNewMsg

      hook.commitBranch = chgNewName
      hook.commitHash = chgNewHash
      hook.commitDate = chgNewDate
      hook.commitAuthor = chgNewAuthor
      
      const { name: chgOldName, hash: chgOldHash, date: chgOldDate, author: chgOldAuthor, link: chgOldwLink, msg: chgOldMsg } = _parse.payloadChg(payloadJson.push.changes[payloadJson.push.changes.length - 1].old)
      param.chgOldName = chgOldName
      param.chgOldHash = chgOldHash
      param.chgOldDate = chgOldDate
      param.chgOldAuthor = chgOldAuthor
      param.chgOldwLink = chgOldwLink
      param.chgOldMsg = chgOldMsg
    }

    return await Model.BitbucketHookPayload.create(param)
  },
  payloadActor: obj => {
    const ret = {
      actorName: '',
      actorNickname: '',
      actorAvatar: '',
      actorLink: '',
    }

    if (!T.obj(obj)) {
      return ret
    }

    if (T.str(obj.display_name))  {
      ret.actorName = obj.display_name
    }

    if (T.str(obj.nickname)) {
      ret.actorNickname = obj.nickname
    }

    if (T.obj(obj.links)
        && T.obj(obj.links.avatar)
        && T.str(obj.links.avatar.href)) {
      ret.actorAvatar = obj.links.avatar.href
    }

    if (T.obj(obj.links)
        && T.obj(obj.links.html)
        && T.str(obj.links.html.href)) {
      ret.actorLink = obj.links.html.href
    }

    return ret
  },
  payloadRepo: obj => {
    const ret = {
      repoFullname: '',
      repoName: '',
    }

    if (!T.obj(obj)) {
      return ret
    }

    if (T.str(obj.full_name)) {
      ret.repoFullname = obj.full_name
    }

    if (T.str(obj.name)) {
      ret.repoName = obj.name
    }

    return ret
  },
  payloadChg: obj => {
    const ret = {
      name: '',
      hash: '',
      date: null,
      author: '',
      link: '',
      msg: '',
    }

    if (!T.obj(obj)) {
      return ret
    }

    if (T.str(obj.name)) {
      ret.name = obj.name
    }

    if (!T.obj(obj.target)) {
      return ret
    }

    if (T.str(obj.target.hash)) {
      ret.hash = obj.target.hash
    }

    if (T.str(obj.target.message)) {
      ret.msg = obj.target.message
    }

    if (T.str(obj.target.date)) {
      const _moment = moment(obj.target.date, 'YYYY-MM-DDThh:mm:ssZ')

      if (_moment.isValid()) {
        ret.date = _moment.format('YYYY-MM-DD hh:mm:ss')
      }
    }

    if (T.obj(obj.target.author)
        && T.str(obj.target.author.raw)) {
      ret.author = obj.target.author.raw
    }

    if (T.obj(obj.target.links)
        && T.obj(obj.target.links.html)
        && T.str(obj.target.links.html.href)) {
      ret.link = obj.target.links.html.href
    }

    return ret
  },
}

module.exports = {
  async index (data) {
    const _header = Json.encode(data.header)
    if (T.error(_header)) {
      throw new Error(`解析 Header 失敗(1)`, { cause: _header })
    }

    const _payload = Json.encode(data.json)
    if (T.error(_payload)) {
      throw new Error(`解析 Payload 失敗(1)`, { cause: _payload })
    }

    const hook = await Model.BitbucketHook.create()

    const [header, payload] = await Promise.all([
      _parse.header(hook, _header),
      _parse.payload(hook, _payload),
    ])

    hook.token                  = Model.BitbucketHook.encodeId(hook.id)
    hook.bitbucketHookHeaderId  = header.id
    hook.bitbucketHookPayloadId = payload.id
    hook.status                 = Model.BitbucketHook.STATUS_PENDING

    await hook.save()

    Model.Workflow.start(hook, header, payload)
    
    return `ok，token：${hook.token}`
  },
}





// const Queue     = require('@oawu/queue')
// const Dog       = require('@oawu/dog')

    
    // Queue()
    //   .enqueue((next, error = null) => {
    //     if (error) {
    //       return next(error)
    //     }

    //     const header = Helper.Json.encode(request.headers)
    //     const payload = Helper.Json.encode(this.json)


    //     if (error) {
    //       return next(error)
    //     }

    //     next(null, header, payload)
    //   })

    //   .enqueue((next, error, header = null, payload = null) => {
    //     if (error) {
    //       return next(error)
    //     }

    //     Model.BitbucketHook.create({ errorMessage: '' }, (error, hook) => error
    //       ? next(new Error(`資料庫錯誤(1)，錯誤原因：${Helper.error(error)}`))
    //       : next(null, hook, header, payload))
    //   })

    //   .enqueue((next, error = null, hook = null, header = null, payload = null) => {
    //     if (error) {
    //       return next(error)
    //     }

    //     const dog = Dog().bite(food => food instanceof Error
    //       ? next(error)
    //       : next(null, hook, ...food))

    //     Promise.all([
    //       new Promise((resolve, reject) => {
    //         const headerJson = Helper.Json.decode(header)
            
    //         let error = null
    //         if (headerJson instanceof Error) {
    //           error = new Error(`解析 Header 失敗(2)，錯誤原因：${Helper.error(headerJson)}`)
    //         } else if (!T.obj(headerJson)) {
    //           error = new Error('Header 不是 object')
    //         } else if (!T.str(headerJson['x-event-key'])) {
    //           error = new Error('Header 中找不到 x-event-key')
    //         } else if (!T.str(headerJson['x-hook-uuid'])) {
    //           error = new Error('Header 中找不到 x-hook-uuid')
    //         } else if (!T.str(headerJson['x-request-uuid'])) {
    //           error = new Error('Header 中找不到 x-request-uuid')
    //         } else if (!T.str(headerJson['x-attempt-number'])) {
    //           error = new Error('Header 中找不到 x-attempt-number')
    //         } else if (isNaN(headerJson['x-attempt-number'])) {
    //           error = new Error('Header 的 x-attempt-number 不是整數')
    //         } else {
    //           error = null
    //         }

    //         if (error) {
    //           return reject(error)
    //         }

    //         const param = {
    //           bitbucketHookId: hook.id,
    //           raw:             header,
    //           eventKey:        headerJson['x-event-key'],
    //           uuidHook:        headerJson['x-hook-uuid'],
    //           uuidRequest:     headerJson['x-request-uuid'],
    //           attemptNumber:   headerJson['x-attempt-number'] * 1,
    //         }

    //         Model.BitbucketHookHeader.create(param, (error, header) => error
    //           ? reject(new Error(`資料庫錯誤(2)，錯誤原因: ${Helper.error(error)}`))
    //           : resolve(header))
    //       }),
    //       new Promise((resolve, reject) => {
    //         const payloadJson = Helper.Json.decode(payload)
            
    //         let error = null
    //         if (payloadJson instanceof Error) {
    //           error = new Error(`解析 Payload 失敗(2)，錯誤原因：${Helper.error(error)}`)
    //         } else if (!T.obj(payloadJson)) {
    //           error = new Error('Payload 不是 object')
    //         } else {
    //           error = null
    //         }

    //         if (error) {
    //           return reject(error)
    //         }

    //         const param = {
    //           bitbucketHookId: hook.id,
    //           raw:             payload,
    //           actorName:       '',
    //           actorNickname:   '',
    //           actorAvatar:     '',
    //           actorLink:       '',
              
    //           repoFullname:    '',
    //           repoName:        '',

    //           chgOldName:      '',
    //           chgOldHash:      '',
    //           chgOldDate:      null,
    //           chgOldAuthor:    '',

    //           chgNewName:      '',
    //           chgNewHash:      '',
    //           chgNewDate:      null,
    //           chgNewAuthor:    '',
    //         }

    //         const { actorName, actorNickname, actorAvatar, actorLink } = _func.payloadActor(payloadJson.actor)
    //         param.actorName = actorName
    //         param.actorNickname = actorNickname
    //         param.actorAvatar = actorAvatar
    //         param.actorLink = actorLink
            
    //         const { repoFullname, repoName } = _func.payloadRepo(payloadJson.repository)
    //         param.repoFullname = repoFullname
    //         param.repoName = repoName

    //         hook.fullname = repoFullname
            
    //         if (T.obj(payloadJson.push) && Array.isArray(payloadJson.push.changes) && payloadJson.push.changes.length > 0 && T.obj(payloadJson.push.changes[payloadJson.push.changes.length - 1])) {

    //           const { name: chgNewName, hash: chgNewHash, date: chgNewDate, author: chgNewAuthor, link: chgNewLink, msg: chgNewMsg } = _func.payloadChg(payloadJson.push.changes[payloadJson.push.changes.length - 1].new)
    //           param.chgNewName = chgNewName
    //           param.chgNewHash = chgNewHash
    //           param.chgNewDate = chgNewDate
    //           param.chgNewAuthor = chgNewAuthor
    //           param.chgNewLink = chgNewLink
    //           param.chgNewMsg = chgNewMsg

    //           hook.commitBranch = chgNewName
    //           hook.commitHash = chgNewHash
    //           hook.commitDate = chgNewDate
    //           hook.commitAuthor = chgNewAuthor
              
    //           const { name: chgOldName, hash: chgOldHash, date: chgOldDate, author: chgOldAuthor, link: chgOldwLink, msg: chgOldMsg } = _func.payloadChg(payloadJson.push.changes[payloadJson.push.changes.length - 1].old)
    //           param.chgOldName = chgOldName
    //           param.chgOldHash = chgOldHash
    //           param.chgOldDate = chgOldDate
    //           param.chgOldAuthor = chgOldAuthor
    //           param.chgOldwLink = chgOldwLink
    //           param.chgOldMsg = chgOldMsg
    //         }

    //         Model.BitbucketHookPayload.create(param, (error, payload) => error
    //           ? reject(new Error(`資料庫錯誤(3)，錯誤原因: ${Helper.error(error)}`))
    //           : resolve(payload))
    //       }),
    //     ])
    //       .then(dog.eat)
    //       .catch(dog.eat)
    //   })
    //   .enqueue((next, error = null, hook = null, header = null, payload = null) => {
    //     if (error) {
    //       return next({ error, hook: null })
    //     }

    //     hook.token                  = Model.BitbucketHook.encodeId(hook.id)
    //     hook.bitbucketHookHeaderId  = header.id
    //     hook.bitbucketHookPayloadId = payload.id
    //     hook.status                 = Model.BitbucketHook.STATUS_PENDING

    //     hook.save((error, hook) => {
    //       if (error) {
    //         return next({ error: new Error(`資料庫錯誤(4)，錯誤原因: ${Helper.error(error)}`), hook: null })
    //       }
    //       next({ error: null, hook })
    //     })
    //   })

    //   .enqueue((next, { error, hook }) => {
    //     if (error) {
    //       response.output(Helper.error(error), 400)
    //       return next()
    //     }
        
    //     return HookEvent.emit(hook.id, 'hook', { error: null, data: hook.socketStruct }, _ => {
    //       response.output(`ok，token：${hook.token}`)
    //       next()
    //     })
    //   })