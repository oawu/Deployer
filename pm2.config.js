/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  apps : [
    {
      name: 'deployer',

      max_memory_restart: '512M',

      script: 'Serve.js',
      args: '-PM2',

      log_file: 'File/Log/Pm2/Server.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
