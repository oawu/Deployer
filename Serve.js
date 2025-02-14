/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const FileSystem = require('fs/promises')

const Orm    = require('@oawu/mysql-orm')
const { Type: T }      = require('@oawu/helper')

const Config = require('@oawu/_Config')
const { log } = require('@oawu/_Helper') 
const { Sigint, tryIgnore } = require('@oawu/helper') 
const Path   = require('@oawu/_Path')

const _scanFiles = async (directory, ext = null) => {
  const result = []
  const files = []

  try {
    files.push(...await FileSystem.readdir(directory))
  } catch (_) { }

  for (const file of files) {
    const filePath = Path.$.join(directory, file);

    let stats = null
    try {
      stats = await FileSystem.stat(filePath);
    } catch (_) {
      stats = null
    }

    if (stats === null) {
      continue
    }

    if (stats.isDirectory()) {
      result.push(...await _scanFiles(filePath))
      continue
    }

    if (stats.isFile() && (ext === null || file.endsWith(ext))) {
      result.push(filePath)
    }
  }

  return result;
}

const _initMySQL = async _ => {
  Orm.Config.connect = {
    host:     Config.mysql.host,
    user:     Config.mysql.user,
    password: Config.mysql.pswd,
    database: Config.mysql.base,
    port:     Config.mysql.port,
    charset:  Config.mysql.charset,
  }

  Orm.Config.modelsDir = Path.model
  Orm.Config.queryLogDir = Path.file.log
  Orm.Config.migrationsDir = Path.migration

  Sigint.push(async _ => {
    const { DB } = require('@oawu/mysql-orm')
    await DB.close()
    log(`關閉 DB`, `ok`)
  })

  await Orm.Init()
  log('載入 MySQL', 'ok')
}
const _checkMigrate = async _ => {
  const { Migrate } = Orm

  const { version } = await tryIgnore(Migrate.execute())

  if (T.error(version)) {
    log('確認 Migrate', 'err')
    throw new Error('確認 Migrate 失敗', { cause: version })
  }
  log('確認 Migrate', 'ok', `版本：${version}`)
}
const _checkOrmModel = _ => {
  log('確認 Model')
  
  const { Model } = Orm
  
  if (!T.func(Model.BitbucketHook)) {
    log('  ↳ BitbucketHook', 'err')
    throw new Error('Model BitbucketHook 不存在')
  }
  log('  ↳ BitbucketHook', 'ok')


  if (!T.func(Model.BitbucketHookHeader)) {
    log('  ↳ BitbucketHookHeader', 'err')
    throw new Error('Model BitbucketHookHeader 不存在')
  }
  log('  ↳ BitbucketHookHeader', 'ok')


  if (!T.func(Model.BitbucketHookPayload)) {
    log('  ↳ BitbucketHookPayload', 'err')
    throw new Error('Model BitbucketHookPayload 不存在')
  }
  log('  ↳ BitbucketHookPayload', 'ok')

  if (!T.func(Model.Deployment)) {
    log('  ↳ Deployment', 'err')
    throw new Error('Model Deployment 不存在')
  }
  log('  ↳ Deployment', 'ok')


  if (!T.func(Model.DeploymentTask)) {
    log('  ↳ DeploymentTask', 'err')
    throw new Error('Model DeploymentTask 不存在')
  }
  log('  ↳ DeploymentTask', 'ok')

  if (!T.func(Model.DeploymentCommand)) {
    log('  ↳ DeploymentCommand', 'err')
    throw new Error('Model DeploymentCommand 不存在')
  }
  log('  ↳ DeploymentCommand', 'ok')
}
const _loadRoute = async _ => {
  let error = null
  let Route = null
  try {
    Route = require('@oawu/_Route')
    error = null
  } catch (e) {
    error = e
    Route = null
  }

  if (T.error(error)) {
    log('載入 Router', 'err', error)
    throw new Error('載入 Router 失敗', { cause: error })
  }
  log('載入 Router', 'ok')

  Route.cros.headers = [
    { key: 'Access-Control-Allow-Headers', val: 'Content-Type, Authorization, X-Requested-With' },
    { key: 'Access-Control-Allow-Methods', val: 'GET, POST, PUT, DELETE, OPTIONS' },
    { key: 'Access-Control-Allow-Origin',  val: '*' },
  ]

  for (const router of await _scanFiles(Path.router)) {
    try {
      require(router)
    } catch (error) {
      log('載入 Routers', 'err', error)
      throw new Error('載入 Router 失敗', { cause: error })
    }
  }
  log('載入 Routers', 'ok')

  return Route
}

const main = async _ => {
  log('服務開始')
  log('='.repeat(20))

  process.on('SIGINT', async _ => await Sigint.execute())
  log(`初始`, `ok`)

  await _initMySQL()
  await _checkMigrate()
  _checkOrmModel()
  const Route = await _loadRoute()

  const Http = await new Promise((resolve, reject) => {
    const Http = require('http').Server()
    Http.on('error', error => log('Http', 'err', error))
    Http.listen(Config.port, _ => resolve(Http))
    Http.on('request', Route.dispatch)
    Http.setTimeout(10 * 1000)
  })
  log('開啟 Http', 'ok', `http://127.0.0.1:${Config.port}`)

return

  // await require(`${Path.lib}Socket.js`).create(Http)
  // _Helper.print('啟動 Socket', 'ok')

  // const { Model: { Deployment } } = require('@oawu/mysql-orm')
  // const deployments = await Deployment.Enables()

  // // const Cron = require(`${Path.lib}Cron.js`)
  // // await Promise.all(deployments.map(({ deployment, commands }) => Cron(deployment, commands)))
  
  // _Helper.print('排程', 'Bitbucket Hook', deployments.length, 'ok')
  // _Helper.print(deployments.map(({ deployment: { title } }) => ` ↳ ${title}`).join('\n'))
}

main()
  .then(_ => {

  })
  .catch(async error => {
    log('')
    log('發生錯誤')
    log('='.repeat(20))

    console.error(error);
    process.exit()
    
    if (T.neStr(error.message)) {
      log(`訊息：${error.message}`)
    }

    if (error.cause !== undefined) {
      if (error.cause instanceof Error && T.neStr(error.cause.message)) {
        log(`原因：${error.cause.message}`)
      }
      if (T.neStr(error.cause)) {
        log(`原因：${error.cause}`)
      }
    }

    if (T.neStr(error.stdout)) {
      log(`輸出：${error.stdout}`)
    }
  })
  .finally(async _ => {
    // _Helper.print('')
    // _Helper.print('服務結束')
    // _Helper.print('='.repeat(20))

    // await Sigint.run()
  })

// let a = false
// setTimeout(async _ => {
//   if (a) {return}
//   console.error(1);
//   await new Promise(r => setTimeout(r, 1000))
//   if (a) {return}
//   console.error(2);
//   await new Promise(r => setTimeout(r, 1000))
//   if (a) {return}
//   console.error(3);
//   await new Promise(r => setTimeout(r, 1000))
//   if (a) {return}
//   console.error(4);
// }, 100)
// setTimeout(async _ => {
//   console.error('x1');
//   // clearTimeout(a)
//   a = true
//   console.error('x2');
// }, 200)

















// const Queue  = require('@oawu/queue')
// const Dog    = require('@oawu/dog')

// const Path   = require('@oawu/_Path')
// const Config = require('@oawu/_Config')
// const _Helper = require('@oawu/_Helper')


// const Sigint = {
//   $: [],
//   run (closure = null) {
//     let q = Queue()

//     for (const sigint of this.$) {
//       q.enqueue(_next => {
//         if (typeof sigint != 'function') {
//           return _next()
//         }
//         try {
//           sigint(_next)
//         } catch (_) {
//           return _next()
//         }
//       })
//     }

//     if (typeof closure == 'function') {
//       q.enqueue(_next => closure(_next))
//     }

//     q.enqueue(_next => _next(process.exit(1)))
//   },
//   push (...data) {
//     this.$.push(...data)
//     return this
//   },
// }

// Queue()
//   .enqueue(next => {
//     process.on('SIGINT', _ => Sigint.run())

//     _Helper.print(`初始`, `ok`)
//     next()
//   })
//   .enqueue(next => { // 資料庫
//     const Orm = require('@oawu/mysql-orm')

//     Orm.Config.connect({
//       host: Config.mysql.host,
//       user: Config.mysql.user,
//       password: Config.mysql.pswd,
//       database: Config.mysql.base,
//       port: Config.mysql.port,
//       charset: Config.mysql.charset,
//     })

//     Orm.Config.modelsDir(Path.model)
//     Orm.Config.queryLogDir(Path.file.log)
//     Orm.Config.migrationsDir(Path.migration)

//     Sigint.push(_closure => {
//       const { DB } = require('@oawu/mysql-orm')
//       DB.close()
//       _Helper.print('關閉 MySQL 連線', 'ok')
//       _closure()
//     })

//     _Helper.print('載入 MySQL', 'ok')
//     next()
//   })
//   .enqueue(next => { // 資料庫版本
//     const { Migrate } = require('@oawu/mysql-orm')

//     const dog = Dog().bite((error, migrate) => {
//       if (error instanceof Error) {
//         return _Helper.print('確認 Migrate', 'err', error)
//       }

//       _Helper.print('確認 Migrate', 'ok', `版本：${migrate.version}`)
//       next()
//     })

//     Migrate.version(null, dog.eat, false)
//   })
//   .enqueue(next => { // Model 檢查
//     const { Model } = require('@oawu/mysql-orm')
    
//     if (!Model.BitbucketHook) {
//       _Helper.print('確認 Model BitbucketHook', 'err')
//       return
//     }

//     if (!Model.BitbucketHookHeader) {
//       _Helper.print('確認 Model BitbucketHookHeader', 'err')
//       return
//     }

//     if (!Model.BitbucketHookPayload) {
//       _Helper.print('確認 Model BitbucketHookPayload', 'err')
//       return
//     }

//     if (!Model.Deployment) {
//       _Helper.print('確認 Model Deployment', 'err')
//       return
//     }

//     if (!Model.DeploymentNotify) {
//       _Helper.print('確認 Model DeploymentNotify', 'err')
//       return
//     }

//     if (!Model.DeploymentCommand) {
//       _Helper.print('確認 Model DeploymentCommand', 'err')
//       return
//     }

//     next()
//   })
//   .enqueue(next => {
//     let error = null

//     let Route = null
//     try {
//       Route = require('@oawu/_Route')
//       error = null
//     } catch (e) {
//       error = e
//       Route = null
//     }

//     if (error) {
//       return _Helper.print('載入 Router', 'err', error)
//     }

//     _Helper.print('載入 Router', 'ok')

//     Route.cros.headers = [
//       { key: 'Access-Control-Allow-Headers', val: 'Content-Type, Authorization, X-Requested-With' },
//       { key: 'Access-Control-Allow-Methods', val: 'GET, POST, PUT, DELETE, OPTIONS' },
//       { key: 'Access-Control-Allow-Origin',  val: '*' },
//     ]

//     const routers = _Helper.Fs.scanDirSync(Path.router)
//       .filter(file => Path.$.extname(file) == '.js')
    
//     for (let router of routers) {
//       try {
//         require(router)
//         error = null
//       } catch (e) {
//         error = e
//       }
      
//       if (error) {
//         return _Helper.print('載入 Routers', 'err', error)
//       }
//     }

//     _Helper.print('載入 Routers', 'ok')

//     const Http = require('http').Server()
//     Http.on('error', error => _Helper.print('Http', 'err', error))
//     Http.listen(Config.port, _ => {
//       _Helper.print('開啟 Http', 'ok', `http://127.0.0.1:${Config.port}`)
//       next(Http)
//     })
//     Http.on('request', Route.dispatch)
//     Http.setTimeout(10 * 1000)
//   })
//   .enqueue((next, http) => {
//     require(`${Path.lib}Socket.js`)
//       .create(http, http => {
//         _Helper.print('SOCKET', '啟動', 'ok')
//         next(http)
//       })
//   })
//   .enqueue((next, http) => {
//     const Cron = require(`${Path.lib}CronBitbucketHook.js`)

//     const { Model: { Deployment } } = require('@oawu/mysql-orm')

//     Deployment.Enables(deployments => {
//       const dog = Dog().bite(_ => {
//         _Helper.print('排程', 'Bitbucket Hook', deployments.length, 'ok')
//         _Helper.print(deployments.map(({ deployment: { title } }) => ` ↳ ${title}`).join('\n'))
//         next()
//       })

//       Promise.all(deployments.map(({ deployment, notifies, commands }) => Cron(deployment, notifies, commands)))
//         .then(dog.eat)
//         .catch(dog.eat)
//     })
//   })
