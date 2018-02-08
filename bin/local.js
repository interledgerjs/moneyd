const Connector = require('ilp-connector')
const connector = Connector.createApp({
  spread: 0,
  backend: 'one-to-one',
  store: 'ilp-store-memory',
  initialConnectTimeout: 60000,
  ilpAddress: 'test.moneyd.',
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
        wsOpts: {
          host: 'localhost',
          port: 7768
        }
      }
    }
  }
})

connector.listen()
  .catch(e => {
    console.error('fatal:', e)
    process.exit(1)
  })
