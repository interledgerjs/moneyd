#!/usr/bin/env node
const chalk = require('chalk')
const path = require('path')
const Moneyd = require('../src')
const Config = require('../src/config')
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

const yargs = require('yargs')
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
    const moneyd = new Moneyd(argv)
    moneyd.startLocal().catch(onError)
  })

Object.keys(Moneyd.uplinks).forEach((uplinkName) => {
  yargs.command({
    command: uplinkName + ':configure',
    describe: 'Generate a configuration file',
    builder: {
      force: {
        type: 'boolean',
        alias: 'f',
        default: false,
        description: 'Set to overwrite existing configuration'
      },
      advanced: {
        type: 'boolean',
        default: false,
        description: 'Set to specify extra config fields'
      }
    },
    handler: (argv) => {
      argv.config = getConfigFile(argv)
      Moneyd.buildConfig(uplinkName, argv).then(done).catch(onError)
    }
  })

  const uplink = Moneyd.uplinks[uplinkName]
  if (!uplink) return
  addUplinkCommand(uplinkName, {
    command: 'start',
    describe: 'Launch moneyd',
    builder: {
      quiet: {
        alias: 'q',
        type: 'boolean',
        default: false,
        description: 'Don\'t print the banner on startup.'
      }
    },
    handler: async (config, argv) => {
      if (!argv.quiet) {
        console.log(banner)
      }
      console.log('starting moneyd')
      const moneyd = new Moneyd(argv)
      await moneyd.startConnector(config)
    }
  })

  uplink.commands.forEach((cmd) => {
    addUplinkCommand(uplinkName, Object.assign({}, cmd, {
      handler: (config, argv) => cmd.handler(config, argv).then(done)
    }))
  })
})

// eslint-disable-next-line no-unused-expressions
yargs
  .command('*', '', {}, argv => {
    console.error('unknown command.')
    process.exit(1)
  })
  .argv

function addUplinkCommand (uplinkName, cmd) {
  yargs.command({
    command: uplinkName + ':' + cmd.command,
    describe: cmd.describe,
    builder: cmd.builder,
    handler: (argv) => {
      const config = new Config(getConfigFile(argv))
      const uplinkData = config.getUplinkData(uplinkName)
      if (!uplinkData) {
        console.error('No configuration found for uplink=' + uplinkName + ' mode=' + (argv.testnet ? 'testnet' : 'prod'))
        process.exit(1)
      }
      cmd.handler(uplinkData, argv).catch(onError)
    }
  })
}

function done () {
  process.exit(0)
}

function onError (err) {
  console.error('fatal:', err)
  process.exit(1)
}

function getConfigFile (argv) {
  if (argv.testnet && argv.config === DEFAULT_CONFIG) {
    return DEFAULT_TESTNET_CONFIG
  }
  return argv.config
}
