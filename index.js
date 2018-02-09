const parentBtpHmacKey = 'parent_btp_uri'
const BTP_NAME = process.env.BTP_NAME || ''
const PARENT_BTP_HOST = process.env.PARENT_BTP_HOST
const XRP_SECRET = process.env.XRP_SECRET
const XRP_ADDRESS = process.env.XRP_ADDRESS
const XRP_SERVER = process.env.XRP_SERVER || 'wss://s1.ripple.com'

if (!PARENT_BTP_HOST || !XRP_SECRET) {
  console.error('--parent and --secret must be defined')
  process.exit(1)
}

const Connector = require('ilp-connector')
const crypto = require('crypto')
const hmac = (key, message) => {
  const h = crypto.createHmac('sha256', key)
  h.update(message)
  return h.digest()
}

// TODO: wss
const btpSecret = hmac(hmac(parentBtpHmacKey, PARENT_BTP_HOST + BTP_NAME), XRP_SECRET).toString('hex')
const parentUri = 'btp+wss://' + BTP_NAME + ':' + btpSecret + '@' + PARENT_BTP_HOST

const connector = Connector.createApp({
  spread: 0,
  backend: 'one-to-one',
  store: 'ilp-store-memory',
  initialConnectTimeout: 60000,
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
      options: {
        xrpServer: XRP_SERVER,
        server: parentUri,
        secret: XRP_SECRET,
        address: XRP_ADDRESS
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
      },
      options: {
        wsOpts: {
          host: 'localhost',
          port: 7768
        },
        allowedOrigins: JSON.parse(process.env.ALLOW_ORIGIN)
      }
    }
  },
  routes: [{
    targetPrefix: 'g.',
    peerId: 'parent'
  }]
})

connector.listen()
  .catch(e => {
    console.error('fatal:', e)
    process.exit(1)
  })
