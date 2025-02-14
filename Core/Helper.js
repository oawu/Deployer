/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

// const fs = require('fs').promises
// const Path = require('@oawu/_Path')
// const T = require('@oawu/_Type')
const Exec = require('child_process').exec

// let isPm2 = null
 
// const args = _ => {
//   const argvs = process.argv.slice(2)
//   const cmds = {}

//   let key = null;
//   for (let argv of argvs) {
//     if (argv[0] == '-') {
//       key = argv
//       if (cmds[key] === undefined)
//         cmds[key] = []
//     } else {
//       if (cmds[key] === undefined)
//         cmds[key] = []
//       cmds[key].push(argv)
//     }
//   }

//   return cmds
// }

// const argvByKey = keys => {
//   const cmds = args()
  
//   if (typeof keys == 'string')
//     keys = [keys]

//   let arrs = undefined
//   for (let key of keys)
//     if (Array.isArray(cmds[key])) {
//       if (arrs === undefined)
//         arrs = []
//       arrs.push(cmds[key])
//     }

//   return arrs !== undefined ? arrs.pop() || [] : undefined
// }

const log = (...texts) => {
  // if (isPm2 === null) {
  //   const tmp = argvByKey(['-PM2'])
  //   isPm2 = tmp !== undefined
  // }

  // process.stdout.write(`${texts.map(text => text instanceof Error ? text.message : text).join(' ─ ')}${isPm2 ? '' : '\n'}`)
  process.stdout.write(`${texts.map(text => text instanceof Error ? text.message : text).join(' ─ ')}\n`)
  return true
}

// const exists = dir => {
//   let bool = false
//   try { 
//     bool = FileSystem.existsSync(dir)
//   } catch (_) {
//     bool = false
//   }
//   return bool
// }

// const access = (path, permission = FileSystem.constants.R_OK) => {
//   let bool = false
//   try {
//     FileSystem.accessSync(path, permission)
//     bool = true
//   } catch (_) {
//     bool = false
//   }
//   return bool
// }

// const isDirectory = path => !!FileSystem.statSync(path).isDirectory()

// const scanDirSync = (dir, recursive = true) => {
//   arr = []

//   try {
//     if (!exists(dir)) {
//       arr = []
//     } else {
//       arr = FileSystem.readdirSync(dir)
//         .map(file => !['.', '..'].includes(file)
//           ? recursive && access(dir + file) && isDirectory(dir + file)
//             ? scanDirSync(`${dir}${file}${Path.sep}`, recursive)
//             : [`${dir}${file}`]
//           : null)
//         .filter(t => t !== null)
//         .reduce((a, b) => a.concat(b), [])
//     }
//   } catch (_) {
//     arr = []
//   }

//   return arr
// }


// const scanFiles = async (directory, ext = null) => {
//   const result = []

//   const files = []

//   try {
//     files.push(...await fs.readdir(directory))
//   } catch (_) { }

//   for (const file of files) {
//     const filePath = Path.$.join(directory, file);

//     let stats = null
//     try {
//       stats = await fs.stat(filePath);
//     } catch (_) {
//       stats = null
//     }

//     if (stats === null) {
//       continue
//     }

//     if (stats.isDirectory()) {
//       result.push(...await scanFiles(filePath))
//       continue
//     }

//     if (stats.isFile() && (ext === null || file.endsWith(ext))) {
//       result.push(filePath)
//     }
//   }

//   return result;
// }

// const Json = {
//   decode: text => {
//     let json = null

//     try {
//       json = JSON.parse(text)
//     } catch (e) {
//       json = e
//     }

//     return json
//   },
//   encode: (json, space = 0) => {
//     let text = null

//     try {
//       text = JSON.stringify(json, null, space)
//     } catch (e) {
//       text = e
//     }

//     return text
//   },
// }

// const error = e => e instanceof Error ? e.message : e

// const closureOrPromise = (closure, func) => {
//   if (T.func(closure)) {
//     if (T.aFunc(func)) {
//       return func().then(closure).catch(closure)
//     }

//     let result = null
    
//     try {
//       result = func()
//     } catch (error) {
//       result = error
//     }

//     return closure(result)
//   }

//   if (T.aFunc(func)) {
//     return func()
//   }

//   return new Promise((resolve, reject) => {
//     let result = null
    
//     try {
//       result = func()
//     } catch (error) {
//       result = error
//     }

//     result instanceof Error ? reject(result) : resolve(result)
//   })
// }

// const tryIgnore = async (func, err = undefined) => {
//   if (T.aFunc(func)) {
//     let result = null
//     try {
//       result = await func()
//     } catch (error) {
//       result = err === undefined ? error : err
//     }
//     return result
//   }

//   if (func instanceof Promise) {
//     let result = null
//     try {
//       result = await func
//     } catch (error) {
//       result = err === undefined ? error : err
//     }
//     return result
//   }
//   if (T.func(func)) {
//     let result = null
//     try {
//       result = func()
//     } catch (error) {
//       result = err === undefined ? error : err
//     }
//     return result
//   }

//   return func
// }
const execPromise = (command, option = { maxBuffer: 1024 }) => new Promise((resolve, reject) => Exec(command, option, (error, stdout, stderr) => {
  if (error) {
    return reject(`Error: ${error.message}`)
  }
  resolve(stdout, stderr)
}))

module.exports = {
  // closureOrPromise,
  // execPromise,
  // try: tryIgnore,
  // scanFiles,
  log,
  exec: execPromise,
  // error,
  // Json,
  // Type: {
  //   isObject: obj => typeof obj == 'object' && obj !== null && !Array.isArray(obj),
  //   isString: obj => typeof obj == 'string',
  // },
  // Fs: {
  //   // isDirectory,
  //   // exists,
  //   // access,
  //   // scanDirSync,
  // }
}
