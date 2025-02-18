/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const TelBot = require('node-telegram-bot-api')

const Config = require('@oawu/_Config')
const { Type: T, tryIgnore, Sigint } = require('@oawu/helper')

const _srcs = srcs => (T.arr(srcs) ? srcs : []).map(src => {
  if (!T.obj(src)) {
    return null
  }
  if (!T.num(src.message_id)) {
    return null
  }
  if (T.num(src.chat_id)) {
    return { chat_id: src.chat_id, message_id: src.message_id }
  }

  if (!T.obj(src.chat)) {
    return null
  }
  if (!T.num(src.chat.id)) {
    return null
  }
  return { chat_id: src.chat.id, message_id: src.message_id }
}).filter(t => t !== null)

const _Bot = {
  _bots: null,
  get bots() {
    if (!T.arr(this._bots)) {
      this._bots = Config.bot.tokens.map(token => new TelBot(token, { polling: true }))
      Sigint.push(async _ => await Promise.all(this._bots.map(bot => bot.stopPolling())))
    }
    return this._bots
  },
  _create: ({ chat, bot, text, opt }) => {
    const func = (resolve, reject) => bot.sendMessage(chat, text, opt).then(resolve).catch(error => T.obj(error) && T.obj(error.response) && T.num(error.response.statusCode) && error.response.statusCode == 429 && T.obj(error.response.body) && T.obj(error.response.body.parameters) && T.num(error.response.body.parameters.retry_after) && error.response.body.parameters.retry_after >= 0 ? setTimeout(_ => func(resolve, reject), error.response.body.parameters.retry_after * 1000 + 1) : reject(error))
    return new Promise(func)
  },
  _update: ({ bot, text, opt }) => {
    const func = (resolve, reject) => bot.editMessageText(text, opt).then(resolve).catch(error => T.obj(error) && T.obj(error.response) && T.num(error.response.statusCode) && error.response.statusCode == 429 && T.obj(error.response.body) && T.obj(error.response.body.parameters) && T.num(error.response.body.parameters.retry_after) && error.response.body.parameters.retry_after >= 0 ? setTimeout(_ => func(resolve, reject), error.response.body.parameters.retry_after * 1000 + 1) : reject(error))
    return new Promise(func)
  },
  async createMessage(text, chats = null, isIgnoreErrors = false) {
    if (T.bool(chats)) {
      isIgnoreErrors = chats
      chats = null
    }
    if (chats === null) {
      chats = Object.keys(Config.bot.chat)
    }
    if (T.str(chats)) {
      chats = [chats]
    }

    let results = []

    try {
      results = await Promise.all(chats
        .map(chat => Config.bot.chat[chat])
        .filter(chat => chat !== undefined)
        .map(chat => this.bots.map(bot => ({ chat, bot, text, opt: { parse_mode: 'html', link_preview_options: { prefer_small_media: false, prefer_large_media: false, url: null, is_disabled: true, show_above_text: false } } })))
        .reduce((a, b) => a.concat(b), [])
        .map(this._create))
    } catch (error) {
      results = []
      if (!isIgnoreErrors) {
        throw error
      }
    }

    return results
  },
  async updateMessage(text, srcs, isIgnoreErrors = false) {
    let results = []

    try {
      results = await Promise.all(_srcs(srcs)
        .map(({ chat_id, message_id }) => this.bots.map(bot => ({ bot, text, opt: { chat_id, message_id, parse_mode: 'html', link_preview_options: { prefer_small_media: false, prefer_large_media: false, url: null, is_disabled: true, show_above_text: false } } })))
        .reduce((a, b) => a.concat(b), [])
        .map(this._update))
    } catch (error) {
      results = []
      if (!isIgnoreErrors) {
        throw error
      }
    }

    return results
  }
}

const Telegram = function (enable = true) {
  if (!(this instanceof Telegram)) {
    return new Telegram(enable)
  }
  this._enable = true
  this._messages = []
  this._botResults = null
  this.enable(enable)
}
Telegram.prototype.enable = function (enable) {
  if (T.bool(enable)) {
    this._enable = enable
  }
  return this
}
Telegram.prototype.send = async function (isIgnoreErrors = true) {
  if (!this._enable) {
    return this
  }

  const text = this._messages
    .map(message => {
      if (message instanceof Telegram.Message) {
        return message.text(true)
      }
      if (message instanceof Telegram.Message.Status) {
        return message.data(true)
      }
      return null
    })
    .filter(text => text !== null)
    .join('\n')

  if (!T.arr(this._botResults)) {
    this._botResults = await _Bot.createMessage(text, isIgnoreErrors)
  } else {
    await _Bot.updateMessage(text, this._botResults, isIgnoreErrors)
  }
}
Telegram.prototype.push = async function (message, isIgnoreErrors = true) {
  if (T.err(message)) {
    message = Telegram.Message(message.message)
  }

  if (T.str(message)) {
    message = Telegram.Message(message)
  }

  if (message instanceof Telegram.Message || message instanceof Telegram.Message.Status) {
    message.telegram(this)
    this._messages.push(message)
    await this.send(isIgnoreErrors)
  }
  return message
}

// ==========

Telegram.Message = function (text, telegram = null) {
  if (!(this instanceof Telegram.Message)) {
    return new Telegram.Message(text, telegram)
  }
  this._telegram = telegram
  this._text = text
}
Telegram.Message.prototype.telegram = function (telegram) {
  if (telegram === null || telegram instanceof Telegram) {
    this._telegram = telegram
  }
  return this
}
Telegram.Message.prototype.toString = function () {
  return `${this.text(false)}`
}
Telegram.Message.prototype.text = function (tel = false) {
  return T.str(this._text) ? tel ? this._text : this._text.replace(/<\/?[^>]+(>|$)/ig, '') : null
}
Telegram.Message.prototype.update = async function (val, isIgnoreErrors = true) {
  this._text = T.str(val) ? val : null
  if (this._telegram) {
    await this._telegram.send(isIgnoreErrors)
  }
  return this
}

// ==========

Telegram.Message.Status = function (data, level = 0, telegram = null) {
  if (!(this instanceof Telegram.Message.Status)) {
    return new Telegram.Message.Status(data, level, telegram)
  }
  this._level = level
  this._data = data
  this._status = null
  this._telegram = telegram
}
Telegram.Message.Status.prototype.telegram = function (telegram) {
  if (telegram === null || telegram instanceof Telegram) {
    this._telegram = telegram
  }
  return this
}
Telegram.Message.Status.prototype.toString = function () {
  return `${this.data(false)}`
}
Telegram.Message.Status.prototype.prefix = function (icon = '↳ ') {
  return `${' '.repeat(this._level * 2)}${this._level ? '↳ ' : ''}`
}
Telegram.Message.Status.prototype.data = function (tel = false) {
  if (!T.str(this._data)) {
    return null
  }

  const text = tel
    ? `${this._data}`
    : `${this._data.replace(/<\/?[^>]+(>|$)/ig, '')}`

  if (!T.bool(this._status)) {
    return `${this.prefix()}${tel ? '⏳' : '[-]'} ${text}…`
  }

  if (this._status) {
    return `${this.prefix()}${tel ? '✅' : '[v]'} ${text}`
  }

  return `${this.prefix()}${tel ? '❌' : '[x]'} ${text}`
}
Telegram.Message.Status.prototype.update = async function (status, isIgnoreErrors = true) {
  this._status = T.bool(status) ? status : null
  if (this._telegram) {
    await this._telegram.send(isIgnoreErrors)
  }
  return this
}

// ==========

Telegram.prototype.task = async function (level, title, func, ...params) {
  const message = Telegram.Message.Status(title, level)
  await this.push(message)

  process.stdout.write(`${message}\n`)

  let result = null

  if (T.asyncFunc(func)) {
    try {
      result = await func.call(message, message, ...params)
    } catch (error) {
      result = error
    }
  } else if (T.func(func)) {
    try {
      result = func.call(message, message, ...params)
    } catch (error) {
      result = error
    }
  } else if (T.promise(func)) {
    try {
      result = await func
    } catch (error) {
      result = error
    }
  } else {
    result = func
  }

  await message.update(!(result === false || T.err(result)))
  process.stdout.write(`${message}\n`)

  if (T.err(result)) {
    throw result
  }

  return result
}

// ==========

Telegram.Topic = async (...params) => {
  let telegram = null
  let enable = true
  const strs = []

  const el0 = params.shift()
  if (el0 instanceof Telegram) {
    telegram = el0
  }
  if (T.str(el0)) {
    strs.push(el0)
  }
  if (T.bool(el0)) {
    enable = el0
  }

  const el1 = params.shift()
  if (el1 instanceof Telegram) {
    telegram = el1
  }
  if (T.str(el1)) {
    strs.push(el1)
  }
  if (T.bool(el1)) {
    enable = el1
  }

  strs.push(...params.filter(t => T.str(t)))

  const text = strs.shift()

  if (telegram instanceof Telegram) {
    const message = Telegram.Message(`\n【${text}】\n${'-'.repeat(20)}${strs.length ? `\n${strs.join('\n')}` : ''}`)
    await telegram.push(message)
    process.stdout.write(`${message}\n`)
  } else {
    telegram = Telegram(enable)
    const message = Telegram.Message(`【${text}】\n${'-'.repeat(20)}${strs.length ? `\n${strs.join('\n')}` : ''}`)
    await telegram.push(message)
    process.stdout.write(`${message}\n`)
  }

  return telegram
}

module.exports = Telegram
