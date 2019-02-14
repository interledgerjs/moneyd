'use strict'
const Connector = require('ilp-connector')
const Config = require('./config')

const DEFAULT_ALLOWED_ORIGINS = [
  // minute extension for web monetization
  'chrome-extension://fakjpmebfmpdbhpnddiokemempckoejk'
]

const uplinkModuleNames = {
  xrp: 'moneyd-uplink-xrp',
  eth: 'moneyd-uplink-eth',
  coil: 'moneyd-uplink-coil',
  http: 'moneyd-uplink-http'
  // btp: 'moneyd-uplink-btp'
}

const uplinks = {
  xrp: maybeRequire('moneyd-uplink-xrp'),
  eth: maybeRequire('moneyd-uplink-eth'),
  coil: maybeRequire('moneyd-uplink-coil'),
  http: maybeRequire('moneyd-uplink-http')
  // btp: maybeRequire('moneyd-uplink-btp')
}

function maybeRequire (pkg) {
  try {
    return require(pkg)
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') throw err
    return null
  }
}

class Moneyd {
  constructor (argv) {
    const allowedOrigins = DEFAULT_ALLOWED_ORIGINS
      .concat(argv['allow-origin'] || [])
      .concat(argv['unsafe-allow-extensions'] ? 'chrome-extension://.*' : [])
    this.allowedOrigins = allowedOrigins
    this.environment = argv.testnet ? 'test' : 'production'
    this.adminApiPort = argv['admin-api-port']
  }

  static async buildConfig (uplinkName, argv) {
    const config = new Config(argv.config)
    if (config.getUplinkData(uplinkName) && !argv.force) {
      throw new Error('config already exists for uplinkName=' + uplinkName + ' file=' + argv.config)
    }

    const uplink = getUplink(uplinkName)
    config.setUplinkData(uplinkName, await uplink.configure(argv))
  }

  startConnector (uplinkData) {
    return Connector.createApp({
      spread: 0,
      backend: 'one-to-one',
      store: 'ilp-store-memory',
      initialConnectTimeout: 60000,
      env: this.environment,
      adminApi: !!this.adminApiPort,
      adminApiPort: this.adminApiPort,
      accounts: {
        parent: uplinkData,
        local: {
          relation: 'child',
          plugin: 'ilp-plugin-mini-accounts',
          assetCode: uplinkData.assetCode,
          assetScale: uplinkData.assetScale,
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
          assetScale: 9,
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
}

function getUplink (uplinkName) {
  const uplink = uplinks[uplinkName]
  if (uplink) return uplink
  if (uplink === null) {
    console.error('Missing required plugin. To install, run:')
    console.error('')
    console.error('  $ npm install -g ' + uplinkModuleNames[uplinkName])
    console.error('')
    console.error('assuming moneyd was also installed globally.')
    process.exit(1)
  }
  if (uplink === undefined) {
    console.error('Unknown uplink: "' + uplinkName + '"')
    process.exit(1)
  }
}

Moneyd.uplinks = uplinks
module.exports = Moneyd
