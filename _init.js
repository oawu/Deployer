/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const fs = require('fs/promises')

const Orm = require('@oawu/mysql-orm')
const { Sigint, tryFunc, Type: T } = require('@oawu/helper')

const Path = require('@oawu/_Path')
const Config = require('@oawu/_Config')

const mySQL = async log => {
  Orm.Config.connect = {
    host: Config.mysql.host,
    user: Config.mysql.user,
    password: Config.mysql.pswd,
    database: Config.mysql.base,
    port: Config.mysql.port,
    charset: Config.mysql.charset,
  }

  Orm.Config.modelsDir = Path.model
  Orm.Config.queryLogDir = Path.file.log.query
  Orm.Config.migrationsDir = Path.migration

  Sigint.push(async _ => {
    const { DB } = require('@oawu/mysql-orm')
    await DB.close()
    log('關閉 DB', 'ok')
  })

  await Orm.Init()
  log('載入 MySQL', 'ok')
}


const migrate = async log => {
  const { Migrate } = Orm

  const { version } = await tryFunc(Migrate.execute())

  if (T.err(version)) {
    log('確認 Migrate', 'err')
    throw new Error('確認 Migrate 失敗', { cause: version })
  }

  log(`確認 Migrate', 'ok', '版本：${version}`)
}


const model = async log => {
  log('確認 Model')

  const { Model } = Orm

  if (!T.func(Model.BitbucketHook)) {
    throw new Error('Model BitbucketHook 不存在')
  }
  log('  ↳ BitbucketHook', 'ok')


  if (!T.func(Model.BitbucketHookHeader)) {
    throw new Error('Model BitbucketHookHeader 不存在')
  }
  log('  ↳ BitbucketHookHeader', 'ok')


  if (!T.func(Model.BitbucketHookPayload)) {
    throw new Error('Model BitbucketHookPayload 不存在')
  }
  log('  ↳ BitbucketHookPayload', 'ok')

  if (!T.func(Model.Deployment)) {
    throw new Error('Model Deployment 不存在')
  }
  log('  ↳ Deployment', 'ok')


  if (!T.func(Model.DeploymentCommand)) {
    throw new Error('Model DeploymentCommand 不存在')
  }
  log('  ↳ DeploymentCommand', 'ok')

  if (!T.func(Model.Workflow)) {
    throw new Error('Model Workflow 不存在')
  }
  log('  ↳ Workflow', 'ok')

  if (!T.func(Model.WorkflowLog)) {
    throw new Error('Model WorkflowLog 不存在')
  }
  log('  ↳ WorkflowLog', 'ok')
}

const _scanFiles = async (directory, ext = null) => {
  const result = []
  const files = []

  try {
    files.push(...await fs.readdir(directory))
  } catch (_) { }

  for (const file of files) {
    const filePath = Path.$.join(directory, file);

    let stats = null
    try {
      stats = await fs.stat(filePath);
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

const route = async log => {
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
    throw new Error('載入 Router 失敗', { cause: error })
  }
  log('載入 Router', 'ok')

  Route.cros.headers = [
    { key: 'Access-Control-Allow-Headers', val: 'Content-Type, Authorization, X-Requested-With' },
    { key: 'Access-Control-Allow-Methods', val: 'GET, POST, PUT, DELETE, OPTIONS' },
    { key: 'Access-Control-Allow-Origin', val: '*' },
  ]

  for (const router of await _scanFiles(Path.router)) {
    try {
      require(router)
    } catch (error) {
      throw new Error('載入 Router 失敗', { cause: error })
    }
  }

  log('載入 Routers', 'ok')

  return Route
}

module.exports = {
  mySQL,
  migrate,
  model,
  route,
}