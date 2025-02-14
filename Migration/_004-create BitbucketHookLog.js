/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  up (db) {
    db = db.create('BitbucketHookLog', 'Bitbucket Hook Log')

    db.attr('id').int().unsigned()
      .notNull()
      .autoIncrement()
      .comment('ID')

    db.attr('bitbucketHookId').int().unsigned()
      .notNull()
      .default(0)
      .comment('Bitbucket Hook ID')

// ============

    db.attr('title').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('標題')

    db.attr('output').text().collate('utf8mb4_unicode_ci')
      .notNull()
      .comment('輸出')

    db.attr('status')
      .enum(...[
        'ing',
        'done',
        'fail'
      ])
      .collate('utf8mb4_unicode_ci')
      .default('ing')
      .notNull()
      .comment('狀態')

// ============

    db.attr('sTime').decimal(13, 3).unsigned()
      .default(null)
      .comment('start unix time, 單位：秒')

    db.attr('eTime').decimal(13, 3).unsigned()
      .default(null)
      .comment('end unix time, 單位：秒')

    db.attr('dTime').decimal(13, 3).unsigned()
      .default(null)
      .comment('Duration unix time, 單位：秒')

// ============

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    return db
  },
  down: db => db.drop('BitbucketHookLog')
}