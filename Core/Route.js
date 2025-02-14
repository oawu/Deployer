/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const URL        = require('url')
const http       = require('http')
const FileSystem = require('fs')
const uuid       = require('uuid')
const { Json, Type: T } = require('@oawu/helper') 

const { log }     = require('@oawu/_Helper')
const Path       = require('@oawu/_Path')

let _page404 = null
let _crosHeaders = []
const _id_Data_Map = new Map()

const _output = data => (body, code = null) => {
  if (!(T.obj(data) && _id_Data_Map.has(data.id))) {
    return
  } else {
    _id_Data_Map.delete(data.id)
  }

  let header = { 'Content-Type': 'text/html; charset=UTF-8' }

  if (body === null || body === undefined) { body = '' }

  if (body instanceof Error) {
    const _body = {}

    _body.message = body.message

    if (body.cause !== undefined) {
      if (body.cause instanceof Error && T.neStr(body.cause.message)) {
        _body.cause = body.cause.message
      }
      if (T.neStr(body.cause)) {
        _body.cause = body.cause
      }
    }

    _body.stack = body.stack.split("\n")

    body = _body

    if (code === null) { code = 400 }
  }

  if (T.num(body)) {
    body = `${body}`
  }

  if (T.bool(body)) {
    body = body ? 'true' : 'false'
  }

  if (T.func(body)) {
    body = ''
  }

  if (T.obj(body) || T.arr(body)) {
    const text = Json.encode(body)

    if (T.error(text)) {
      body = text.message
      if (code === null) { code = 400 }
    } else {
      header = { 'Content-Type': 'application/json; charset=UTF-8' }
      body = text
    }
  }

  code = code !== null ? code : 200

  data.response.writeHead(code, { ..._crosHeaders, ...header })
  data.response.write(body)
  data.response.end()
  data.log('Http', '←', data.id, `[${data.method}]${data.pathname}(${code})`)

  data = null
}

// 轉換 name => controller
const _parseController = name => {
  let [file, ...tokens] = name.split('@')

  if (file === '') {
    return null
  }

  if (!tokens.length) {
    tokens = ['index']
  }

  return {
    type: 'controller',
    file: `${Path.controller}${file}.js`,
    func: tokens.join(''),
  }
}
const _parseFunc = func => {
  return {
    type: 'function',
    func
  }
}

// 錯誤頁面
const _error = (output, error = null) => output(error, 500)

// 預設 404 結果
const _d404 = output => output('🤷‍♀️', 404)

// 執行
const _exec = (func, data, output) => {
  if (T.func(func)) {
    try {
      output(func.call(data, data, output))
    } catch (error) {
      output(error, 400)
    }
  }

  if (T.asyncFunc(func)) {
    func.call(data, data, output)
      .then(result => output(result))
      .catch(error => output(error, 400))
  }
  if (T.promise(func)) {
    func
      .then(result => output(result))
      .catch(error => output(error, 400))
  }
}

const _dispatch = (info, data) => {
  const output = _output(data)

  if (!info) { // 找不到對應的 router
    return _d404(output)
  }

  if (info.type == 'function') {
    return T.func(info.func) || T.asyncFunc(info.func)
      ? _exec(info.func, data, output)
      : _d404(output)
  }

  if (info.type != 'controller') {
    return _d404(output)
  }

  // 讀取 controller
  return FileSystem.exists(info.file, exists => {
    if (!exists) {
      return _d404(output)
    }

    // 引入 controller
    let controller = null
    let error = null
    try {
      controller = require(info.file)
      error = null
    } catch(e) {
      error = e
      controller = null
    }

    if (error !== null) {
      return _error(output, error)
    }

    if (controller === null) {
      return _d404(output)
    }

    T.func(controller[info.func]) || T.asyncFunc(controller[info.func])
      ? _exec(controller[info.func], data, output)
      : _d404(output)
  })
}

const _parse = (method, pathname, url) => {
  // 找出 request 是符合哪個 router
  let router = null
  let params = null
  
  const routers = ['get', 'post', 'put', 'delete', 'options'].includes(method)
    ? Router[method]
    : []

  for (const [segment, r] of routers) {
    let result = (new RegExp('^' + segment + '$', 'g')).exec(pathname)

    if (result !== null) {
      router = r
      params = result.groups || null
    }
  }

  let _query = T.str(url._query) ? url._query : ''
  const query = {}

  _query = _query.split('&').map(token => token.split('=')).map(([key, ...vs]) => {
    return { key, val: vs.join('=') }
  }).filter(({ key }) => key !== '')

  for (const { key, val } of _query) {
    query[key] = val
  }

  return { router, params, query }
}

// 分配
const dispatch = (request, response) => {
  const url = URL.parse(request.url)
  const id = uuid.v4()
  const method = request.method.toLowerCase()
  const pathname = url.pathname.replace(/\/+/gm, '/').replace(/\/$|^\//gm, '')
  const { router, param, query } = _parse(method, pathname, url)
  
  // 取得、整理 request body
  const _param = []
  request.on('data', chunk => _param.push(chunk))
  request.on('end', _ => {
    const input = Buffer.concat(_param).toString('utf8')
    const _json = Json.decode(input)
    const json = T.error(_json) ? null : _json

    const data = {
      id,
      method,
      get header () {
        return this.request.headers
      },
      pathname,
      param,
      query,
      input,
      json,
      request,
      response,
      log
    }

    _id_Data_Map.set(id, data)

    _dispatch(
      router
        ? router._info
        : _page404,
      data)
  })
}

// 路徑允許規則別名
const regxPattern = {
  id: '[0-9]+',
  any: '[^/]+',
  num: '-?[0-9](.[0-9]+)?',
}

// Router
const Router = function(method, segment = '') {
  if (!(this instanceof Router)) {
    return new Router(method, segment)
  }

  this._info = null

  this.segment = null

  segment = segment.replace(/^[\/\s]+|[\/\s]+$/g, '').replace('*', '.*')
  for (const key in regxPattern) {
    segment = segment.replace(new RegExp(':\\s*' + key, 'g'), ':' + regxPattern[key])
  }

  this.segment = segment.replace(/\((\w+?)\s*:/g, '(?<$1>')

  Router.all.set(this.segment, this)
  if (method == 'get') {
    Router.get.set(this.segment, this)
  }
  if (method == 'post') {
    Router.post.set(this.segment, this)
  }
  if (method == 'put') {
    Router.put.set(this.segment, this)
  }
  if (method == 'delete') {
    Router.delete.set(this.segment, this)
  }
  if (method == 'options') {
    Router.options.set(this.segment, this)
  }
}

Router.all     = new Map()
Router.get     = new Map()
Router.post    = new Map()
Router.put     = new Map()
Router.delete  = new Map()
Router.options = new Map()

Router.prototype.func = function(func) {
  this._info = _parseFunc(func)
  return this
}
Router.prototype.controller = function(name) {
  this._info = _parseController(name)
  return this
}

module.exports = {
  dispatch,
  page404: {
    controller(name) {
      _page404 = _parseController(name)
    },
    func(func) {
      _page404 = _parseFunc(func)
    }
  },
  cros: {
    set headers (headers) {
      if (!Array.isArray(headers)) {
        return
      }

      const tmp = {}
      for (const { key, val } of headers.filter(header => T.obj(header)).filter(({ key = '', val = '' }) => T.neStr(key) && T.str(val))) {
        tmp[key] = val
      }

      _crosHeaders = tmp
    },
    get headers () {
      return _crosHeaders
    }
  },
  get: segment => new Router('get', segment),
  post: segment => new Router('post', segment),
  put: segment => new Router('put', segment),
  delete: segment => new Router('delete', segment),
  options: segment => new Router('options', segment),
}
