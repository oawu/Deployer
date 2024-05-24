/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const moment    = require('moment')
const Queue     = require('@oawu/queue')
const Helper    = require('@oawu/_Helper')
const Dog       = require('@oawu/_Dog')
const { Model } = require('@oawu/mysql-orm')
const Path      = require('@oawu/_Path')
const HookEvent = require(`${Path.lib}HookEvent`)

const _func = {
  payloadActor: obj => {
    const ret = {
      actorName: '',
      actorNickname: '',
      actorAvatar: '',
      actorLink: '',
    }

    if (!Helper.Type.isObject(obj)) {
      return ret
    }

    if (Helper.Type.isString(obj.display_name))  {
      ret.actorName = obj.display_name
    }

    if (Helper.Type.isString(obj.nickname)) {
      ret.actorNickname = obj.nickname
    }

    if (Helper.Type.isObject(obj.links)
        && Helper.Type.isObject(obj.links.avatar)
        && Helper.Type.isString(obj.links.avatar.href)) {
      ret.actorAvatar = obj.links.avatar.href
    }

    if (Helper.Type.isObject(obj.links)
        && Helper.Type.isObject(obj.links.html)
        && Helper.Type.isString(obj.links.html.href)) {
      ret.actorLink = obj.links.html.href
    }

    return ret
  },
  payloadRepo: obj => {
    const ret = {
      repoFullname: '',
      repoName: '',
    }

    if (!Helper.Type.isObject(obj)) {
      return ret
    }

    if (Helper.Type.isString(obj.full_name)) {
      ret.repoFullname = obj.full_name
    }

    if (Helper.Type.isString(obj.name)) {
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

    if (!Helper.Type.isObject(obj)) {
      return ret
    }

    if (Helper.Type.isString(obj.name)) {
      ret.name = obj.name
    }

    if (!Helper.Type.isObject(obj.target)) {
      return ret
    }

    if (Helper.Type.isString(obj.target.hash)) {
      ret.hash = obj.target.hash
    }

    if (Helper.Type.isString(obj.target.message)) {
      ret.msg = obj.target.message
    }

    if (Helper.Type.isString(obj.target.date)) {
      const _moment = moment(obj.target.date, 'YYYY-MM-DDThh:mm:ssZ')

      if (_moment.isValid()) {
        ret.date = _moment.format('YYYY-MM-DD hh:mm:ss')
      }
    }

    if (Helper.Type.isObject(obj.target.author)
        && Helper.Type.isString(obj.target.author.raw)) {
      ret.author = obj.target.author.raw
    }

    if (Helper.Type.isObject(obj.target.links)
        && Helper.Type.isObject(obj.target.links.html)
        && Helper.Type.isString(obj.target.links.html.href)) {
      ret.link = obj.target.links.html.href
    }

    return ret
  },
}

module.exports = {
  index (request, response) {
    Queue()
      .enqueue((next, error = null) => {
        if (error) {
          return next(error)
        }

        const header = Helper.Json.encode(request.headers)
        const payload = Helper.Json.encode(this.json)

        if (header instanceof Error) {
          error = new Error(`解析 Header 失敗(1)，錯誤原因：${Helper.error(header)}`)
        }

        if (payload instanceof Error) {
          error = new Error(`解析 Payload 失敗(1)，錯誤原因：${Helper.error(payload)}`)
        }

        if (error) {
          return next(error)
        }

        next(null, header, payload)
      })
      .enqueue((next, error, header = null, payload = null) => {
        if (error) {
          return next(error)
        }

        Model.BitbucketHook.create({ errorMessage: '' }, (error, hook) => error
          ? next(new Error(`資料庫錯誤(1)，錯誤原因：${Helper.error(error)}`))
          : next(null, hook, header, payload))
      })

      .enqueue((next, error = null, hook = null, header = null, payload = null) => {
        if (error) {
          return next(error)
        }

        const dog = Dog().bite(food => food instanceof Error
          ? next(error)
          : next(null, hook, ...food))

        Promise.all([
          new Promise((resolve, reject) => {
            const headerJson = Helper.Json.decode(header)
            
            let error = null
            if (headerJson instanceof Error) {
              error = new Error(`解析 Header 失敗(2)，錯誤原因：${Helper.error(headerJson)}`)
            } else if (!Helper.Type.isObject(headerJson)) {
              error = new Error('Header 不是 object')
            } else if (!Helper.Type.isString(headerJson['x-event-key'])) {
              error = new Error('Header 中找不到 x-event-key')
            } else if (!Helper.Type.isString(headerJson['x-hook-uuid'])) {
              error = new Error('Header 中找不到 x-hook-uuid')
            } else if (!Helper.Type.isString(headerJson['x-request-uuid'])) {
              error = new Error('Header 中找不到 x-request-uuid')
            } else if (!Helper.Type.isString(headerJson['x-attempt-number'])) {
              error = new Error('Header 中找不到 x-attempt-number')
            } else if (isNaN(headerJson['x-attempt-number'])) {
              error = new Error('Header 的 x-attempt-number 不是整數')
            } else {
              error = null
            }

            if (error) {
              return reject(error)
            }

            const param = {
              bitbucketHookId: hook.id,
              raw:             header,
              eventKey:        headerJson['x-event-key'],
              uuidHook:        headerJson['x-hook-uuid'],
              uuidRequest:     headerJson['x-request-uuid'],
              attemptNumber:   headerJson['x-attempt-number'] * 1,
            }

            Model.BitbucketHookHeader.create(param, (error, header) => error
              ? reject(new Error(`資料庫錯誤(2)，錯誤原因: ${Helper.error(error)}`))
              : resolve(header))
          }),
          new Promise((resolve, reject) => {
            const payloadJson = Helper.Json.decode(payload)
            
            let error = null
            if (payloadJson instanceof Error) {
              error = new Error(`解析 Payload 失敗(2)，錯誤原因：${Helper.error(error)}`)
            } else if (!Helper.Type.isObject(payloadJson)) {
              error = new Error('Payload 不是 object')
            } else {
              error = null
            }

            if (error) {
              return reject(error)
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

            const { actorName, actorNickname, actorAvatar, actorLink } = _func.payloadActor(payloadJson.actor)
            param.actorName = actorName
            param.actorNickname = actorNickname
            param.actorAvatar = actorAvatar
            param.actorLink = actorLink
            
            const { repoFullname, repoName } = _func.payloadRepo(payloadJson.repository)
            param.repoFullname = repoFullname
            param.repoName = repoName

            hook.fullname = repoFullname
            
            if (Helper.Type.isObject(payloadJson.push) && Array.isArray(payloadJson.push.changes) && payloadJson.push.changes.length > 0 && Helper.Type.isObject(payloadJson.push.changes[payloadJson.push.changes.length - 1])) {

              const { name: chgNewName, hash: chgNewHash, date: chgNewDate, author: chgNewAuthor, link: chgNewLink, msg: chgNewMsg } = _func.payloadChg(payloadJson.push.changes[payloadJson.push.changes.length - 1].new)
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
              
              const { name: chgOldName, hash: chgOldHash, date: chgOldDate, author: chgOldAuthor, link: chgOldwLink, msg: chgOldMsg } = _func.payloadChg(payloadJson.push.changes[payloadJson.push.changes.length - 1].old)
              param.chgOldName = chgOldName
              param.chgOldHash = chgOldHash
              param.chgOldDate = chgOldDate
              param.chgOldAuthor = chgOldAuthor
              param.chgOldwLink = chgOldwLink
              param.chgOldMsg = chgOldMsg
            }

            Model.BitbucketHookPayload.create(param, (error, payload) => error
              ? reject(new Error(`資料庫錯誤(3)，錯誤原因: ${Helper.error(error)}`))
              : resolve(payload))
          }),
        ])
          .then(dog.eat)
          .catch(dog.eat)
      })
      .enqueue((next, error = null, hook = null, header = null, payload = null) => {
        if (error) {
          return next({ error, hook: null })
        }

        hook.token                  = Model.BitbucketHook.encodeId(hook.id)
        hook.bitbucketHookHeaderId  = header.id
        hook.bitbucketHookPayloadId = payload.id
        hook.status                 = Model.BitbucketHook.STATUS_PENDING

        hook.save((error, hook) => {
          if (error) {
            return next({ error: new Error(`資料庫錯誤(4)，錯誤原因: ${Helper.error(error)}`), hook: null })
          }
          next({ error: null, hook })
        })
      })
      .enqueue((next, { error, hook }) => {
        if (error) {
          response.output(Helper.error(error), 400)
          return next()
        }
        
        return HookEvent.emit(hook.id, 'hook', { error: null, data: hook.socketStruct }, _ => {
          response.output(`ok，token：${hook.token}`)
          next()
        })
      })
  },
}