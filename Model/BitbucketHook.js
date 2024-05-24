/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Hashids   = require('hashids/cjs')

const { Model } = require('@oawu/mysql-orm')
const Dog       = require('@oawu/dog')

const Path      = require('@oawu/_Path')
const Config    = require('@oawu/_Config')
const Helper    = require('@oawu/_Helper')

const HookEvent = require(`${Path.lib}HookEvent`)

const hashids   = new Hashids(typeof Config.salt == 'string' ? Config.salt : '', 10, 'abcdefhijkmnprstuvwxyz2345678')

const BitbucketHook = function() {}

BitbucketHook.STATUS_STRUCTURING = 'structuring'
BitbucketHook.STATUS_PENDING     = 'pending'
BitbucketHook.STATUS_PROCESSING  = 'processing'
BitbucketHook.STATUS_PASS        = 'pass'
BitbucketHook.STATUS_SUCCESS     = 'success'
BitbucketHook.STATUS_FAILURE     = 'failure'

BitbucketHook.STATUS = {}
BitbucketHook.STATUS[BitbucketHook.STATUS_STRUCTURING] = '資料化中'
BitbucketHook.STATUS[BitbucketHook.STATUS_PENDING]     = '等待處理'
BitbucketHook.STATUS[BitbucketHook.STATUS_PROCESSING]  = '處理中'
BitbucketHook.STATUS[BitbucketHook.STATUS_PASS]        = '忽略'
BitbucketHook.STATUS[BitbucketHook.STATUS_SUCCESS]     = '成功'
BitbucketHook.STATUS[BitbucketHook.STATUS_FAILURE]     = '失敗'

Object.defineProperty(BitbucketHook.prototype, 'socketStruct', {
  get () {
    return {
      id: this.id,
      name: this.fullname,
      status: this.status,
      branch: this.commitBranch,
      author: this.commitAuthor,
      date: this.commitDate.value,
      error: this.errorMessage,
      time: {
        s: Number.parseFloat(this.sTime).toFixed(3) * 1,
        e: Number.parseFloat(this.eTime).toFixed(3) * 1,
        d: Number.parseFloat(this.dTime).toFixed(3) * 1,
      },
    }
  }
})

BitbucketHook.encodeId = id => hashids.encode(id)
BitbucketHook.decodeToken = token => {
  let id = null
  try {
    id = hashids.decode(token)[0]
  } catch (error) {
    id = error
  }

  return id
}

BitbucketHook.prototype.done = function(func) {
  if (this.sTime !== null) {
    this.eTime = Date.now() / 1000
    this.dTime = Math.max(this.eTime - this.sTime, 0)
  }

  this.status = BitbucketHook.STATUS_SUCCESS
  this.errorMessage = ''

  return this.save((error, hook) => {
    if (error) {
      if (typeof func == 'function') {
        func(error, null)
      }
      return
    }

    HookEvent.emit(this.id, 'hook', { error: null, data: hook.socketStruct }, _ => {
      if (typeof func == 'function') {
        func(null, hook)
      }
    })
  })
}
BitbucketHook.prototype.fail = function(error, func) {
  if (this.sTime !== null) {
    this.eTime = Date.now() / 1000
    this.dTime = Math.max(this.eTime - this.sTime, 0)
  }

  this.status = BitbucketHook.STATUS_FAILURE
  this.errorMessage = Helper.error(error)

  return this.save((error, hook) => {
    if (error) {
      if (typeof func == 'function') {
        func(error, null)
      }
      return
    }

    HookEvent.emit(this.id, 'hook', { error: null, data: hook.socketStruct }, _ => {
      if (typeof func == 'function') {
        func(null, hook)
      }
    })
  })
}

BitbucketHook.prototype.createLogAndNotify = function(title, func) {
  Model.BitbucketHookLog.create({
    title,
    bitbucketHookId: this.id,
    output: '',
    status: Model.BitbucketHookLog.STATUS_ING,
    sTime: Date.now() / 1000,
  }, (error, log) => {
    if (error) {
      if (typeof func == 'function') {
        func(null)
      }
      return
    }

    HookEvent.emit(this.id, 'log', { error: null, data: log.socketStruct }, _ => {
      if (typeof func == 'function') {
        func(log)
      }
    })
  })

  return this
}
BitbucketHook.prototype.logDoneAndNotify = function(log, output = null, func = null) {
  if (typeof output == 'function') {
    func = output
    output = ''
  }
  if (typeof output != 'string') {
    output = ''
  }

  if (!log) {
    if (typeof func == 'function') {
      func(null, null)
    }
    return this
  }

  if (log.sTime !== null) {
    log.eTime = Date.now() / 1000
    log.dTime = Math.max(log.eTime - log.sTime, 0)
  }
  
  log.output = output
  log.status = Model.BitbucketHookLog.STATUS_DONE
  log.save((error, log) => {
    if (error) {
      if (typeof func == 'function') {
        func(null)
      }
      return
    }

    HookEvent.emit(this.id, 'log', { error: null, data: log.socketStruct }, _ => {
      if (typeof func == 'function') {
        func(log)
      }
    })
  })

  return this
}

BitbucketHook.prototype.logFailAndNotify = function(log, output = null, func = null) {
  if (typeof output == 'function') {
    func = output
    output = ''
  }
  if (typeof output != 'string') {
    output = ''
  }

  if (!log) {
    if (typeof func == 'function') {
      func()
    }
    return this
  }

  if (log.sTime !== null) {
    log.eTime = Date.now() / 1000
    log.dTime = Math.max(log.eTime - log.sTime, 0)
  }
  
  log.output = output
  log.status = Model.BitbucketHookLog.STATUS_FAIL
  log.save((error, log) => {
    if (error) {
      if (typeof func == 'function') {
        func(null)
      }
      return
    }
    
    HookEvent.emit(this.id, 'log', { error: null, data: log.socketStruct }, _ => {
      if (typeof func == 'function') {
        func(log)
      }
    })
  })

  return this
}

module.exports = BitbucketHook
