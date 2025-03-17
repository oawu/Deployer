/**
 * @author      OA Wu <oawu.tw@gmail.com>
 * @copyright   Copyright (c) 2015 - 2025
 * @license     http://opensource.org/licenses/MIT  MIT License
 * @link        https://www.ioa.tw/
 */

const uuid = require('uuid')

const { Model } = require('@oawu/mysql-orm')
const { tryIgnore, date, Type: T } = require('@oawu/helper')

const Path = require('@oawu/_Path')

const Telegram = require(`${Path.lib}Telegram.js`)
const Map = require(`${Path.lib}Workflow${Path.$.sep}Map.js`)

const Err = require(`${Path.lib}Workflow${Path.$.sep}Err.js`)
const Pass = require(`${Path.lib}Workflow${Path.$.sep}Pass.js`)
const Failure = require(`${Path.lib}Workflow${Path.$.sep}Failure.js`)

const Cancel = require(`${Path.lib}Workflow${Path.$.sep}Cancel.js`)
const Start = require(`${Path.lib}Workflow${Path.$.sep}Start.js`)
const Check = require(`${Path.lib}Workflow${Path.$.sep}Check.js`)
const Git = require(`${Path.lib}Workflow${Path.$.sep}Git.js`)
const Update = require(`${Path.lib}Workflow${Path.$.sep}Update.js`)
const RunCmds = require(`${Path.lib}Workflow${Path.$.sep}RunCmds.js`)
const Success = require(`${Path.lib}Workflow${Path.$.sep}Success.js`)

const _telegram = async data => {
  const telegram = Telegram()
  Map.telegram.set(data.workflow.id, telegram)

  const texts = []
  const logs = []

  if (data.trigger.cli instanceof Model.CliTrigger) {
    texts.push(
      `【部署開始】cli #${data.trigger.cli.id} | deployment #${data.deployment.id} | workflow #${data.workflow.id}`,
      [
        `<blockquote>`,
        [
          `📂 專案：<code>${data.deployment.title}</code> | 🌲 分支：<code>${data.deployment.branch}</code>`,
          `🧑🏽‍💻 提交者：${data.trigger.cli.os}-${data.trigger.cli.username}`,
          `⏰ 時間：<code>${date()}</code>`,
          `📝 IP：${data.trigger.cli.publicIp}`,
        ].join('\n'),
        `</blockquote>`,
      ].join(''),
    )
    logs.push(
      `【部署開始】cli #${data.trigger.cli.id} | deployment #${data.deployment.id} | workflow #${data.workflow.id}`,
      `📂 專案：${data.deployment.title} | 🌲 分支：${data.deployment.branch}`,
      `🧑🏽‍💻 提交者：${data.trigger.cli.os}-${data.trigger.cli.username}`,
      `⏰ 時間：${date()}`,
      `📝 IP：${data.trigger.cli.publicIp}`,
    )
  }
  if (data.trigger.hook instanceof Model.BitbucketHook) {
    texts.push(
      `【部署開始】hook #${data.trigger.hook.id} | deployment #${data.deployment.id} | workflow #${data.workflow.id}`,
      [
        `<blockquote>`,
        [
          `📂 專案：<code>${data.deployment.title}</code> | 🌲 分支：<code>${data.deployment.branch}</code>`,
          `🧑🏽‍💻 提交者：<a href="${data.trigger.payload.actorLink}">${data.trigger.payload.actorName}（${data.trigger.payload.actorNickname}）</a>`,
          `⏰ 時間：<code>${data.trigger.hook.createAt}</code>`,
          `📝 紀錄：<a href="${data.trigger.payload.chgNewLink}">${data.trigger.payload.chgNewHash}</a>`,
        ].join('\n'),
        `</blockquote>`,
      ].join(''),
    )
    logs.push(
      `【部署開始】hook #${data.trigger.hook.id} | deployment #${data.deployment.id} | workflow #${data.workflow.id}`,
      `📂 專案：${data.deployment.title} | 🌲 分支：${data.deployment.branch}`,
      `🧑🏽‍💻 提交者：${data.trigger.payload.actorName}（${data.trigger.payload.actorNickname}） - ${data.trigger.payload.actorLink}`,
      `⏰ 時間：${data.trigger.hook.createAt}`,
      `📝 紀錄：${data.trigger.payload.chgNewHash} - ${data.trigger.payload.chgNewLink}`,
    )
  }

  for (const log of logs) {
    data.logger(log)
  }

  await telegram.push(Telegram.Message(texts.join('\n')))
}
const _reset = async (logger, trigger, deployment) => {
  deployment.workflowId = 0

  const _workflows = await tryIgnore(Model.Workflow.where('deploymentId', deployment.id).select('id', 'status', 'sTime', 'eTime', 'dTime').all(), [])

  const workflows = _workflows
    .reduce((a, b) => a.concat(b), [])
    .filter(workflow => workflow !== null && [Model.Workflow.STATUS_PENDING, Model.Workflow.STATUS_RUNNING].includes(workflow.status))

  const _tmp = {}

  for (const workflow of workflows) {
    if (_tmp[workflow.id] === true) {
      continue
    } else {
      _tmp[workflow.id] = true
    }

    Map.isRunning.delete(workflow.id)
    Cancel({ trigger, logger, deployment, workflow, logs: [] }).execute()
  }

  await deployment.save()
}
const _start = async (logger, trigger, deployment, isIgnoreErrors = true) => {
  await _reset(logger, trigger, deployment)

  let param = {}
  if (trigger.cli instanceof Model.CliTrigger) {
    param = { cliTriggerId: trigger.cli.id, deploymentId: deployment.id, uid: uuid.v4() }
  }
  if (trigger.hook instanceof Model.BitbucketHook) {
    param = { bitbucketHookId: trigger.hook.id, deploymentId: deployment.id, uid: uuid.v4() }
  }

  try {
    const [commands, workflow] = await Promise.all([
      Model.DeploymentCommand.where('deploymentId', deployment.id).all(),
      Model.Workflow.create(param),
    ])

    Map.isRunning.set(workflow.id, true)

    const data = { trigger, logger, deployment, workflow, commands, logs: [] }

    await _telegram(data)

    await Start(data).execute()
    await Check(data).execute()
    await Git(data).execute()
    await Update(data).execute()
    await RunCmds(data).execute()
    await Success(data).execute()
  } catch (error) {
    if (error instanceof Pass) {
      return
    }

    if (error instanceof Err) {
      return await Failure(error.data, error).execute()
    }

    if (!isIgnoreErrors) {
      throw error
    }
  }
}

module.exports = async (trigger, logger, isIgnoreErrors = true) => {
  let deployments = []

  if (trigger.cli instanceof Model.CliTrigger) {
    deployments = await Model.Deployment
      .where('enable', Model.Deployment.ENABLE_YES)
      .where('fullname', trigger.cli.fullname)
      .where('branch', trigger.cli.branch)
      .all()
  } else if (trigger.hook instanceof Model.BitbucketHook) {
    deployments = await Model.Deployment
      .where('enable', Model.Deployment.ENABLE_YES)
      .where('fullname', trigger.hook.fullname)
      .where('branch', trigger.hook.commitBranch)
      .all()
  } else {
    deployments = []
  }

  await Promise.all(deployments.map(deployment => _start(logger, trigger, deployment, isIgnoreErrors)))
}
