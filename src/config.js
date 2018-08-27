'use strict'
const fs = require('fs')
const os = require('os')
const crypto = require('crypto')

class Config {
  constructor (file) {
    this.file = file

    if (fs.existsSync(file)) {
      this.data = JSON.parse(fs.readFileSync(file).toString())

      const osType = os.platform()
      const stats = fs.statSync(file)
      if (osType !== 'win32' && (stats.mode & 0o77)) {
        console.warn(`${file} has loose permissions,` +
          ` and could be read by other users on this system.` +
          ` It is recommended that you use a mode of 600.` +
          ` To do this, run \`chmod 600 ${file}\``)
      }
    } else {
      this.data = { version: 1, uplinks: {} }
    }

    // Deprecated config format: assume XRP.
    if (this.data.version === undefined) {
      this.data = version0To1(this.data)
    }
  }

  getUplinkData (uplink) {
    return this.data.uplinks[uplink]
  }

  setUplinkData (uplink, uplinkData) {
    this.data.uplinks[uplink] = uplinkData
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2), {
      mode: 0o600
    })
  }
}

function version0To1 (oldData) {
  const btpName = oldData.name || ''
  const btpSecret = hmac(hmac('parent_btp_uri', oldData.parent + btpName), oldData.secret).toString('hex')
  const parentUri = 'btp+wss://' + btpName + ':' + btpSecret + '@' + oldData.parent
  return {
    version: 1,
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
