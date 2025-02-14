/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  up (db) {
    db = db.create('BitbucketHookPayload', 'BitbucketHook Payload')

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

    db.attr('actorName').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('推送提交的用戶-名稱')

    db.attr('actorNickname').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('推送提交的用戶-暱稱')

    db.attr('actorAvatar').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('推送提交的用戶-頭像')

    db.attr('actorLink').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('推送提交的用戶-鏈結')

    db.attr('repoFullname').varchar(100).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('存儲庫-名稱，payload: repository.full_name')

    db.attr('repoName').varchar(100).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('存儲庫-名稱，payload: repository.name')

// ============

    db.attr('chgNewName').varchar(50).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('此次異動-分支名稱，payload: push.changes.new.name')

    db.attr('chgNewHash').varchar(50).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('此次異動-Commit Hash，payload: push.changes.new.target.hash')

    db.attr('chgNewDate').datetime()
      .default(null)
      .comment('此次異動-日期，payload: push.changes.new.target.date')

    db.attr('chgNewAuthor').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('此次異動-用戶，payload: push.changes.new.target.author.raw')

    db.attr('chgNewLink').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('此次異動-鏈結，payload: push.changes.new.target.links.html.href')

    db.attr('chgNewMsg').text().collate('utf8mb4_unicode_ci')
      .notNull()
      .comment('此次異動-鏈結，payload: push.changes.new.target.message')

// ============

    db.attr('chgOldName').varchar(50).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('上次異動-分支名稱，payload: push.changes.old.name')

    db.attr('chgOldHash').varchar(50).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('上次異動-Commit，payload: push.changes.old.target.hash')

    db.attr('chgOldDate').datetime()
      .default(null)
      .comment('上次異動-日期，payload: push.changes.old.target.date')

    db.attr('chgOldAuthor').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('上次異動-用戶，payload: push.changes.old.target.author.raw')

    db.attr('chgOldwLink').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('上次異動-鏈結，payload: push.changes.old.target.links.html.href')

    db.attr('chgOldMsg').text().collate('utf8mb4_unicode_ci')
      .notNull()
      .comment('此次異動-鏈結，payload: push.changes.old.target.message')

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    return db
  },
  down: db => db.drop('BitbucketHookPayload')
}