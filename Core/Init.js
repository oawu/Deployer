/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const FileSystem = require('fs')

const Queue     = require('@oawu/queue')
const Path      = require('@oawu/_Path')
const { print } = require('@oawu/_Helper')

const configPath        = `${Path.root}Config.js`
const configExamplePath = `${Path.root}File${Path.$.sep}Config.example.js`

Queue()
  .enqueue(next => {

    print(` :: 檢查 Config.js 是否存在？`)

    FileSystem.exists(configPath, exist => {
      if (exist) {
        print(`    ➜ 存在`)
        next(true)
      } else {
        print(`    ➜ 不存在`)
        next(false)
      }
    })
  })
  .enqueue((next, exist) => {
    if (exist) {
      return next()
    }

    print(`\n :: 複製 Config.example.js 建立 Config.js…`)
    FileSystem.copyFile(configExamplePath, configPath, next)
  })
  .enqueue((next, error) => {
    if (error) {
      print(`    ➜ 失敗，錯誤原因：${error instanceof Error ? error.message : error}`)
    } else {
      print(`    ➜ 完成`)
      print(`\n ※ 注意！請記得修改 Config.js 內的數值！\n`)
    }
    next()
  })
