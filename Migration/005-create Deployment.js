/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
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

    db.attr('workflowId').int().unsigned()
      .notNull()
      .default(0)
      .comment('Workflow ID')

    // db.attr('bitbucketHookId').int().unsigned()
    //   .notNull()
    //   .default(0)
    //   .comment('BitbucketHook ID')

    // db.attr('cliTriggerId').int().unsigned()
    //   .notNull()
    //   .default(0)
    //   .comment('CliTrigger ID')


// ============

    db.attr('type')
      .enum(...[
        'local',
        'ssh-password',
        'ssh-key',
      ]).collate('utf8mb4_unicode_ci')
      .default('local')
      .notNull()
      .comment('類型')

    db.attr('sshHost').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('SSH Host')

    db.attr('sshUser').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('SSH User')

    db.attr('sshPort').smallint().unsigned()
      .notNull()
      .default(22)
      .comment('SSH Port')

    db.attr('sshPassword').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('SSH 連線密碼')

    db.attr('sshKeyPath').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('SSH 連線私鑰檔案位置')

// ============

    db.attr('enable')
      .enum(...[
        'yes',
        'no',
      ]).collate('utf8mb4_unicode_ci')
      .default('no')
      .notNull()
      .comment('是否使用')

    db.attr('force')
      .enum(...[
        'yes',
        'no',
      ]).collate('utf8mb4_unicode_ci')
      .default('no')
      .notNull()
      .comment('當專案有 git 異動時，是否忽略強制部署？')

    db.attr('title').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('標題')

    db.attr('fullname').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('Butbucket fullname')

    db.attr('branch').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('main')
      .comment('目標分支')

    db.attr('dir').varchar(190).collate('utf8mb4_unicode_ci')
      .notNull()
      .default('')
      .comment('目錄')

// ============

    // db.attr('lastAt').datetime()
    //   .default(null)
    //   .comment('上次部署時間')

// ============

    db.attr('updateAt').datetime().notNull().default('CURRENT_TIMESTAMP').on('update', 'CURRENT_TIMESTAMP').comment('更新時間')
    db.attr('createAt').datetime().notNull().default('CURRENT_TIMESTAMP').comment('新增時間')

    db.primaryKey('id')
    return db
  },
  down: db => db.drop('Deployment')
}