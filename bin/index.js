#!/usr/bin/env node

require('yargs')
  .option('parent', {
    required: true,
    description: 'BTP host of your parent connector, e.g. "client.scyl.la"'
  })
  .option('id', {
    description: 'ID for this connection. allows you to open several channels to same host.'
  })
  .option('secret', {
    required: true,
    description: 'XRP secret, "s..."'
  })
  .option('address', {
    description: 'XRP address. Can be derived from secret.',
    default: ''
  })
  .option('rippled', {
    default: 'wss://s1.ripple.com',
    description: 'Rippled server. Uses S1 server provided by Ripple by default.'
  })
  .command('start', 'launch moneyd', {}, argv => {
    process.env.PARENT_BTP_HOST = argv.parent
    process.env.NONCE = argv.id
    process.env.XRP_SECRET = argv.secret
    process.env.XRP_ADDRESS = argv.address
    process.env.XRP_SERVER = argv.rippled
    process.env.DEBUG = 'ilp*,connector*'
    console.log('set environment; starting moneyd')
    require('..')
  })
  .command('settle', 'pre-fund your balance with connector', {
    amount: {
      description: 'amount (in drops) to send to connector',
      default: 1000
    }
  }, argv => {
    process.env.PARENT_BTP_HOST = argv.parent
    process.env.NONCE = argv.id
    process.env.XRP_SECRET = argv.secret
    process.env.XRP_ADDRESS = argv.address
    process.env.XRP_SERVER = argv.rippled
    process.env.AMOUNT = argv.amount
    console.log('set environment; starting moneyd')
    require('./settle.js')
  })
  .argv
