/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const fs = require('fs/promises')
const Path = require('@oawu/_Path')

const print = (...texts) => {
  for (let text of texts) {
    if (text instanceof Error) {
      text = text.message
    }
    process.stdout.write(`${text}\n`)
  }

  return true
}

const main = async _ => {
  print(``)
  print(` :: 檢查 Config.js 是否存在？`)

  const file1 = `${Path.root}Config.js`
  const file2 = `${Path.root}File${Path.$.sep}Config.example.js`

  let exist = false
  let stat = null
  try {
    await fs.access(file1, fs.constants.R_OK)
    stat = await fs.stat(file1)
    exist = true
  } catch (_) {
    exist = false
    stat = null
  }

  if (exist && stat !== null) {
    print(`    ➜ 存在`)

    if (stat.isDirectory()) {
      throw new Error(' Config.js 為目錄，請檢查專案。')
    } else {
      return
    }
  }

  print(`    ➜ 不存在`)

  print(` :: 複製 Config.example.js 建立 Config.js…`)
  let error = null
  try {
    await fs.copyFile(file2, file1)
    error = null
  } catch (_error) {
    error = _error
  }

  if (error !== null) {
    print(`    ➜ 失敗`)
    throw error
  }

  exist = false
  stat = null
  try {
    await fs.access(file1, fs.constants.R_OK)
    stat = await fs.stat(file1)
    exist = true
  } catch (_) {
    exist = false
    stat = null
  }

  if (exist && stat !== null) {
    print(`    ➜ 成功`)
  } else {
    print(`    ➜ 失敗`)
  }
}

main()
  .then(_ => {
    print(``)
    print(` ※ 注意！請記得修改 Config.js 內的數值！`)
    print(``)
  })
  .catch(async error => {
    print(``)
    print(` :: 發生錯誤`)
    print(``)
    print(`錯誤訊息：${error.message}`);
    print(``)
  })
  .finally(async _ => {

  })
