# Moneyd
> ILP-enable your machine!

- [Quickstart](#quick-start)
- [Description](#description)
- [Advanced Usage](#usage)
  - [Remote Deploy](#remote-deploy)
  - [Reconciliation](#settlement)
  - [Account Info](#account-info)
  - [Clean Up Channels](#clean-up-channels)
  - [Re-establish Channel](#re-establish-channel)
- [Sending Payments](#sending-payments)
- [Connector List](#connector-list)

## Quick Start

You'll need:

- An XRP secret (with more than 35 XRP to cover reserve and channel funding).
- A parent host from the [Connector List](#connector-list) (to be your uplink into the network).

Create a file called `moneyd.json` and copy the following text into it:

```json
{
  "secret": "replace with your XRP secret",
  "parent": "replace with your parent host from the connector list",
  "id": "1"
}
```

Replace the values as instructed. Then run:

```sh
npm install -g moneyd
moneyd start -c moneyd.json
```

Give it a minute to initialize a channel, then you're done!

So long as that command is running, you'll have access to ILP via port 7768.
For some commands you can do, look at [Sending Payments](#sending-payments).
For more advanced usage of the moneyd command, look at [Advanced Usage](#advanced-usage).

## Description

This repo contains an experimental ILP provider, allowing all applications on
your computer to use funds on the _live_ ILP network.

It works by creating a payment channel to an Interledger connector, and then
running `ilp-plugin-mini-accounts` locally. Any plugin can connect to this
mini-accounts instance by generating a random secret and authenticating via BTP
to `localhost:7768`.

The `ilp-plugin` repo is already designed to do this, so `ilp-curl` and many
other tools will work right out of the box.

Because it's in early stages, don't use it
with a ripple account that has too much money.

## Advanced Usage

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
moneyd topup -c moneyd.json --amount 1000
```

You can adjust the amount if you need to reconcile more. The amount is
represented in XRP drops; 1000000 is a single XRP so these amounts are
typically kept quite small.

### Account Info

You can get information about your XRP account's balance and outstanding
payment channels. To access this information, run:

```
moneyd info -c moneyd.json
```

### Clean Up Channels

Sometimes you want to get your money back out of a payment channel. Moneyd
provides a tool to do this. Expect it to take an hour for the channel to fully close;
this gives the counterparty a chance to submit their best claim. Once the channel has
fully expired your funds will be available again.

```
moneyd cleanup -c moneyd.json
```

## Re-establish Channel

Once you've closed your channels, you may sometime want to connect to your
parent again. They won't let you connect with the same exact configuration
after your channel has closed, but not to worry. You can change the `"id"`
field in your `moneyd.json` to create a new channel.

```json
{
  "secret": "your_xrp_secret",
  "parent": "your_parent_host",
  "id": "2"
}
```

You can keep changing the `"id"` as often as you want. If you run out of XRP
from opening up channels, just follow [Clean Up Channels](#clean-up-channels)
to reclaim it.

## Sending Payments

Now that you have moneyd running, you can test it out by uploading a file to unhash.
Unhash is a simple content-addressed file upload service based on ILP.

You'll use [ILP Curl](https://github.com/interledgerjs/ilp-curl), which will connect
to moneyd and send money to the unhash host.

```sh
npm install -g ilp-curl
echo "This is my example file" > example.txt
ilp-curl -X POST https://alpha.unhash.io/upload --data @example.txt
# --> {"digest":"ff5574cef56e644f3fc4d0311b15a3e95f115080bcc029889f9e32121fd60407"}
curl https://alpha.unhash.io/ff5574cef56e644f3fc4d0311b15a3e95f115080bcc029889f9e32121fd60407
# --> "This is my example file"
```

Now you've successfully sent an ILP payment to pay for a file upload!  Another
way to use ILP is with SPSP, the simple payment setup protocol. This next
example will send a micropayment to `$sharafian.com`.

```sh
npm install -g ilp-spsp
ilp-spsp send --receiver \$sharafian.com --amount 100
# --> paying 100 to "$sharafian.com"...
# --> sent!
```

You can browse [Interledgerjs on Github](https://github.com/interledgerjs) to
find more use cases.

## Connector List

(Submit a PR to add your own connector here)

- `client.scyl.la` - N. Virginia
