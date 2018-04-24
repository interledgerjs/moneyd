#!/usr/bin/env node
const chalk = require('chalk')
const path = require('path')
const fs = require('fs')
const Moneyd = require('../src')
const HOME = require('os').homedir()
const DEFAULT_CONFIG = path.join(HOME, '.moneyd.json')
const DEFAULT_TESTNET_CONFIG = path.join(HOME, '.moneyd.test.json')
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

// eslint-disable-next-line no-unused-expressions
require('yargs')
  .option('config', {
    alias: 'c',
    default: DEFAULT_CONFIG,
    description: 'JSON config file'
  })
  .option('unsafe-allow-extensions', {
    type: 'boolean',
    default: false,
    description: 'Whether to accept connections from arbitrary browser extensions (Warning: this is unsafe)'
  })
  .option('allow-origin', {
    type: 'string',
    description: 'Accept connections from the indicated origin'
  })
  .option('testnet', {
    alias: 't',
    type: 'boolean',
    default: false,
    description: 'Whether to use the testnet config file'
  })
  .option('admin-api-port', {
    type: 'number',
    description: 'Port on which to expose admin API (not exposed if unspecified)'
  })

  .command('local', 'Launch moneyd with no uplink into the network, for local testing', {}, argv => {
    console.log('launching local moneyd...')
    const moneyd = getMoneyd(argv)
    moneyd.startLocal().catch(onError)
  })

  .command('start', 'Launch moneyd', {
    quiet: {
      alias: 'q',
      type: 'boolean',
      default: false,
      description: 'Don\'t print the banner on startup.'
    }
  }, argv => {
    if (!argv.quiet) {
      console.log(banner)
    }
    console.log('starting moneyd')
    const moneyd = getMoneyd(argv)
    moneyd.startConnector().catch(onError)
  })

  .command('topup', 'Pre-fund your balance with connector', {
    amount: {
      description: 'amount to send to connector',
      demandOption: true
    }
  }, argv => {
    const moneyd = getMoneyd(argv)
    moneyd.settle({amount: argv.amount}).then(done).catch(onError)
  })

  .command('cleanup', 'Clean up unused payment channels', {}, argv => {
    const moneyd = getMoneyd(argv)
    moneyd.cleanupChannels().then(done).catch(onError)
  })

  .command('info', 'Get info about your XRP account and payment channels', {}, argv => {
    const moneyd = getMoneyd(argv)
    moneyd.printChannels().then(done).catch(onError)
  })

  .command('configure <uplink>', 'Generate a configuration file', {}, (argv) => {
    Moneyd.buildConfig(argv.uplink, parseArgv(argv)).then(done).catch(onError)
  })

  .command('use <uplink>', 'Set current uplink', {}, (argv) => {
    const moneyd = getMoneyd(argv)
    moneyd.setCurrentUplink(argv.uplink)
  })

  .command('*', '', {}, argv => {
    console.error('unknown command.')
    process.exit(1)
  })
  .argv

function done () {
  process.exit(0)
}

function onError (err) {
  console.error('fatal:', err)
  process.exit(1)
}

function parseArgv (argv) {
  if (argv.testnet && argv.config === DEFAULT_CONFIG) {
    argv.config = DEFAULT_TESTNET_CONFIG
  }
  return {
    config: argv.config,
    allowOrigin: argv['allow-origin'],
    allowExtensions: argv['unsafe-allow-extensions'],
    environment: argv.testnet ? 'test' : 'production',
    adminApiPort: argv['admin-api-port'],
    testnet: argv.testnet
  }
}

function getMoneyd (argv) {
  const args = parseArgv(argv)
  if (!fs.existsSync(args.config)) {
    console.error('config file does not exist. file=' + args.config)
    process.exit(1)
  }
  return new Moneyd(args.config, args)
}
