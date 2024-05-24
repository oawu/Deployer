/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Exec      = require('child_process').exec
const Axios     = require('axios')
const URL       = require('url')
const Queue     = require('@oawu/queue')
const { Model } = require('@oawu/mysql-orm')
const Dog       = require('@oawu/dog')

const Helper    = require('@oawu/_Helper')
const Path      = require('@oawu/_Path')
const Config    = require('@oawu/_Config')
const HookEvent = require(`${Path.lib}HookEvent`)

const Cron = function(deployment, notifies, commands) {
  if (!(this instanceof Cron)) {
    return new Cron(deployment, notifies, commands)
  }

  this.deployment = deployment
  this.commands   = commands
  this.notifies   = notifies

  this.model = null
  this.error = null
  this.queue = Queue()
}

Cron.prototype.errorNotify = function(error, title, closure) {
  const message = [
    `⚠️ ${this.deployment.title} 在部署時發生錯誤！`,
    '-'.repeat('5'),
    title,
    Helper.error(error),
  ].join('\n')

  const dog = Dog().bite(closure)

  Promise.all(this.notifies.map(notify => Axios({
    method: 'post',
    baseURL: 'https://notify-api.line.me/api/notify',
    headers: { Authorization: `Bearer ${notify.token}` },
    data: new URL.URLSearchParams({ message })
  })))
    .then(dog.eat)
    .catch(dog.eat)

  return this
}
Cron.prototype.startNotify = function(closure) {
  const url = typeof Config.webUrl == 'string' && Config.webUrl !== '' && /(http(s?)):\/\//i.test(Config.webUrl) ? `${Config.webUrl.replace(/\/*$/, '')}/?token=${this.model.hook.token}` : ''

  const message = [
    `🚀 #${this.model.hook.id} ${this.deployment.title} 開始部署`,
    ...(url ? ['-'.repeat('5'), `${url}`] : []),
    '-'.repeat('5'),
    `提交者：${this.model.hook.commitAuthor}`,
    `時間：${this.model.hook.commitDate}`,
  ].join('\n')

  const dog = Dog().bite(closure)

  Promise.all(this.notifies.map(notify => Axios({
    method: 'post',
    baseURL: 'https://notify-api.line.me/api/notify',
    headers: { Authorization: `Bearer ${notify.token}` },
    data: new URL.URLSearchParams({ message })
  })))
    .then(dog.eat)
    .catch(dog.eat)
}
Cron.prototype.dbCheck = function(next) {
  // 檢查資料庫格式

  const dog = Dog().bite(food => {
    if (food instanceof Error) {
      Helper.print('部署', this.deployment.title, '開始')
      return this.errorNotify(food, `🔴 取得 Hook 時發生資料庫錯誤`, _ => next(Helper.print('部署', this.deployment.title, '錯誤')))
    }

    if (food.length === 0) {
      return next()
    }

    Helper.print('部署', this.deployment.title, '開始')
    const [hook, header, payload] = food

    this.model = {
      hook,
      header,
      payload,
    }

    this.startNotify(
      _ => hook.createLogAndNotify(`資料格式是否正確`,
        log => hook.logDoneAndNotify(log, next)))
  })

  Model.BitbucketHook
    .where('fullname', this.deployment.fullname)
    .where('status', Model.BitbucketHook.STATUS_PENDING)
    .order('id DESC')
    .one((error, hook) => {
      if (error) {
        return dog.eat(error)
      }

      if (!hook) {
        return dog.eat([])
      }

      Promise.all([
        Model.BitbucketHookHeader
          .where('id', hook.bitbucketHookHeaderId)
          .one(),
        Model.BitbucketHookPayload
          .where('id', hook.bitbucketHookPayloadId)
          .one(),
      ])
      .then(data => dog.eat([hook, ...data]))
      .catch(error => dog.eat(error))
    })

  return this
}
Cron.prototype.updateDeployment = function(next, clog) {
  if (!this.model || this.error) {
    return next()
  }

  this.model.hook.createLogAndNotify(`更新 deployment 資料`, log => {
    this.deployment.bitbucketHookId = this.model.hook.id

    this.deployment.save((error, _) => {
      this.error = error

      HookEvent.emit(this.model.hook.id, 'hook', { error: null, data: this.model.hook.socketStruct }, _ => error
        ? this.model.hook.logFailAndNotify(log, next)
        : this.model.hook.logDoneAndNotify(log, next))
    })
  })
}
Cron.prototype.setProcessing = function(next, clog) {
  if (!this.model || this.error) {
    return next()
  }
  
  this.model.hook.createLogAndNotify(`變更 Hook 狀態`, log => {
    this.model.hook.status = Model.BitbucketHook.STATUS_PROCESSING
    this.model.hook.sTime = Date.now() / 1000
    this.model.hook.save((error, hook) => {
      this.error = error

      HookEvent.emit(hook.id, 'hook', { error: null, data: hook.socketStruct }, _ => error
        ? this.model.hook.logFailAndNotify(log, next)
        : this.model.hook.logDoneAndNotify(log, next))
    })
  })
}
Cron.prototype.isDir = function(next) {
  if (!this.model || this.error) {
    return next()
  }
  this.model.hook.createLogAndNotify(`檢查專案目錄是否存在`, log => {
    Exec(`if test -d ${this.deployment.dir}; then echo "1"; else echo "2"; fi`, { maxBuffer: 1024 }, (error, data) => {
      if (!error && data.trim() !== '1') {
        this.error = new Error(`找不到專案目錄：${this.deployment.dir}`)
      } else {
        this.error = null
      }

      this.error
        ? this.model.hook.logFailAndNotify(log, data, next)
        : this.model.hook.logDoneAndNotify(log, data, next)
    })  
  })
}
Cron.prototype.isGitDir = function(next, clog) {
  if (!this.model || this.error) {
    return next()
  }

  this.model.hook.createLogAndNotify(`檢查專案是否採用 Git 管理`, log => {
    Exec(`if test -d ${this.deployment.dir}; then echo "1"; else echo "2"; fi`, { maxBuffer: 1024 }, (error, data) => {
      if (!error && data.trim() !== '1') {
        this.error = new Error(`專案內沒有 .git 檔案`)
      } else {
        this.error = null
      }

      this.error
        ? this.model.hook.logFailAndNotify(log, data, next)
        : this.model.hook.logDoneAndNotify(log, data, next)
    })
  })
}
Cron.prototype.gitStatus = function(next) {
  if (!this.model || this.error) {
    return next()
  }
  this.model.hook.createLogAndNotify(`執行指令 git status --porcelain`, log => {
    Exec(`cd ${this.deployment.dir} && git status --porcelain`, { maxBuffer: 1024 }, (error, data) => {
      if (!error && data !== '') {
        this.error = new Error(`專案內有未 Commit 的異動`)
      } else {
        this.error = null
      }

      this.error
        ? this.model.hook.logFailAndNotify(log, data, next)
        : this.model.hook.logDoneAndNotify(log, data, next)
    })
  })
}
Cron.prototype.gitBr = function(next) {
  if (!this.model || this.error) {
    return next()
  }
  const compare = (dirBr, goalBr, func) => {
    this.model.hook.createLogAndNotify(`檢查專案分支是否為指定的「${this.deployment.branch}」`, log => {
      if (dirBr === '') {
        this.error = new Error(`目前專案分支為「空字串」`)
      } else if (dirBr != goalBr) {
        this.error = new Error(`目前專案分支是「${dirBr}」，不是指定的分支「${this.deployment.branch}」`)
      } else {
        this.error = null
      }

      this.error
        ? this.model.hook.logFailAndNotify(log, func)
        : this.model.hook.logDoneAndNotify(log, func)
    })
  }

  this.model.hook.createLogAndNotify(`執行指令 git rev-parse --abbrev-ref HEAD`, log => {
    Exec(`cd ${this.deployment.dir} && git rev-parse --abbrev-ref HEAD`, { maxBuffer: 1024 }, (error, data) => {
      this.error = error

      error
        ? this.model.hook.logFailAndNotify(log, data, next)
        : this.model.hook.logDoneAndNotify(log, data, _ => compare(data.trim(), this.deployment.branch, next))
    })
  })
}
Cron.prototype.gitFetch = function(next) {
  if (!this.model || this.error) {
    return next()
  }
  this.model.hook.createLogAndNotify(`執行指令 git fetch --all`, log => {
    Exec(`cd ${this.deployment.dir} && git fetch --all`, { maxBuffer: 1024 }, (error, data) => {
      this.error = error

      error
        ? this.model.hook.logFailAndNotify(log, data, next)
        : this.model.hook.logDoneAndNotify(log, data, next)
    })
  })
}
Cron.prototype.gitReset = function(next) {
  if (!this.model || this.error) {
    return next()
  }

  this.model.hook.createLogAndNotify(`執行指令 git reset --hard origin/${this.deployment.branch}`, log => {
    Exec(`cd ${this.deployment.dir} && git reset --hard origin/${this.deployment.branch}`, { maxBuffer: 1024 }, (error, data) => {
      this.error = error

      error
        ? this.model.hook.logFailAndNotify(log, data, next)
        : this.model.hook.logDoneAndNotify(log, data, next)
    })
  })
}
Cron.prototype.gitPull = function(next) {
  if (!this.model || this.error) {
    return next()
  }

  this.model.hook.createLogAndNotify(`執行指令 git pull origin ${this.deployment.branch}`, log => {
    Exec(`cd ${this.deployment.dir} && git pull origin ${this.deployment.branch}`, { maxBuffer: 1024 }, (error, data) => {
      this.error = error

      error
        ? this.model.hook.logFailAndNotify(log, data, next)
        : this.model.hook.logDoneAndNotify(log, data, next)
    })
  })
}
Cron.prototype.runCmds = function(next) {
  if (!this.model || this.error) {
    return next()
  }

  let q = Queue()

  for (const command of this.commands)
    q.enqueue(_next => {
      if (this.error) {
        return _next()
      }

      this.model.hook.createLogAndNotify(command.title !== '' ? `執行「${command.title}」，指令：${command.cmd}` : `執行指令：${command.cmd}`, log => {
        Exec(`cd ${this.deployment.dir} && ${command.cmd}`, { maxBuffer: 1024 }, (error, data) => {
          this.error = error

          error
            ? this.model.hook.logFailAndNotify(log, data, _next)
            : this.model.hook.logDoneAndNotify(log, data, _next)
        })
      })
    })

  q.enqueue(_next => next(_next()))
}
Cron.prototype.finally = function(next) {
  if (!this.model) {
    return next()
  }

  if (this.error) { // 中間有錯
    return this._finallyFail(next)
  }

  // 沒錯
  this._finallyDone(next)
}
Cron.prototype._finallyFail = function(next) {
  const dog = Dog()
  
  const q = Queue()
    .enqueue(_next => this.model.hook.fail(this.error, _next))
    .enqueue(_next => dog.bite(_ => {
      Helper.print('部署', this.deployment.title, '失敗', `#${this.model.hook.id}`)
      _next()
      next()
    }))

  const url = typeof Config.webUrl == 'string' && Config.webUrl !== '' && /(http(s?)):\/\//i.test(Config.webUrl) ? `${Config.webUrl.replace(/\/*$/, '')}/?token=${this.model.hook.token}` : ''
  const message = [
    `🔴 #${this.model.hook.id} ${this.deployment.title} 失敗`,
    ...(url ? ['-'.repeat('5'), `${url}`] : []),
    '-'.repeat('5'),
    `提交者：${this.model.hook.commitAuthor}`,
    `時間：${this.model.hook.commitDate}`,
    `分支：${this.model.hook.commitBranch}`,
    `耗時：${this.model.hook.dTime !== null ? this.model.hook.dTime.toFixed(3) : '?'} 秒`,
    '-'.repeat('5'),
    `${this.model.hook.errorMessage}`,
  ].join('\n')

  Promise.all(this.notifies.map(notify => Axios({
    method: 'post',
    baseURL: 'https://notify-api.line.me/api/notify',
    headers: { Authorization: `Bearer ${notify.token}` },
    data: new URL.URLSearchParams({ message })
  })))
    .then(dog.eat)
    .catch(dog.eat)

  return this
}
Cron.prototype._finallyDone = function(next) {
  const dog = Dog()
  const q = Queue()
    .enqueue(_next => this.model.hook.done(_next))
    .enqueue(_next => dog.bite(_ => {
      Helper.print('部署', this.deployment.title, '完成', `#${this.model.hook.id}`)
      _next()
      next()
    }))

  const url = typeof Config.webUrl == 'string' && Config.webUrl !== '' && /(http(s?)):\/\//i.test(Config.webUrl) ? `${Config.webUrl.replace(/\/*$/, '')}/?token=${this.model.hook.token}` : ''
  const message = [
    `✅ #${this.model.hook.id} ${this.deployment.title} 完成`,
    ...(url ? ['-'.repeat('5'), `${url}`] : []),
    '-'.repeat('5'),
    `提交者：${this.model.hook.commitAuthor}`,
    `時間：${this.model.hook.commitDate}`,
    `分支：${this.model.hook.commitBranch}`,
    `耗時：${this.model.hook.dTime !== null ? this.model.hook.dTime.toFixed(3) : '?'} 秒`,
  ].join('\n')

  Promise.all(this.notifies.map(notify => Axios({
    method: 'post',
    baseURL: 'https://notify-api.line.me/api/notify',
    headers: { Authorization: `Bearer ${notify.token}` },
    data: new URL.URLSearchParams({ message })
  })))
    .then(dog.eat)
    .catch(dog.eat)

  return this
}
Cron.prototype.timeout = function(next) {
  this.error = null
  this.model = null
  setTimeout(this.run.bind(this), this.deployment.timer)
  next()
  return this
}
Cron.prototype.run = function() {
  this.queue
    .enqueue(this.dbCheck.bind(this))
    .enqueue(this.updateDeployment.bind(this))
    .enqueue(this.setProcessing.bind(this))
    .enqueue(this.isDir.bind(this))
    .enqueue(this.isGitDir.bind(this))
    .enqueue(this.gitStatus.bind(this))
    .enqueue(this.gitBr.bind(this))
    .enqueue(this.gitFetch.bind(this))
    .enqueue(this.gitReset.bind(this))
    .enqueue(this.gitPull.bind(this))
    .enqueue(this.runCmds.bind(this))
    .enqueue(this.finally.bind(this))
    .enqueue(this.timeout.bind(this))

  return this
}

module.exports = (deployment, notifies, commands) => new Promise((resolve, reject) => setTimeout(_ => resolve(Cron(deployment, notifies, commands).run()), 1))
