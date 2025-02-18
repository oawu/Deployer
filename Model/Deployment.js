/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

// const Dog       = require('@oawu/dog')

const Deployment = function () { }

Deployment.ENABLE_YES = 'yes'
Deployment.ENABLE_NO = 'no'
Deployment.ENABLE = {}
Deployment.ENABLE[Deployment.ENABLE_YES] = '啟用'
Deployment.ENABLE[Deployment.ENABLE_NO] = '停用'

Deployment.FORCE_YES = 'yes'
Deployment.FORCE_NO = 'no'
Deployment.FORCE = {}
Deployment.FORCE[Deployment.FORCE_YES] = '強制'
Deployment.FORCE[Deployment.FORCE_NO] = '不強制'

Deployment.TYPE_LOCAL = 'local'
Deployment.TYPE_SSH_PASSWORD = 'ssh-password'
Deployment.TYPE_SSH_KEY = 'ssh-key'
Deployment.TYPE = {}
Deployment.TYPE[Deployment.TYPE_LOCAL] = '本地'
Deployment.TYPE[Deployment.TYPE_SSH_PASSWORD] = 'SSH 密碼'
Deployment.TYPE[Deployment.TYPE_SSH_KEY] = 'SSH 私鑰'

module.exports = Deployment
