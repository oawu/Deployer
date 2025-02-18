/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const FileSystem = require('fs/promises')
const Orm = require('@oawu/mysql-orm')
const { Sigint, tryIgnore, Type: T } = require('@oawu/helper')

const Path = require('@oawu/_Path')
const Config = require('@oawu/_Config')
const { syslog } = require('@oawu/_Helper')

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
    host: Config.mysql.host,
    user: Config.mysql.user,
    password: Config.mysql.pswd,
    database: Config.mysql.base,
    port: Config.mysql.port,
    charset: Config.mysql.charset,
  }

  Orm.Config.modelsDir = Path.model
  Orm.Config.queryLogDir = Path.file.log
  Orm.Config.migrationsDir = Path.migration

  Sigint.push(async _ => {
    const { DB } = require('@oawu/mysql-orm')
    await DB.close()
    syslog(`關閉 DB`, `ok`)
  })

  await Orm.Init()
  syslog('載入 MySQL', 'ok')
}
const _checkMigrate = async _ => {
  const { Migrate } = Orm

  const { version } = await tryIgnore(Migrate.execute())

  if (T.err(version)) {
    syslog('確認 Migrate', 'err')
    throw new Error('確認 Migrate 失敗', { cause: version })
  }
  syslog('確認 Migrate', 'ok', `版本：${version}`)
}
const _checkOrmModel = _ => {
  syslog('確認 Model')

  const { Model } = Orm

  if (!T.func(Model.BitbucketHook)) {
    syslog('  ↳ BitbucketHook', 'err')
    throw new Error('Model BitbucketHook 不存在')
  }
  syslog('  ↳ BitbucketHook', 'ok')


  if (!T.func(Model.BitbucketHookHeader)) {
    syslog('  ↳ BitbucketHookHeader', 'err')
    throw new Error('Model BitbucketHookHeader 不存在')
  }
  syslog('  ↳ BitbucketHookHeader', 'ok')


  if (!T.func(Model.BitbucketHookPayload)) {
    syslog('  ↳ BitbucketHookPayload', 'err')
    throw new Error('Model BitbucketHookPayload 不存在')
  }
  syslog('  ↳ BitbucketHookPayload', 'ok')

  if (!T.func(Model.Deployment)) {
    syslog('  ↳ Deployment', 'err')
    throw new Error('Model Deployment 不存在')
  }
  syslog('  ↳ Deployment', 'ok')


  if (!T.func(Model.DeploymentTask)) {
    syslog('  ↳ DeploymentTask', 'err')
    throw new Error('Model DeploymentTask 不存在')
  }
  syslog('  ↳ DeploymentTask', 'ok')

  if (!T.func(Model.DeploymentCommand)) {
    syslog('  ↳ DeploymentCommand', 'err')
    throw new Error('Model DeploymentCommand 不存在')
  }
  syslog('  ↳ DeploymentCommand', 'ok')
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

  if (T.err(error)) {
    syslog('載入 Router', 'err', error)
    throw new Error('載入 Router 失敗', { cause: error })
  }
  syslog('載入 Router', 'ok')

  Route.cros.headers = [
    { key: 'Access-Control-Allow-Headers', val: 'Content-Type, Authorization, X-Requested-With' },
    { key: 'Access-Control-Allow-Methods', val: 'GET, POST, PUT, DELETE, OPTIONS' },
    { key: 'Access-Control-Allow-Origin', val: '*' },
  ]

  for (const router of await _scanFiles(Path.router)) {
    try {
      require(router)
    } catch (error) {
      syslog('載入 Routers', 'err', error)
      throw new Error('載入 Router 失敗', { cause: error })
    }
  }
  syslog('載入 Routers', 'ok')

  return Route
}

const main = async _ => {
  syslog('服務開始')
  syslog('='.repeat(20))

  process.on('SIGINT', async _ => await Sigint.execute())
  syslog(`初始`, `ok`)

  await _initMySQL()
  await _checkMigrate()
  _checkOrmModel()
  const Route = await _loadRoute()

  const Http = await new Promise((resolve, reject) => {
    const Http = require('http').Server()
    Http.on('error', error => syslog('Http', 'err', error))
    Http.listen(Config.port, _ => resolve(Http))
    Http.on('request', Route.dispatch)
    Http.setTimeout(10 * 1000)
  })
  syslog('開啟 Http', 'ok', `http://127.0.0.1:${Config.port}`)
}

main()
  .then(_ => {

  })
  .catch(async error => {
    syslog('')
    syslog('發生錯誤')
    syslog('='.repeat(20))


    if (T.neStr(error.message)) {
      syslog(`訊息：${error.message}`)
    }

    if (error.cause !== undefined) {
      if (error.cause instanceof Error && T.neStr(error.cause.message)) {
        syslog(`原因：${error.cause.message}`)
      }
      if (T.neStr(error.cause)) {
        syslog(`原因：${error.cause}`)
      }
    }

    if (T.neStr(error.stdout)) {
      syslog(`輸出：${error.stdout}`)
    }
  })
  .finally(async _ => {
    // _Helper.print('')
    // _Helper.print('服務結束')
    // _Helper.print('='.repeat(20))

    // await Sigint.run()
  })
