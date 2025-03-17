/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  up (db) {
    db = db.create('Workflow', '部署流程')

    db.attr('id').int().unsigned()
      .notNull()
      .autoIncrement()
      .comment('ID')

    db.attr('deploymentId').int().unsigned()
      .notNull()
      .default(0)
      .comment('Deployment ID')

    db.attr('bitbucketHookId').int().unsigned()
      .notNull()
      .default(0)
      .comment('BitbucketHook ID')

    db.attr('cliTriggerId').int().unsigned()
      .notNull()
      .default(0)
      .comment('CliTrigger ID')

// ============

    db.attr('status')
      .enum(...[
        'pending',
        'running',
        'failure',
        'cancel',
        'success',
      ]).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('pending')
      .comment('狀態')

// ============

    db.attr('uid').varchar(36).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('UUID')

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
  down: db => db.drop('Workflow')
}