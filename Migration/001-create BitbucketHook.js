/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  up (db) {
    db = db.create('BitbucketHook', 'BitbucketHook 紀錄')

    db.attr('id').int().unsigned()
      .notNull()
      .autoIncrement()
      .comment('ID')

    db.attr('uid').varchar(36).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('Request UUID ID')

    db.attr('fullname').varchar(100).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('BitbucketHookPayload 的 repoFullname')

// ============

    // db.attr('deploymentId').int().unsigned()
    //   .notNull()
    //   .default(0)
    //   .comment('Deployment ID')

    // db.attr('workflowId').int().unsigned()
    //   .notNull()
    //   .default(0)
    //   .comment('Workflow ID')

// ============

    db.attr('commitBranch').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('此次異動-Hash，payload: push.changes.new.name')

    db.attr('commitHash').varchar(50).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('此次異動-Hash，payload: push.changes.new.target.hash')

    db.attr('commitDate').datetime()
      .default(null)
      .comment('此次異動-日期，payload: push.changes.new.target.date')

    db.attr('commitAuthor').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('此次異動-用戶，payload: push.changes.new.target.author.raw')

// ============

    // db.attr('sTime').decimal(13, 3).unsigned()
    //   .default(null)
    //   .comment('start unix time, 單位：秒')

    // db.attr('eTime').decimal(13, 3).unsigned()
    //   .default(null)
    //   .comment('end unix time, 單位：秒')

    // db.attr('dTime').decimal(13, 3).unsigned()
    //   .default(null)
    //   .comment('Duration unix time, 單位：秒')

// ============

    db.attr('bitbucketHookHeaderId').int().unsigned()
      .notNull()
      .default(0)
      .comment('BitbucketHook Header ID')

    db.attr('bitbucketHookPayloadId').int().unsigned()
      .notNull()
      .default(0)
      .comment('BitbucketHook Payload ID')

    // db.attr('errorMessage').text().collate('utf8mb4_unicode_ci')
    //   .notNull()
    //   .comment('錯誤訊息')

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    return db
  },
  down: db => db.drop('BitbucketHook')
}