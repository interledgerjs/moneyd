'use strict'
const inquirer = require('inquirer')
const table = require('good-table')
const chalk = require('chalk')
const Plugin = require('ilp-plugin-xrp-asym-client')
const Connector = require('ilp-connector')

exports.settle = async (config, {amount}) => {
  const plugin = new Plugin(config.xrpPluginOptions())
  await plugin.connect()
  await plugin.sendMoney(amount)
}

exports.startFull = (config, allowedOrigins) => Connector.createApp({
  spread: 0,
  backend: 'one-to-one',
  store: 'ilp-store-memory',
  initialConnectTimeout: 60000,
  env: config.environment,
  adminApi: !!config.adminApiPort,
  adminApiPort: config.adminApiPort,
  accounts: {
    parent: {
      relation: 'parent',
      plugin: 'ilp-plugin-xrp-asym-client',
      assetCode: 'XRP',
      assetScale: 6,
      balance: {
        minimum: '-Infinity',
        maximum: '20000',
        settleThreshold: '5000',
        settleTo: '10000'
      },
      options: config.xrpPluginOptions()
    },
    local: {
      relation: 'child',
      plugin: 'ilp-plugin-mini-accounts',
      assetCode: 'XRP',
      assetScale: 6,
      balance: {
        minimum: '-Infinity',
        maximum: 'Infinity',
        settleThreshold: '-Infinity'
      },
      options: {
        wsOpts: {
          host: 'localhost',
          port: 7768
        },
        allowedOrigins
      }
    }
  }
}).listen()

exports.startLocal = (allowedOrigins) => Connector.createApp({
  spread: 0,
  backend: 'one-to-one',
  store: 'ilp-store-memory',
  initialConnectTimeout: 60000,
  ilpAddress: 'test.moneyd.',
  accounts: {
    local: {
      relation: 'child',
      plugin: 'ilp-plugin-mini-accounts',
      assetCode: 'XRP',
      assetScale: 6,
      balance: {
        minimum: '-Infinity',
        maximum: 'Infinity',
        settleThreshold: '-Infinity'
      },
      options: {
        wsOpts: {
          host: 'localhost',
          port: 7768
        },
        allowedOrigins
      }
    }
  }
}).listen()

exports.info = async (config) => {
  const api = await config.rippleApi()
  console.log('getting account...')
  const res = await api.getAccountInfo(config.xrpAddress)
  console.log(chalk.green('balance: '), res.xrpBalance + ' XRP')
  console.log(chalk.green('account: '), config.xrpAddress)

  const channels = await api.connection.request({
    command: 'account_channels',
    account: config.xrpAddress
  })

  const formatted = table([
    [ chalk.green('index'),
      chalk.green('destination'),
      chalk.green('amount (drops)'),
      chalk.green('balance (drops)'),
      chalk.green('closing') ],
    ...channels.channels.map((c, i) =>
      [ String(i), c.destination_account, c.amount, c.balance,
        (c.expiration ? 'yes' : '')])
  ])
  console.log(formatted)
}

exports.cleanup = async (config) => {
  await exports.info(config)
  const api = await config.rippleApi()

  const channels = await api.connection.request({
    command: 'account_channels',
    account: config.xrpAddress
  })

  const result = await inquirer.prompt({
    type: 'checkbox',
    name: 'marked',
    message: 'which of these channels would you like to close?',
    choices: channels.channels.map((c, i) => {
      return !c.expiration && String(i)
    }).filter(e => e)
  })

  for (const index of result.marked) {
    console.log('closing', index + '...')
    const tx = await api.preparePaymentChannelClaim(config.xrpAddress, {
      channel: channels.channels[index].channel_id,
      close: true
    })

    const signedTx = api.sign(tx.txJSON, config.xrpSecret)
    const {resultCode, resultMessage} = await api.submit(signedTx.signedTransaction)
    if (resultCode !== 'tesSUCCESS') {
      console.error('WARNING: Error submitting close: ', resultMessage)
    }
  }
  console.log('closed!')
  process.exit(0)
}
