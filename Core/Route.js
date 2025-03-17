/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const fs = require('fs')
const URL = require('url')
const uuid = require('uuid')

const Logger = require('@oawu/_Logger')
const { Json, Type: T } = require('@oawu/helper')

const Path = require('@oawu/_Path')
const { syslog } = require('@oawu/_Helper')

let _page404 = null
let _crosHeaders = []
const _id_Data_Map = new Map()

const _output = (data, callback = null) => (body, code = null) => {
  if (!(T.obj(data) && _id_Data_Map.has(data.id))) {
    return
  } else {
    _id_Data_Map.delete(data.id)
  }

  if (!T.obj(data.response)) {
    T.func(callback) && callback(body)
    return
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

    if (T.err(text)) {
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

  syslog('Http', data.id, '←', `${code}`, `${Date.now() - data.sTime}ms`)
  data.logger('Http', '←', `${code}`, `${Date.now() - data.sTime}ms`)

  data = null
  T.func(callback) && callback(body)
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
    return
  }

  if (T.asyncFunc(func)) {
    func.call(data, data, output)
      .then(result => output(result))
      .catch(error => output(error, 400))
    return
  }

  if (T.promise(func)) {
    func
      .then(result => output(result))
      .catch(error => output(error, 400))
    return
  }
}

const _dispatch = (info, data, callback = null) => {
  const output = _output(data, callback)

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
  return fs.exists(info.file, exists => {
    if (!exists) {
      return _d404(output)
    }

    // 引入 controller
    let controller = null
    let error = null
    try {
      controller = require(info.file)
      error = null
    } catch (e) {
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

const _compare = (path1s, path2s) => {
  if (path1s.length !== path2s.length) {
    return new Error('路徑格式錯誤')
  }

  const query = {}
  for (const i in path1s) {
    const path1 = path1s[i]
    const path2 = path2s[i]

    const type = path1.type

    if (type === 'x') {
      return new Error('路徑類型錯誤')
    }

    if (type === 'equal') {
      if (path1.val !== path2) {
        return new Error('路徑錯誤(0)')
      }
      continue
    }

    const name = path1.name
    const len = path1.len

    const isInt = ['int', 'int8', 'int16', 'int32', 'int64'].includes(type)
    const isUint = ['uint', 'uint8', 'uint16', 'uint32', 'uint64'].includes(type)
    const isFloat = ['float', 'double', 'num', 'number'].includes(type)
    const isStr = ['str', 'string'].includes(type)

    if (!isInt && !isUint && !isFloat && !isStr) {
      return new Error('路徑類型錯誤')
    }

    if (isStr) {
      const _val = '' + path2

      if (len.min !== null && _val.length < len.min) {
        return new Error('路徑錯誤(1)')
      }
      if (len.max !== null && _val.length > len.max) {
        return new Error('路徑錯誤(2)')
      }
      query[name] = _val
      continue
    }

    if (isNaN(path2) || path2 === Infinity) {
      return new Error('路徑錯誤(3)')
    }

    if (isFloat) {
      query[name] = 1.0 * path2
      continue
    }

    const _val = 1 * path2

    if (isUint && _val < 0) {
      return new Error('路徑錯誤(4)')
    }

    switch (type) {
      case 'int':
        if (len.min !== null && _val < len.min) {
          return new Error('路徑錯誤(5)')
        }
        if (len.max !== null && _val > len.max) {
          return new Error('路徑錯誤(6)')
        }
        query[name] = _val
        break
      case 'int8':
        if (_val < (len.min !== null ? Math.max(-128, len.min) : -128) || _val > (len.max !== null ? Math.min(127, len.max) : 127)) {
          return new Error('路徑錯誤(7)')
        }
        query[name] = _val
        break
      case 'int16':
        if (_val < (len.min !== null ? Math.max(-32768, len.min) : -32768) || _val > (len.max !== null ? Math.min(32767, len.max) : 32767)) {
          return new Error('路徑錯誤(8)')
        }
        query[name] = _val
        break
      case 'int32':
        if (_val < (len.min !== null ? Math.max(-2147483648, len.min) : -2147483648) || _val > (len.max !== null ? Math.min(2147483647, len.max) : 2147483647)) {
          return new Error('路徑錯誤(9)')
        }
        query[name] = _val
        break
      case 'int64':
        if (_val < (len.min !== null ? Math.max(-9223372036854775808, len.min) : -9223372036854775808) || _val > (len.max !== null ? Math.min(9223372036854775807, len.max) : 9223372036854775807)) {
          return new Error('路徑錯誤(10)')
        }
        query[name] = _val
        break
      case 'uint':
        if (_val < 0 || (len.max !== null && _val > len.max)) {
          return new Error('路徑錯誤(11)')
        }
        query[name] = _val
        break
      case 'uint8':
        if (_val < 0 || _val > (len.max !== null ? Math.min(255, len.max) : 255)) {
          return new Error('路徑錯誤(12)')
        }
        query[name] = _val
        break
      case 'uint16':
        if (_val < 0 || _val > (len.max !== null ? Math.min(65535, len.max) : 65535)) {
          return new Error('路徑錯誤(13)')
        }
        query[name] = _val
        break
      case 'uint32':
        if (_val < 0 || _val > (len.max !== null ? Math.min(4294967295, len.max) : 4294967295)) {
          return new Error('路徑錯誤(14)')
        }
        query[name] = _val
        break
      case 'uint64':
        if (_val < 0 || _val > (len.max !== null ? Math.min(18446744073709551615, len.max) : 18446744073709551615)) {
          return new Error('路徑錯誤(15)')
        }
        query[name] = _val
        break
      default:
        return new Error('路徑錯誤(16)')
    }
  }

  return query
}
const _parse = (method, pathname) => { // 找出 request 是符合哪個 router
  let router = null
  let param = {}

  const routers = Router.all.get(method)

  if (!T.arr(routers)) {
    return { router, params }
  }
  if (routers.length <= 0) {
    return { router, params }
  }

  const paths = pathname.split('/').filter(t => t !== '')

  for (const _router of routers) {
    const _param = _compare(_router.paths, paths)
    if (!T.err(_param)) {
      router = _router
      param = _param
      break
    }
  }

  return { router, param }
}

// 分配
const dispatch = (_id, request, response) => {
  const id = uuid.v4()
  const logger = Logger.request(id)

  const url = URL.parse(request.url)
  const method = request.method.toLowerCase()
  const pathname = url.pathname.replace(/\/+/gm, '/').replace(/\/$|^\//gm, '')

  syslog('Http', id, '➜', `[${method}]${pathname}`)
  logger('Http', '➜', `[${method}]${pathname}`, _id)

  const { router, param } = _parse(method, pathname)

  let _query = T.str(url.query) ? url.query : ''
  _query = _query.split('&').map(token => token.split('=')).map(([key, ...vs]) => ({ key, val: vs.join('=') })).filter(({ key }) => key !== '')
  const query = {}
  for (const { key, val } of _query) {
    query[key] = val
  }

  const header = {}
  for (const key in request.headers) {
    header[key] = request.headers[key]
  }

  // 取得、整理 request body
  const _param = []
  request.on('data', chunk => _param.push(chunk))
  request.on('end', _ => {
    const input = Buffer.concat(_param).toString('utf8')
    const _json = Json.decode(input)
    const json = T.err(_json) ? undefined : _json

    // header, param, query 沒有值也會是 {}
    // json 沒有值會是 undefined
    const data = {
      id,
      logger,

      method,
      header,
      pathname,
      param,
      query,
      input,
      json,
      request,
      response,
      sTime: Date.now()
    }

    _id_Data_Map.set(id, data)

    _dispatch(
      router
        ? router._info
        : _page404,
      data)
  })
}
const execute = (id, logger, pathname) => {
  const method = 'cli'.toLowerCase()
  const { router, param } = _parse(method, pathname)

  const data = {
    id,
    logger,

    method,
    header: {},
    pathname,
    param,
    query: {},
    input: '',
    json: undefined,
    request: undefined,
    response: undefined,
    sTime: Date.now()
  }

  _id_Data_Map.set(id, data)

  return new Promise((resolve, _) => _dispatch(
    router
      ? router._info
      : _page404,
    data, resolve))
}

const _pattern = /\{\{\s*(?<name>\w+)\s*:\s*(?<type>\w+)\s*(?:\(\s*(?<min>\d+)?\s*,?\s*(?<max>\d+)?\s*\))?\s*\}\}$/

const _parsePath = path => path.split('/').filter(t => t !== '').map(val => {

  const result = val.match(_pattern)
  if (!result) {
    return { type: 'equal', val }
  }

  if (!(T.obj(result.groups) && T.neStr(result.groups.name) && T.neStr(result.groups.type) && [
    'str', 'string', 'int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'float', 'double', 'num', 'number'
  ].includes(result.groups.type))) {
    return { type: 'x', val }
  }

  const name = result.groups.name
  const type = result.groups.type

  let min = isNaN(result.groups.min) ? null : (1 * result.groups.min)
  min = T.num(min) ? min : null

  let max = isNaN(result.groups.max) ? null : (1 * result.groups.max)
  max = T.num(max) ? max : null

  return {
    type: type, val, name: name,
    len: { min, max },
  }
})

// Router
const Router = function (method, path = '') {
  if (!(this instanceof Router)) {
    return new Router(method, path)
  }


  this._info = null
  this._paths = _parsePath(path)

  const routers = Router.all.get(method) || []
  routers.push(this)
  Router.all.set(method, routers)
}

Router.all = new Map()

Router.prototype.func = function (func) {
  this._info = _parseFunc(func)
  return this
}
Router.prototype.controller = function (name) {
  this._info = _parseController(name)
  return this
}
// 設定 Router.prototype getter
Object.defineProperty(Router.prototype, 'paths', {
  get() {
    return this._paths
  }
})


module.exports = {
  dispatch,
  execute,
  page404: {
    controller(name) {
      _page404 = _parseController(name)
    },
    func(func) {
      _page404 = _parseFunc(func)
    }
  },
  cros: {
    set headers(headers) {
      if (!Array.isArray(headers)) {
        return
      }

      const tmp = {}
      for (const { key, val } of headers.filter(header => T.obj(header)).filter(({ key = '', val = '' }) => T.neStr(key) && T.str(val))) {
        tmp[key] = val
      }

      _crosHeaders = tmp
    },
    get headers() {
      return _crosHeaders
    }
  },
  get all() { return Router.all },
  get: path => new Router('get', path),
  post: path => new Router('post', path),
  put: path => new Router('put', path),
  delete: path => new Router('delete', path),
  options: path => new Router('options', path),
  cli: path => new Router('cli', path),
}
