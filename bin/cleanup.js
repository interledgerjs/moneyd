const inquirer = require('inquirer')
const table = require('good-table')
const chalk = require('chalk')
const { deriveAddress, deriveKeypair } = require('ripple-keypairs')
const { RippleAPI } = require('ripple-lib')
const XRP_ADDRESS = process.env.XRP_ADDRESS
const XRP_SECRET = process.env.XRP_SECRET
const server = process.env.XRP_SERVER
const infoMode = process.env.INFO_MODE

if (!XRP_SECRET) {
  console.error('xrp secret must be specified')
  process.exit(1)
}

const address = XRP_ADDRESS || deriveAddress(deriveKeypair(XRP_SECRET).publicKey)

async function run () {
  const api = new RippleAPI({ server })

  console.log('connecting api...')
  await api.connect()

  console.log('getting account...')
  const res = await api.getAccountInfo(address)
  console.log(chalk.green('balance: '), res.xrpBalance + ' XRP')
  console.log(chalk.green('account: '), address)

  const channels = await api.connection.request({
    command: 'account_channels',
    account: address
  })

  const formatted = table([
    [ chalk.green('index'),
      chalk.green('destination'),
      chalk.green('amount (drops)'),
      chalk.green('balance (drops)'),
      chalk.green('closing') ],
    ...channels.channels.map((c, i) =>
      [ String(i), c.destination_account, c.amount, c.balance,
        (c.expiration ? 'yes' : '')])
  ])
  console.log(formatted)

  if (infoMode) return process.exit(0)

  const result = await inquirer.prompt({
    type: 'checkbox',
    name: 'marked',
    message: 'which of these channels would you like to close?',
    choices: channels.channels.filter(c => {
      return !c.expiration
    }).map((c, i) => {
      return String(i)
    })
  })

  for (const index of result.marked) {
    console.log('closing', index + '...')
    const tx = await api.preparePaymentChannelClaim(address, {
      channel: channels.channels[index].channel_id,
      close: true
    })

    const signedTx = api.sign(tx.txJSON, XRP_SECRET)
    const {resultCode, resultMessage} = await api.submit(signedTx.signedTransaction)
    if (resultCode !== 'tesSUCCESS') {
      console.error('WARNING: Error submitting close: ', resultMessage)
    }
  }

  console.log('closed!')
  process.exit(0)
}

run()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
