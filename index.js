const Connector = require('ilp-connector')
const crypto = require('crypto')
const hmac = (key, message) => {
  const h = crypto.createHmac('sha256', key)
  h.update(message)
  return h.digest()
}

const parentBtpHmacKey = 'parent_btp_uri'
const PARENT_BTP_HOST = process.env.PARENT_BTP_HOST
const XRP_SECRET = process.env.XRP_SECRET
const XRP_ADDRESS = process.env.XRP_ADDRESS
const btpSecret = hmac(hmac(parentBtpHmacKey, PARENT_BTP_URI), XRP_SECRET)

// TODO: wss
const parentUri = 'btp+ws://:' + btpSecret + '@' + PARENT_BTP_HOST
const connector = Connector({
  spread: 0,
  routeBroadcastEnabled: false,
  backend: 'one-to-one',
  store: 'ilp-store-memory',
  initialConnectorTimeout: 60000,
  accounts: {
    parent: {
      relation: 'parent',
      plugin: 'ilp-plugin-xrp-asym-client',
      assetCode: 'XRP',
      assetScale: 6,
      balance: {
        minimum: '-Infinity',
        maximum: '10000',
        settleThreshold: '-500',
        settleTo: '0'
      }
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
      }
    }
  }
})
