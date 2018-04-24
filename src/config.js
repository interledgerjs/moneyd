'use strict'
const fs = require('fs')
const crypto = require('crypto')

class Config {
  constructor (file) {
    this.file = file
    this.data = fs.existsSync(file)
      ? JSON.parse(fs.readFileSync(file).toString())
      : { version: 1, currentUplink: null, uplinks: {} }

    // Deprecated config format: assume XRP.
    if (this.data.version === undefined) {
      this.data = version0To1(this.data)
    }
  }

  getData () {
    return this.data
  }

  getCurrentUplink () {
    return this.data.currentUplink
  }

  setCurrentUplink (uplink) {
    if (!this.data.uplinks[uplink]) {
      throw new Error('no configuration available for uplink=' + uplink + ' in file=' + this.file)
    }
    this.data.currentUplink = uplink
    this._write()
  }

  getUplinkData (uplink) {
    return this.data.uplinks[uplink]
  }

  setUplinkData (uplink, data) {
    this.data.uplinks[uplink] = data
    this._write()
  }

  _write () {
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2))
  }
}

function version0To1 (oldData) {
  const btpName = oldData.name || ''
  const btpSecret = hmac(hmac('parent_btp_uri', oldData.parent + btpName), oldData.secret).toString('hex')
  const parentUri = 'btp+wss://' + btpName + ':' + btpSecret + '@' + oldData.parent
  return {
    version: 1,
    currentUplink: 'xrp',
    uplinks: {
      xrp: {
        relation: 'parent',
        plugin: 'moneyd-uplink-xrp/node_modules/ilp-plugin-xrp-asym-client',
        assetCode: 'XRP',
        assetScale: 6,
        balance: {
          minimum: '-Infinity',
          maximum: '20000',
          settleThreshold: '5000',
          settleTo: '10000'
        },
        options: {
          server: parentUri,
          secret: oldData.secret,
          address: oldData.address,
          xrpServer: oldData.rippled
        }
      }
    }
  }
}

function hmac (key, message) {
  const h = crypto.createHmac('sha256', key)
  h.update(message)
  return h.digest()
}

module.exports = Config
