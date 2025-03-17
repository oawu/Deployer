/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  up (db) {
    db = db.create('CliTrigger', 'CliTrigger 紀錄')

    db.attr('id').int().unsigned()
      .notNull()
      .autoIncrement()
      .comment('ID')

    db.attr('uid').varchar(36).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('UUID')

    db.attr('fullname').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('Butbucket fullname')

    db.attr('branch').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('main')
      .comment('目標分支')

// ============

    db.attr('username').varchar(190).collate('utf8mb4_unicode_ci')
    .notNull()
    .comment('帳號')

    db.attr('os').varchar(190).collate('utf8mb4_unicode_ci')
    .notNull()
    .comment('作業系統')

    db.attr('version').varchar(190).collate('utf8mb4_unicode_ci')
    .notNull()
    .comment('作業系統版本')

    db.attr('publicIp').varchar(190).collate('utf8mb4_unicode_ci')
    .notNull()
    .comment('公開 IP')

    db.attr('networks').text().collate('utf8mb4_unicode_ci')
      .notNull()
      .comment('網路卡資訊')


// ============

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    return db
  },
  down: db => db.drop('CliTrigger')
}