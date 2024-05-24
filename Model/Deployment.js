/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2024
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const Dog       = require('@oawu/dog')
const { Model } = require('@oawu/mysql-orm')

const Deployment = function() {}

Deployment.ENABLE_YES = 'yes'
Deployment.ENABLE_NO  = 'no'
Deployment.ENABLE = {}
Deployment.ENABLE[Deployment.ENABLE_YES] = '啟用'
Deployment.ENABLE[Deployment.ENABLE_NO]  = '停用'

Deployment.Enables = closure => {
  const dog = Dog().bite(data => typeof closure == 'function' && closure(data instanceof Error ? [] : data))

  Deployment.where('enable', Deployment.ENABLE_YES).all()
    .then(deployments => {
      const ids = deployments.map(({ id }) => id)

      const _dog = Dog().bite(data => {
        if (data instanceof Error) {
          return dog.eat(data)
        }

        const [notifies, commands] = data
        const _notifies = {}
        const _commands = {}

        for (const notify of notifies) {
          if (notify.token) {
            if (_notifies[notify.deploymentId] === undefined) {
              _notifies[notify.deploymentId] = []
            }
            _notifies[notify.deploymentId].push(notify)
          }
        }

        for (const command of commands) {
          if (command.cmd) {
            if (_commands[command.deploymentId] === undefined) {
              _commands[command.deploymentId] = []
            }
            _commands[command.deploymentId].push(command)
          }
        }

        const objs = deployments.map(deployment => ({
          deployment, 
          notifies: _notifies[deployment.id] || [], //notifies.filter(({ deploymentId }) => deployment.id == deploymentId),
          commands: _commands[deployment.id] || [], //commands.filter(({ deploymentId }) => deployment.id == deploymentId),
        }))

        return dog.eat(objs)
      })

      Promise.all(ids.length ? [Model.DeploymentNotify.where('deploymentId', ids).all(), Model.DeploymentCommand.where('deploymentId', ids).all()] : [[], []])
        .then(_dog.eat)
        .catch(_dog.eat)
    })
    .catch(dog.eat)
}

module.exports = Deployment
