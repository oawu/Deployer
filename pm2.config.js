/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

module.exports = {
  apps : [
    {
      name: 'deploy',

      max_memory_restart: '512M',

      script: 'Server.js',
      args: '-PM2',

      log_file: 'File/Log/Server.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    }
  ]
}
