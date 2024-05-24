/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  up (db) {
    db = db.create('DeploymentCommand', '部署指令')

    db.attr('id').int().unsigned()
      .notNull()
      .autoIncrement()
      .comment('ID')

    db.attr('deploymentId').int().unsigned()
      .notNull()
      .default(0)
      .comment('Deployment ID')

// ============

    db.attr('title').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('標題')

    db.attr('cmd').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('指令')

// ============

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    return db
  },
  down: db => db.drop('DeploymentCommand')
}