'use strict'
const Connector = require('ilp-connector')
const inquirer = require('inquirer')
const Config = require('./config')

const DEFAULT_ALLOWED_ORIGINS = [
  // minute extension for web monetization
  'chrome-extension://fakjpmebfmpdbhpnddiokemempckoejk'
]

const uplinkModules = {
  xrp: 'moneyd-uplink-xrp'
  // eth: 'moneyd-uplink-eth',
  // btp: 'moneyd-uplink-btp'
}

class Moneyd {
  constructor (file, {
    allowOrigin,
    allowExtensions,
    environment,
    adminApiPort
  }) {
    const allowedOrigins = DEFAULT_ALLOWED_ORIGINS
      .concat(allowOrigin || [])
      .concat(allowExtensions ? 'chrome-extension://.*' : [])
    this.allowedOrigins = allowedOrigins
    this.environment = environment
    this.adminApiPort = adminApiPort
    this.config = new Config(file)

    const currentUplink = this.config.getCurrentUplink()
    const Uplink = getUplink(currentUplink)
    this.uplink = new Uplink(this.config.getUplinkData(currentUplink))
  }

  static async buildConfig (uplinkName, argv) {
    const config = new Config(argv.config)
    if (config.getUplinkData(uplinkName)) {
      throw new Error('config already exists for uplinkName=' + uplinkName + ' file=' + argv.config)
    }

    const Uplink = getUplink(uplinkName)
    const uplinkData = await Uplink.buildConfig(inquirer, argv)
    config.setUplinkData(uplinkName, uplinkData)
    config.setCurrentUplink(uplinkName)
  }

  startConnector () {
    return Connector.createApp({
      spread: 0,
      backend: 'one-to-one',
      store: 'ilp-store-memory',
      initialConnectTimeout: 60000,
      env: this.environment,
      adminApi: !!this.adminApiPort,
      adminApiPort: this.adminApiPort,
      accounts: {
        parent: this.config.getUplinkData(this.config.getCurrentUplink()),
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
            wsOpts: { host: 'localhost', port: 7768 },
            allowedOrigins: this.allowedOrigins
          }
        }
      }
    }).listen()
  }

  startLocal () {
    return Connector.createApp({
      spread: 0,
      backend: 'one-to-one',
      store: 'ilp-store-memory',
      initialConnectTimeout: 60000,
      ilpAddress: 'private.moneyd',
      env: this.environment,
      adminApi: !!this.adminApiPort,
      adminApiPort: this.adminApiPort,
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
            wsOpts: { host: 'localhost', port: 7768 },
            allowedOrigins: this.allowedOrigins
          }
        }
      }
    }).listen()
  }

  setCurrentUplink (uplinkName) {
    validateUplink(uplinkName)
    this.config.setCurrentUplink(uplinkName)
  }

  async settle ({amount}) {
    const plugin = this.uplink.getPlugin()
    await plugin.connect()
    await plugin.sendMoney(amount)
  }

  async printChannels () {
    const channels = await this.uplink.listChannels()
    if (!channels.length) return console.error('No channels found')
    await this.uplink.printChannels(channels)
  }

  async cleanupChannels () {
    const channels = await this.uplink.listChannels()
    if (!channels.length) return console.error('No channels found')
    await this.uplink.printChannels(channels)
    const result = await inquirer.prompt({
      type: 'checkbox',
      name: 'marked',
      message: 'Select channels to close:',
      choices: channels.map((_, i) => i.toString())
    })
    await this.uplink.cleanupChannels(
      result.marked.map((index) => channels[+index]))
  }
}

function validateUplink (uplinkName) { getUplink(uplinkName) }

function getUplink (uplinkName) {
  const module = uplinkModules[uplinkName]
  if (!module) {
    console.error('Unknown uplink: "' + uplinkName + '"')
    process.exit(1)
  }
  try {
    return require(module)
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err
    console.error('Missing required plugin. To install, run:')
    console.error('')
    console.error('  $ npm install -g ' + module)
    console.error('')
    console.error('assuming moneyd was also installed globally.')
    process.exit(1)
  }
}

module.exports = Moneyd
