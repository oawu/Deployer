/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  up (db) {
    db = db.create('Deployment', '部署目標')

    db.attr('id').int().unsigned()
      .notNull()
      .autoIncrement()
      .comment('ID')

    db.attr('bitbucketHookId').int().unsigned()
      .notNull()
      .default(0)
      .comment('BitbucketHook ID')

// ============

    db.attr('enable')
      .enum(...[
        'yes',
        'no',
      ]).collate('utf8mb4_unicode_ci')
      .default('no')
      .notNull()
      .comment('是否使用')

    db.attr('title').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('標題')

    db.attr('timer').int().unsigned()
      .notNull()
      .default(3000)
      .comment('檢查的間隔時間，千分之一秒')

    db.attr('fullname').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('Butbucket fullname')

    db.attr('branch').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default(3000)
      .comment('目標分支')

    db.attr('dir').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('目錄')

// ============

    db.attr('lastAt').datetime()
      .default(null)
      .comment('上次部署時間')

// ============

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    return db
  },
  down: db => db.drop('Deployment')
}