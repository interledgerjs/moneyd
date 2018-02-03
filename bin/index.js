#!/usr/bin/env node
const chalk = require('chalk')
const fs = require('fs')
const fetch = require('node-fetch')
const inquirer = require('inquirer')
const DEFAULT_RIPPLED = 'wss://s1.ripple.com'
const DEFAULT_TESTNET_RIPPLED = 'wss://s.altnet.rippletest.net:51233'
const banner = chalk.green(`                                                                           88
                                                                           88
                                                                           88
88,dPYba,,adPYba,   ,adPPYba,  8b,dPPYba,   ,adPPYba, 8b       d8  ,adPPYb,88
88P'   "88"    "8a a8"     "8a 88P'   \`"8a a8P_____88 \`8b     d8' a8"    \`Y88
88      88      88 8b       d8 88       88 8PP"""""""  \`8b   d8'  8b       88
88      88      88 "8a,   ,a8" 88       88 "8b,   ,aa   \`8b,d8'   "8a,   ,d88
88      88      88  \`"YbbdP"'  88       88  \`"Ybbd8"'     Y88'     \`"8bbdP"Y8
                                                          d8'
                                                         d8'`)

require('yargs')
  .option('parent', {
    description: 'BTP host of your parent connector, e.g. "client.scyl.la"'
  })
  .option('secret', {
    description: 'XRP secret, "s..."'
  })
  .option('config', {
    alias: 'c',
    description: 'JSON config file'
  })
  .option('address', {
    description: 'XRP address. Can be derived from secret.',
    default: ''
  })
  .option('rippled', {
    default: 'wss://s1.ripple.com',
    description: 'Rippled server. Uses S1 server provided by Ripple by default.'
  })
  .option('name', {
    default: '',
    description: 'Name to assign to this channel. Must be changed if other parameters are changed.'
  })
  .command('start', 'launch moneyd', {
    quiet: {
      alias: 'q',
      type: 'boolean',
      default: false,
      description: 'Don\'t print the banner on startup.'
    }
  }, argv => {
    if (argv.config) {
      const config = JSON.parse(fs.readFileSync(argv.config).toString())
      process.env.BTP_NAME = config.name || ''
      process.env.PARENT_BTP_HOST = config.parent || ''
      process.env.XRP_SECRET = config.secret || ''
      process.env.XRP_ADDRESS = config.address || ''
      process.env.XRP_SERVER = config.rippled || argv.rippled || ''
    } else {
      process.env.BTP_NAME = argv.name
      process.env.PARENT_BTP_HOST = argv.parent
      process.env.XRP_SECRET = argv.secret
      process.env.XRP_ADDRESS = argv.address
      process.env.XRP_SERVER = argv.rippled
    }

    if (!argv.quiet) {
      console.log(banner)
    }

    console.log('set environment; starting moneyd')
    require('..')
  })
  .command('topup', 'pre-fund your balance with connector', {
    amount: {
      description: 'amount (in drops) to send to connector',
      default: 1000
    }
  }, argv => {
    if (argv.config) {
      const config = JSON.parse(fs.readFileSync(argv.config).toString())
      process.env.BTP_NAME = config.name || ''
      process.env.PARENT_BTP_HOST = config.parent || ''
      process.env.XRP_SECRET = config.secret || ''
      process.env.XRP_ADDRESS = config.address || ''
      process.env.XRP_SERVER = config.rippled || argv.rippled || ''
    } else {
      process.env.BTP_NAME = argv.name
      process.env.PARENT_BTP_HOST = argv.parent
      process.env.XRP_SECRET = argv.secret
      process.env.XRP_ADDRESS = argv.address
      process.env.XRP_SERVER = argv.rippled
    }

    console.log('set environment; starting moneyd')
    require('./settle.js')
  })
  .command('cleanup', 'clean up unused payment channels', {}, argv => {
    if (argv.config) {
      const config = JSON.parse(fs.readFileSync(argv.config).toString())
      process.env.XRP_SECRET = config.secret || ''
      process.env.XRP_ADDRESS = config.address || ''
      process.env.XRP_SERVER = config.rippled || argv.rippled || ''
    } else {
      process.env.XRP_SECRET = argv.secret
      process.env.XRP_ADDRESS = argv.address
      process.env.XRP_SERVER = argv.rippled
    }
    require('./cleanup.js')
  })
  .command('info', 'get info about your XRP account and payment channels', {}, argv => {
    if (argv.config) {
      const config = JSON.parse(fs.readFileSync(argv.config).toString())
      process.env.XRP_SECRET = config.secret || ''
      process.env.XRP_ADDRESS = config.address || ''
      process.env.XRP_SERVER = config.rippled || argv.rippled || ''
    } else {
      process.env.XRP_SECRET = argv.secret
      process.env.XRP_ADDRESS = argv.address
      process.env.XRP_SERVER = argv.rippled
    }
    process.env.INFO_MODE = 'true'
    require('./cleanup.js')
  })
  .command('configure', 'generate a configuration file', {
    testnet: {
      alias: 't',
      type: 'boolean',
      default: false
    }
  }, async argv => {
    if (!argv.config) {
      console.error('config file to output must be specified (--config)')
      process.exit(1)
    }

    if (!argv.testnet && !argv.secret) {
      console.error('XRP secret must be specified (--secret)')
      process.exit(1)
    }

    if (argv.testnet) {
      if (argv.rippled === DEFAULT_RIPPLED) {
        console.log('setting testnet rippled server...')
        argv.rippled = DEFAULT_TESTNET_RIPPLED
      }

      if (!argv.secret) {
        console.log('acquiring testnet account...')
        const res = await fetch('https://faucet.altnet.rippletest.net/accounts', { method: 'POST' })
        const json = await res.json()

        argv.address = json.account.address
        argv.secret = json.account.secret
        console.log('got testnet address "' + argv.address + '"')
      }
    }

    if (fs.existsSync(argv.config)) {
      console.error('config file already exists. file=' + argv.config)
      process.exit(1)
    }

    if (!argv.parent) {
      console.log('selecting a parent from connector list...')
    }

    const list = require('../connector_list.json')
    const servers = list[argv.testnet ? 'test' : 'live']
    const parent = argv.parent || servers[Math.floor(Math.random() * servers.length)]

    const config = {
      secret: argv.secret,
      rippled: argv.rippled,
      parent
    }

    if (argv.name) {
      config.name = argv.name
    }

    if (argv.address) {
      config.address = argv.address
    }

    console.log('writing config file...')
    fs.writeFileSync(argv.config, JSON.stringify(config, null, 2))
    console.log('written to', argv.config)
  })
  .command('*', '', {}, argv => {
    console.error('unknown command.')
    process.exit(0)
  })
  .argv
