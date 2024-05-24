/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */
 
const Queue  = require('@oawu/queue')
const Path   = require('@oawu/_Path')
const Config = require('@oawu/_Config')
const Dog    = require('@oawu/_Dog')
const Helper = require('@oawu/_Helper')


const Sigint = {
  $: [],
  run (closure = null) {
    let q = Queue()

    for (const sigint of this.$) {
      q.enqueue(_next => {
        if (typeof sigint != 'function') {
          return _next()
        }
        try {
          sigint(_next)
        } catch (_) {
          return _next()
        }
      })
    }

    if (typeof closure == 'function') {
      q.enqueue(_next => closure(_next))
    }

    q.enqueue(_next => _next(process.exit(1)))
  },
  push (...data) {
    this.$.push(...data)
    return this
  },
}

Queue()
  .enqueue(next => {
    process.on('SIGINT', _ => Sigint.run())

    Helper.print(`初始`, `ok`)
    next()
  })
  .enqueue(next => { // 資料庫
    const Orm = require('@oawu/mysql-orm')

    Orm.Config.connect({
      host: Config.mysql.host,
      user: Config.mysql.user,
      password: Config.mysql.pswd,
      database: Config.mysql.base,
      port: Config.mysql.port,
      charset: Config.mysql.charset,
    })

    Orm.Config.modelsDir(Path.model)
    Orm.Config.queryLogDir(Path.file.log)
    Orm.Config.migrationsDir(Path.migration)

    Sigint.push(_closure => {
      const { DB } = require('@oawu/mysql-orm')
      DB.close()
      Helper.print('關閉 MySQL 連線', 'ok')
      _closure()
    })

    Helper.print('載入 MySQL', 'ok')
    next()
  })
  .enqueue(next => { // 資料庫版本
    const { Migrate } = require('@oawu/mysql-orm')

    const dog = Dog().bite((error, migrate) => {
      if (error instanceof Error) {
        return Helper.print('確認 Migrate', 'err', error)
      }

      Helper.print('確認 Migrate', 'ok', `版本：${migrate.version}`)
      next()
    })

    Migrate.version(null, dog.eat, false)
  })
  .enqueue(next => { // Model 檢查
    const { Model } = require('@oawu/mysql-orm')
    
    if (!Model.BitbucketHook) {
      Helper.print('確認 Model BitbucketHook', 'err')
      return
    }

    if (!Model.BitbucketHookHeader) {
      Helper.print('確認 Model BitbucketHookHeader', 'err')
      return
    }

    if (!Model.BitbucketHookPayload) {
      Helper.print('確認 Model BitbucketHookPayload', 'err')
      return
    }

    if (!Model.Deployment) {
      Helper.print('確認 Model Deployment', 'err')
      return
    }

    if (!Model.DeploymentNotify) {
      Helper.print('確認 Model DeploymentNotify', 'err')
      return
    }

    if (!Model.DeploymentCommand) {
      Helper.print('確認 Model DeploymentCommand', 'err')
      return
    }

    next()
  })
  .enqueue(next => {
    let error = null

    let Route = null
    try {
      Route = require('@oawu/_Route')
      error = null
    } catch (e) {
      error = e
      Route = null
    }

    if (error) {
      return Helper.print('載入 Router', 'err', error)
    }

    Helper.print('載入 Router', 'ok')

    Route.cros.headers = [
      { key: 'Access-Control-Allow-Headers', val: 'Content-Type, Authorization, X-Requested-With' },
      { key: 'Access-Control-Allow-Methods', val: 'GET, POST, PUT, DELETE, OPTIONS' },
      { key: 'Access-Control-Allow-Origin',  val: '*' },
    ]

    const routers = Helper.Fs.scanDirSync(Path.router)
      .filter(file => Path.$.extname(file) == '.js')
    
    for (let router of routers) {
      try {
        require(router)
        error = null
      } catch (e) {
        error = e
      }
      
      if (error) {
        return Helper.print('載入 Routers', 'err', error)
      }
    }

    Helper.print('載入 Routers', 'ok')

    const Http = require('http').Server()
    Http.on('error', error => Helper.print('Http', 'err', error))
    Http.listen(Config.port, _ => {
      Helper.print('開啟 Http', 'ok', `http://127.0.0.1:${Config.port}`)
      next(Http)
    })
    Http.on('request', Route.dispatch)
    Http.setTimeout(10 * 1000)
  })
  .enqueue((next, http) => {
    require(`${Path.lib}Socket.js`)
      .create(http, http => {
        Helper.print('SOCKET', '啟動', 'ok')
        next(http)
      })
  })
  .enqueue((next, http) => {
    const Cron = require(`${Path.lib}CronBitbucketHook.js`)

    const { Model: { Deployment } } = require('@oawu/mysql-orm')

    Deployment.Enables(deployments => {
      const dog = Dog().bite(_ => {
        Helper.print('排程', 'Bitbucket Hook', deployments.length, 'ok')
        Helper.print(deployments.map(({ deployment: { title } }) => ` ↳ ${title}`).join('\n'))
        next()
      })

      Promise.all(deployments.map(({ deployment, notifies, commands }) => Cron(deployment, notifies, commands)))
        .then(dog.eat)
        .catch(dog.eat)
    })
  })
