/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const FileSystem = require('fs')

let isPm2 = null
 
const args = _ => {
  const argvs = process.argv.slice(2)
  const cmds = {}

  let key = null;
  for (let argv of argvs) {
    if (argv[0] == '-') {
      key = argv
      if (cmds[key] === undefined)
        cmds[key] = []
    } else {
      if (cmds[key] === undefined)
        cmds[key] = []
      cmds[key].push(argv)
    }
  }

  return cmds
}

const argvByKey = keys => {
  const cmds = args()
  
  if (typeof keys == 'string')
    keys = [keys]

  let arrs = undefined
  for (let key of keys)
    if (Array.isArray(cmds[key])) {
      if (arrs === undefined)
        arrs = []
      arrs.push(cmds[key])
    }

  return arrs !== undefined ? arrs.pop() || [] : undefined
}

const print = (...texts) => {
  if (isPm2 === null) {
    const tmp = argvByKey(['-PM2'])
    isPm2 = tmp !== undefined
  }

  process.stdout.write(`${texts.map(text => text instanceof Error ? text.message : text).join(' ─ ')}${isPm2 ? '' : '\n'}`)
  return true
}

const exists = dir => {
  let bool = false
  try { 
    bool = FileSystem.existsSync(dir)
  } catch (_) {
    bool = false
  }
  return bool
}

const access = (path, permission = FileSystem.constants.R_OK) => {
  let bool = false
  try {
    FileSystem.accessSync(path, permission)
    bool = true
  } catch (_) {
    bool = false
  }
  return bool
}

const isDirectory = path => !!FileSystem.statSync(path).isDirectory()

const scanDirSync = (dir, recursive = true) => {
  arr = []

  try {
    if (!exists(dir)) {
      arr = []
    } else {
      arr = FileSystem.readdirSync(dir)
        .map(file => !['.', '..'].includes(file)
          ? recursive && access(dir + file) && isDirectory(dir + file)
            ? scanDirSync(`${dir}${file}${Path.sep}`, recursive)
            : [`${dir}${file}`]
          : null)
        .filter(t => t !== null)
        .reduce((a, b) => a.concat(b), [])
    }
  } catch (_) {
    arr = []
  }

  return arr
}

const Json = {
  decode: text => {
    let json = null

    try {
      json = JSON.parse(text)
    } catch (e) {
      json = e
    }

    return json
  },
  encode: (json, space = 0) => {
    let text = null

    try {
      text = JSON.stringify(json, null, space)
    } catch (e) {
      text = e
    }

    return text
  },
}

const error = e => e instanceof Error ? e.message : e

module.exports = {
  print,
  error,
  Json,
  Type: {
    isObject: obj => typeof obj == 'object' && obj !== null && !Array.isArray(obj),
    isString: obj => typeof obj == 'string',
  },
  Fs: {
    isDirectory,
    exists,
    access,
    scanDirSync,
  }
}
