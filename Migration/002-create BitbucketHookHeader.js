/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  up (db) {
    db = db.create('BitbucketHookHeader', 'BitbucketHook Header')

    db.attr('id').int().unsigned()
      .notNull()
      .autoIncrement()
      .comment('ID')

    db.attr('bitbucketHookId').int().unsigned()
      .notNull()
      .default(0)
      .comment('Bitbucket Hook ID')

    db.attr('raw').text().collate('utf8mb4_unicode_ci')
      .notNull()
      .comment('原始資料')

// ============

    db.attr('eventKey').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('header: X-Event-Key')
    
    db.attr('uuidHook').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('事件 UUID，header: X-Hook-UUID')
    
    db.attr('uuidRequest').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('請求 UUID，header: X-Request-UUID')

    db.attr('attemptNumber').int().unsigned()
      .notNull()
      .default(0)
      .comment('嘗試次數第，header: X-Attempt-Number')
    
    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    return db
  },
  down: db => db.drop('BitbucketHookHeader')
}