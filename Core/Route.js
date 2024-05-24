/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Path = require('@oawu/_Path')
const URL        = require('url')
const http       = require('http')
const FileSystem = require('fs')
const uuid       = require('uuid')
const Helper     = require('@oawu/_Helper')

let _page404 = null
let _crosHeaders = []

// 新增 Response method
http.ServerResponse.prototype.output = function(body, code = 200) {
  let header = { 'Content-Type': 'text/html; charset=UTF-8' }

  if (body === null || body === undefined) {
    body = ''
  }

  if (body instanceof Error) {
      code = 400
      body = { message: body.message, stack: body.stack.split("\n") }
  }

  if (typeof body == 'object') {
    const text = Helper.Json.encode(body)

    if (text instanceof Error) {
      code = 400
      body = text.message
    } else {
      header = { 'Content-Type': 'application/json; charset=UTF-8' }
      body = text
    }
  }

  this.writeHead(code, { ..._crosHeaders, ...header })
  this.write(body)
  this.end()

  Helper.print('Http', this._.rid, `[${this._.method}]${this._.pathname}(${code})`)
  return this
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
const _error = (response, error = null) => {
  response.output(error, 500)
}

// 預設 404 結果
const _d404 = response => {
  response.output('🤷‍♀️', 404)
}

// 執行
const _extc = (info, request, response) => {
  if (!info) { // 找不到對應的 router
    return _d404(response)
  }

  if (info.type == 'function') {

    if (typeof info.func != 'function') {
      return _d404(response)
    }

    return info.func.call({
      params: request._.params,
      queries: request._.queries,
      input: request._.input,
      json: request._.json
    }, request, response, Helper.print)
  }

  if (info.type != 'controller') {
    return _d404(response)
  }

  // 讀取 controller
  return FileSystem.exists(info.file, exists => {
    if (!exists) {
      return _d404(response)
    }

    // 引入 controller
    let result = null
    let error = null
    try {
      result = require(info.file)
      error = null
    } catch(e) {
      error = e
      result = null
    }

    if (error !== null) {
      return _error(response, error)
    }

    if (result === null) {
      return _d404(response)
    }

    if (typeof result[info.func] != 'function') {
      return _d404(response)
    }

    // 執行 controller
    return result[info.func].call({
      params: request._.params,
      queries: request._.queries,
      input: request._.input,
      json: request._.json
    }, request, response, Helper.print)
  })
}

// 分配
const dispatch = (request, response) => {
  const url = URL.parse(request.url)
  const rid = uuid.v4()
  const method = request.method.toLowerCase()
  const pathname = url.pathname.replace(/\/+/gm, '/').replace(/\/$|^\//gm, '')
  
  let query = typeof url.query == 'string' ? url.query : ''
  const queries = {}

  query = query.split('&').map(token => token.split('=')).map(([key, ...vs]) => {
    return { key, val: vs.join('=') }
  }).filter(({ key }) => key !== '')

  for (const {key, val} of query) {
    queries[key] = val
  }
    
  request._ = {
    rid,
    method,
    pathname,

    input: '',
    json: null,
    params: {},
    queries
  }

  response._ = {
    rid,
    method,
    pathname
  }

  // 找出 request 是符合哪個 router
  let router = null
  
  const routers = ['get', 'post', 'put', 'delete', 'options'].includes(response._.method)
    ? Router[response._.method]
    : []

  for (const [segment, r] of routers) {
    let result = (new RegExp('^' + segment + '$', 'g')).exec(response._.pathname)

    if (result !== null) {
      router = r
      request._.params = result.groups || {}
    }
  }

  // 取得、整理 request body
  const param = []
  request.on('data', chunk => param.push(chunk))
  request.on('end', _ => {

    request._.input = Buffer.concat(param).toString('utf8')

    const json = Helper.Json.decode(request._.input)
    
    request._.json = json instanceof Error
      ? null
      : json

    _extc(
      router
        ? router._info
        : _page404,
      request,
      response)
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

Router.all  = new Map()
Router.get  = new Map()
Router.post = new Map()
Router.put  = new Map()
Router.delete  = new Map()
Router.options  = new Map()

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
      for (const { key, val } of headers.filter(header => typeof header == 'object' && header !== null && !Array.isArray(header)).filter(({ key = '', val = '' }) => typeof key == 'string' && key !== '' && typeof val == 'string')) {
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
