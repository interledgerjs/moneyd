# Moneyd

[![Greenkeeper badge](https://badges.greenkeeper.io/interledgerjs/moneyd.svg)](https://greenkeeper.io/)

> ILP-enable your machine!

- [Quickstart](#quick-start)
  - [Test Network](#test-network)
  - [Live Network](#live-network)
  - [Local Test Network](#local-test-network)
- [Description](#description)
- [Uplinks](#uplinks)
- [Writing ILP Applications](#writing-ilp-applications)
  - [Making an SPSP Payment](#making-an-spsp-payment)
  - [How Does "ilp-plugin" Work?](#how-does-ilp-plugin-work)
- [Advanced Usage](#usage)
  - [Command-Line Options](#command-line-options)
  - [Remote Deploy](#remote-deploy)
  - [Reconciliation](#reconciliation)
  - [Account Info](#account-info)
  - [Clean Up Channels](#clean-up-channels)
  - [Multiple Instances](#multiple-instances)
- [Sending Payments](#sending-payments)
- [Connector List](#connector-list)

## Quick Start

If you already have an XRP account with 35 XRP or more, use the [Livenet](#live-network) instructions.
Otherwise, you can still follow the [Testnet](#test-network) instructions. For development in an offline
environment, you can run your own [Local Testnet](#local-test-network). 

### Test Network

You'll need:

- Node v8.9.4 or higher.
- Permissions to install global node modules.

```sh
npm install -g moneyd moneyd-uplink-xrp
moneyd --testnet xrp:configure
moneyd --testnet xrp:start
```

Give it a minute to initialize a channel, then you're done! A configuration
file will be created in `~/.moneyd.test.json`.

So long as that command is running, you'll have access to ILP via port 7768.
To try it out, follow the [Sending Payments](#sending-payments) section, and
use the alternate endpoints listed for the testnet.

### Live Network

You'll need:

- Node v8.9.4 or higher.
- Permissions to install global node modules.
- An XRP secret (with more than 35 XRP to cover reserve and channel funding).

Just run:

```sh
npm install -g moneyd moneyd-uplink-xrp
moneyd xrp:configure
moneyd xrp:start
```

Your XRP secret (or "seed") is the base58-encoded string that starts with an 's'.

Give it a minute to initialize a channel, then you're done! A configuration
file will be created in `~/.moneyd.json`.


So long as that command is running, you'll have access to ILP via port 7768.
For some commands you can do, look at [Sending Payments](#sending-payments).
For more advanced usage of the moneyd command, look at [Advanced Usage](#advanced-usage).

### Local Test Network

If you're just doing local development, you may not care about being connected
to any network.  Moneyd allows you to run an isolated local test network for
this scenario. Run:

```
npm install -g moneyd
moneyd local
```

This exposes ILP access via port 7768, but any application connected to this
port will only be able to pay other applications on the same machine.

## Description

This repo contains an experimental ILP provider, allowing all applications on
your computer to use funds on the _live_ ILP network.

It works by creating a payment channel to an Interledger connector, and then
running `ilp-plugin-mini-accounts` locally. Any plugin can connect to this
mini-accounts instance by generating a random secret and authenticating via BTP
to `localhost:7768`. By default, only connections from localhost are accepted.

The `ilp-plugin` repo is already designed to do this, so `ilp-curl` and many
other tools will work right out of the box.

Because it's in early stages, don't use it
with a ripple account that has too much money.

## Uplinks

An uplink module wraps ILP plugins for Moneyd's use. They provide additional features such as payment channel management and configuration construction. At least one uplink must be installed to use Moneyd.

Example uplink modules:

  * [moneyd-uplink-xrp](https://github.com/interledgerjs/moneyd-uplink-xrp)
  * (more to come)

## Writing ILP Applications

One of the biggest reasons to run moneyd is that it lets you develop your own
applications that run on top of Interledger. Connecting to Moneyd is as easy as
installing [`ilp-plugin`](https://www.npmjs.com/package/ilp-plugin) and adding
a single line of code to your project:

```
const plugin = require('ilp-plugin')()
```

This Interledger
[Plugin](https://github.com/interledger/rfcs/blob/master/0024-ledger-plugin-interface-2/0024-ledger-plugin-interface-2.md)
is a connection to your Moneyd instance. You can then pass it into other
modules to send payments through your Moneyd.

### Making an SPSP Payment

The snippet of code below shows how to use `ilp-plugin` and
[`ilp-protocol-spsp`](https://github.com/sharafian/ilp-protocol-spsp) to pay the identifier `$sharafian.com`. This identifier
is only reachable on the livenet; If you want to send to somewhere on the
testnet, use [SPSP server](https://github.com/sharafian/ilp-spsp-server) to
create your own receiver.

```
const plugin = require('ilp-plugin')()
const SPSP = require('ilp-protocol-spsp')

async function run () {
  console.log('paying $sharafian.com...')

  // use '$spsp.ilp-test.com' if you're on the testnet
  await SPSP.pay(plugin, {
    receiver: '$sharafian.com',
    sourceAmount: '10'
  })

  console.log('paid!')
}

run().catch(e => console.error(e))
```

### How Does "ilp-plugin" Work?

`ilp-plugin` has very simple default behavior. If you run
`require('ilp-plugin')()`, it creates an instance of [ILP Plugin
BTP](https://github.com/interledgerjs/ilp-plugin-btp) that connects to port
7768 on your local machine.

You can also customize the behavior of `ilp-plugin` using [environment
variables](https://en.wikipedia.org/wiki/Environment_variable#Unix).

- `ILP_CREDENTIALS` - A JSON object that contains the parameters to be passed into your plugin's constructor. Default: `'{"server":"btp+ws://:<RANDOM_SECRET>@localhost:7768"}'`.
- `ILP_PLUGIN` - An NPM module name for the plugin you want to use. Default: `'ilp-plugin-btp'`.

## Advanced Usage

### Command-Line Options

For any of the commands below, you can use a config file in a non-standard
location with `-c`. If you have configured your moneyd instance with
`--testnet`, then you should also add the `--testnet` flag to any commands
specified in this section.

To view a complete list of the moneyd flags, run:

```
moneyd help
```

If you want to see the options for a specific command, pass `--help`. For example:

```
moneyd xrp:configure --help
```

### Remote Deploy

If you did the previous step on your remote server, then you don't need to run any
special software to get moneyd on your local machine. Not only that, but you can
grant access to Interledger to as many machines as you want!

Just forward the moneyd port `7768` to any machine where you want ILP access by
using SSH local port forwarding:

```sh
ssh -N -L 7768:localhost:7768 user@example.com
```

Replace the `user@example.com` with the server on which you're running moneyd.

### Reconciliation

If you crash or encounter a bug, you might find that your moneyd instance forgot
to send a claim to its parent connector. This results in the parent connector thinking
you owe it money, and refusing to forward any of your packets.

To fix this, just stop moneyd and run:

```
moneyd xrp:topup --amount 1000
```

You can adjust the amount if you need to reconcile more. The amount is
represented in XRP drops; 1000000 is a single XRP so these amounts are
typically kept quite small.

### Account Info

You can get information about your XRP account's balance and outstanding
payment channels. To access this information, run:

```
moneyd xrp:info
```

### Clean Up Channels

Sometimes you want to get your money back out of a payment channel. Moneyd
provides a tool to do this.

Closing a channel happens in two phases. First you mark the channel for closing.
This sets an expiry on the channel. Next, once the expiry has passed, you can send another
close transaction to get your funds back and delete the channel.

To mark channels for closing, run:

```
moneyd xrp:cleanup
```

Select the channels you'd like to close with `<space>` and then hit `<enter>`.
If you run `moneyd xrp:info` you'll see that the channels now have expiries set.

Expect it to take an hour for the channel to be ready for closing; this gives
the counterparty a chance to submit their best claim.

Once the hour is up, run cleanup again:

```
moneyd xrp:cleanup
```

This time, the channels should say `ready to close`. Mark them for closing, and
this time they'll go away for good. Your XRP account will be credited the total channel
capacity minus the current channel balance.

If you start moneyd and its previous channel is closing or closed, you need to
set a new `name` to force a new channel to be opened. Follow the instructions
on [Multiple Instances](#multiple-instances) to accomplish this.

## Multiple Instances

Sometimes you want to run several instances of moneyd with for the same XRP
account and parent connector.

In order to distinguish your instances of moneyd, set a unique `"name"` when you
configure your uplink. This `"name"` will be a segment of your ILP address, so
it must only use `[A-Za-z0-9\-_~]`. The `"name"` must be unique per parent BTP
host.

You'll have to configure in advanced mode to prompt for the name. Don't forget
to back up your old `~/.moneyd.json` first. Then run configure for the currency
you're using. For example, with XRP, run:

```
moneyd xrp:configure --advanced
```

And then when you're prompted for `"name"`, put in the unique name that you want.
This will force a fresh channel to be opened.

You can use as many different `"name"`s as you want. If you run out of XRP from
opening up channels, just follow [Clean Up Channels](#clean-up-channels) to
reclaim it.

## Sending Payments

Now that you have moneyd running, you can test it out by uploading a file to unhash.
Unhash is a simple content-addressed file upload service based on ILP.

You'll use [ILP Curl](https://github.com/interledgerjs/ilp-curl), which will connect
to moneyd and send money to the unhash host.

```sh
npm install -g ilp-curl
echo "This is my example file" > example.txt

# use "https://unhash.ilp-test.com" if you're on the testnet"
ilp-curl -X POST https://alpha.unhash.io --data @example.txt
# --> {"digest":"ff5574cef56e644f3fc4d0311b15a3e95f115080bcc029889f9e32121fd60407"}

curl https://alpha.unhash.io/ff5574cef56e644f3fc4d0311b15a3e95f115080bcc029889f9e32121fd60407
# --> "This is my example file"
```

Now you've successfully sent an ILP payment to pay for a file upload!  Another
way to use ILP is with SPSP, the simple payment setup protocol. This next
example will send a micropayment to `$sharafian.com`.

```sh
npm install -g ilp-spsp

# use "$spsp.ilp-test.com" if you're on the testnet
ilp-spsp send --receiver \$sharafian.com --amount 100

# --> paying 100 to "$sharafian.com"...
# --> sent!
```

You can browse [Interledgerjs on Github](https://github.com/interledgerjs) to
find more use cases.

## Connector List

(Submit a PR to add your own connector here)

- `client.scyl.la` - N. Virginia
- `ilsp.openafricanetwork.org` - W. Europe (waiting for AWS to host instances in Africa...)
