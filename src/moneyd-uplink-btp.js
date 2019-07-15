'use strict'

const { randomBytes } = require('crypto')
const inquirer = require('inquirer')
const connectorList = [
  'za1.rafikilabs.com/btp',
  'eu1.rafikilabs.com/btp',
  'us1.rafikilabs.com/btp'
]

const base64url = buf => buf
  .toString('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_')

async function configure ({ testnet, advanced }) {
  const servers = connectorList
  const defaultParent = servers[Math.floor(Math.random() * servers.length)]
  const res = {}
  const fields = [{
    type: 'input',
    name: 'parent',
    message: 'BTP host of parent connector:',
    default: defaultParent
  }, {
    type: 'input',
    name: 'name',
    message: 'Name to assign to this connection:',
    default: base64url(randomBytes(32))
  }, {
    type: 'input',
    name: 'assetCode',
    message: 'Currency code to use to connect to parent:',
    default: 'XRP'
  }, {
    type: 'input',
    name: 'assetScale',
    message: 'Currency scale to use to connect to parent:',
    default: '9'
  }]

  for (const field of fields) {
    res[field.name] = (await inquirer.prompt(field))[field.name]
  }

  // Create btp server uri for upstream
  const btpSecret = randomBytes(16).toString('hex')
  const btpServer = 'btp+wss://' + res.name + ':' + btpSecret + '@' + res.parent

  return {
    relation: 'parent',
    plugin: require.resolve('ilp-plugin-btp'),
    assetCode: res.assetCode,
    assetScale: Number(res.assetScale),
    sendRoutes: false,
    receiveRoutes: false,
    options: {
      server: btpServer
    }
  }
}

module.exports = {
  configure,
  commands: []
}
