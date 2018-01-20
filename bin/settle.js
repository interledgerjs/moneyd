const parentBtpHmacKey = 'parent_btp_uri'
const PARENT_BTP_HOST = process.env.PARENT_BTP_HOST
const XRP_SECRET = process.env.XRP_SECRET
const XRP_ADDRESS = process.env.XRP_ADDRESS
const XRP_SERVER = process.env.XRP_SERVER || 'wss://s1.ripple.com'
const AMOUNT = process.env.AMOUNT || 1000

if (!PARENT_BTP_HOST || !XRP_SECRET) {
  console.error('--parent and --secret must be defined')
  process.exit(1)
}

const crypto = require('crypto')
const hmac = (key, message) => {
  const h = crypto.createHmac('sha256', key)
  h.update(message)
  return h.digest()
}

// TODO: wss
const btpSecret = hmac(hmac(parentBtpHmacKey, PARENT_BTP_HOST), XRP_SECRET).toString('hex')
const parentUri = 'btp+ws://:' + btpSecret + '@' + PARENT_BTP_HOST

const Plugin = require('ilp-plugin-xrp-asym-client')
const plugin = new Plugin({
  server: parentUri,
  secret: XRP_SECRET,
  xrpServer: XRP_SERVER
})

async function run () {
  await plugin.connect()
  await plugin.sendMoney(AMOUNT)
}

run()
  .then(() => {
    console.log('success')
    process.exit(0)
  })
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
