# OA's Deployer 工具

一個可以自動部署的工具，部署過程可以同步至 [Telegram](https://telegram.org/)，如下影片：

[![Demo 影片](https://img.youtube.com/vi/bBBbD8d72LE/0.jpg)](https://www.youtube.com/watch?v=bBBbD8d72LE)

[觀看示範影片](https://www.youtube.com/watch?v=bBBbD8d72LE)


## 步驟
* `git clone`
* `npm i`
* 設定 `Config.js`
* DB 新增 Deployment 功能

## 啟動
* 使用 PM2 來啟動，`pm2 start pm2.config.js --only deployer`
* 注意！DB 如有新增 Deployment 的話，記得重開 PM2，可執行 `pm2 restart deployer`

## 其他
* 列出 `pm2 list`
* 監控 `pm2 monit`
* 移除 `pm2 kill`
* 全部停止 `pm2 stop all`
* 全部刪除 `pm2 delete all`
* 全部重開 `pm2 restart all`
