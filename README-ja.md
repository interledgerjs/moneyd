# Moneyd

[![Greenkeeper badge](https://badges.greenkeeper.io/interledgerjs/moneyd.svg)](https://greenkeeper.io/)

> ILP-enable your machine!

- [クイックスタート](#quick-start)
  - [テストネットワーク](#test-network)
  - [ライブネットワーク](#live-network)
  - [ローカルテストネットワーク](#local-test-network)
  - [クラウドテストネットワーク](#cloud-test-network)
- [説明](#description)
- [アップリンク](#uplinks)
- [ILPアプリケーションの作成](#writing-ilp-applications)
  - [SPSP支払いの実行](#making-an-spsp-payment)
  - [ilp-pluginはどう作動するか](#how-does-ilp-plugin-work)
- [高度な使用方法](#advanced-usage)
  - [コマンドラインオプション](#command-line-options)
  - [環境変数](#environment-variables)
  - [リモートデプロイ](#remote-deploy)
  - [調整](#reconciliation)
  - [アカウント情報](#account-info)
  - [チャンネルのクリーンアップ](#clean-up-channels)
  - [複数のインスタンス](#multiple-instances)
- [支払いの送信](#sending-payments)
- [コネクターリスト](#connector-list)

## クイックスタート

35XRP以上が入ったXRPアカウントを既にお持ちの場合は、[ライブネット](#live-network)の手順をご利用ください。
それ以外の場合でも、[テストネット](#test-network) の手順に従うことができます。 オフライン環境での開発では、独自の[ローカルテストネット](#local-test-network)を実行できます。

### テストネット

以下が必要です:

- v8.9.4かそれ以上のノード。
- グローバルノードモジュールをインストールする許可。

```sh
npm install -g moneyd moneyd-uplink-xrp
moneyd --testnet xrp:configure
moneyd --testnet xrp:start
```

Gチャンネルを初期化するのを待てば、それで完了です！構成ファイルは`~/.moneyd.test.json`に作成されます。

そのコマンドが実行されている限り、ポート7768経由でILPにアクセスできます。
[支払いの送信](#sending-payments) セクションに従って、テストネットのためにリスト化された代替エンドポイントを使用して、テストすることができます。

### ライブネットワーク

以下が必要です:

- v8.9.4かそれ以上のノード。
- グローバルノードモジュールをインストールする許可。
- XRPシークレット（予備金とチャネル資金をカバーするため35XRP以上が必要）。

以下を実行してください:

```sh
npm install -g moneyd moneyd-uplink-xrp
moneyd xrp:configure
moneyd xrp:start
```

XRPシークレット（または「シード」）は、 's'で始まるbase58エンコード文字列です。

チャンネルが初期化するまで待てば、それで完了です！構成ファイルは `~/.moneyd.json`に作成されます。


そのコマンドが実行されている限り、ポート7768を介してILPにアクセスできます。
実行できるコマンドについては、 [Sending Payments](#sending-payments)をご覧ください。
moneydコマンドのより高度な使用方法については、 [Advanced Usage](#advanced-usage)をご覧ください。

### ローカルテストネットワーク

ローカル開発を行っているだけであれば、どのネットワークに接続されていても問題ありません。
Moneydを使用すると、このシナリオで隔離されたローカルテストネットワークを実行できます。以下を実行してください:

```
npm install -g moneyd
moneyd local
```

これにより、ポート7768を介したILPアクセスが公開されますが、このポートに接続されたアプリケーションは、同じマシン上の他のアプリケーションのみに支払いを行うことができます。


### クラウドテストネットワーク

公にアクセス可能なテストネットワークは、Herokuのにmoneydをデプロイすることによって作成することができます。下のボタンを使用して、ローカルモードで実行されているmoneydのインスタンスをデプロイします。アプリのデプロイを完了する前に、Herokuは2つの必須フィールド：アセットコード（XRP、USD）の設定とアセットスケールの設定を要求します。

[![デプロイ](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

デプロイされると、Herokuは、hermo-app-name.herokuapp.comという形式のクラウドmoneydに接続するためのURLを提供します。

次に、次のコマンドを使用して、Herokuインスタンスに接続するようにローカルのマネージドインスタンスをセットアップできます。

```sh
moneyd --testnet btp:configure
```

コマンドラインプロンプトに従って接続を構成します。  `親コネクタのBTPホスト`の入力を求められたら、Herokuが提供するURL (heroku-app-name.herokuapp.com, https：//は含めない)をn湯力します。
アップリンクが設定されたら、ローカルのMoneydインスタンスを実行します。

```sh
moneyd --testnet btp:start
```

## 説明

このレポジトリには実験的なILPプロバイダーが含まれており、コンピューター上のすべてのアプリケーションが　_live_ ILP network上の資産を使えるようにします。

インターレジャーコネクタへの支払いチャネルを作成し、ローカルで `ilp-plugin-mini-accounts`を実行することにより機能します。 どのプラグインも、ランダムなシークレットを生成し、BTP経由で`localhost:7768`に認証することにより、このミニアカウントインスタンスに接続できます。デフォルトでは、localhostからの接続のみが受け入れられます。(See [環境変数](#environment-variables).)

`ilp-plugin`リポジトリは既にこれを行うように設計されているため、`ilp-curl`および他の多くのツールはそのまま使用することができます。

初期段階ですので、資産が多く入っているリップルアカウントはご使用にならないでください。

## アップリンク

アップリンクモジュールは、Moneydが使用するilp-pluginをラップします。 支払いチャネルの管理やコンフィギュレーションの構築などの追加機能を提供します。 Moneydを使用するためには、少なくとも1つのアップリンクをインストールする必要があります。

アップリンクモジュールの例:

  * [moneyd-uplink-xrp](https://github.com/interledgerjs/moneyd-uplink-xrp)
  * (more to come)

### moneyd-uplink-btp
このアップリンクには、デフォルトでmoneydがパッケージされています。これは、`ilp-plugin-mini-accounts`（別のMoneydなど）を使用して接続を受け入れる親コネクタインスタンスへのデータのみのリンク（決済なし）を作成するために使用されます。 moneyd-uplink-btpを使用してmoneydを構成および実行するには、次のコマンドを使用します:

```sh
moneyd btp:configure
moneyd btp:start
```

( [クラウドテストネットワーク](#cloud-test-network) を参照ください)

## ILPアプリケーションの作成

moneydを実行する最大の理由の1つは、Interledger上で実行する独自のアプリケーションを開発できることです。 Moneydへの接続は、[`ilp-plugin`](https://www.npmjs.com/package/ilp-plugin) をインストールし、プロジェクトに1行のコードを追加するという簡単なものです:

```
const plugin = require('ilp-plugin')()
```

このインターレジャー
[プラグイン](https://github.com/interledger/rfcs/blob/master/0024-ledger-plugin-interface-2/0024-ledger-plugin-interface-2.md)
は、Moneydインスタンスへの接続です。
その後、他のモジュールに渡してMoneyd経由で支払いを送信できます。


### SPSP支払いを行う

以下のコードスニペットは、`ilp-plugin` と
[`ilp-protocol-spsp`](https://github.com/sharafian/ilp-protocol-spsp) を使用して識別子 `$sharafian.com`を支払う方法を示しています。この識別子は、livenetでのみ到達可能です。テストネット上のどこかに送信する場合は、[SPSPサーバー](https://github.com/sharafian/ilp-spsp-server)を使用して独自の受信機を作成します。

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

### 「ilp-plugin」の仕組み

`ilp-plugin` のデフォルトの動作は非常に簡単です。
`require('ilp-plugin')()`を実行すると、ローカルマシンのポート7768に接続する[ILP プラグイン
BTP](https://github.com/interledgerjs/ilp-plugin-btp)のインスタンスが作成されます。

[environment variables](https://en.wikipedia.org/wiki/Environment_variable#Unix)を使用して、`ilp-plugin`の動作をカスタマイズすることもできます。

- `ILP_CREDENTIALS` - プラグインのコンストラクターに渡されるパラメーターを含むJSONオブジェクト デフォルトは: `'{"server":"btp+ws://:<RANDOM_SECRET>@localhost:7768"}'`.
- `ILP_PLUGIN` - 使用するプラグインのNPMモジュール名　デフォルト: `'ilp-plugin-btp'`.

## 高度な使用方法

### コマンドラインオプション

以下のどのコマンドでも、 `-c`とともに非標準位置の設定ファイルを使用することができます。moneydインスタンスを`--testnet`で構成している場合は、このセクションで指定されているコマンドに`--testnet`フラグも追加する必要があります。

moneydフラグの完全なリストを表示するには、次を実行します。

```
moneyd help
```

特定のコマンドのオプションを表示するには、`--help`を渡します。例えば:

```
moneyd xrp:configure --help
```

### 環境変数

[環境変数](https://en.wikipedia.org/wiki/Environment_variable#Unix)を使用して`moneyd`の動作をカスタマイズできます。.

- `MONEYD_BIND_IP` - moneyd ウェブソケットサーバーがリッスンするIPアドレスを指定する文字列. デフォルトは: `localhost`.
- `MONEYD_BIND_PORT` - moneyd ウェブソケットサーバーがリッスンするポートを指定する文字列. デフォルは: `7768`.
- `MONEYD_ASSET_CODE` - ローカルモードで実行する際にmoneydが構成される資産コードを指定する文字列. デフォルトは: `XRP`.
- `MONEYD_ASSET_SCALE` - ローカルモードで実行する際にmoneydが構成される資産規模を指定する数字. デフォルトは: `9`.
- `MONEYD_ILP_ADDRESS` - ローカルモードで実行する際にmoneydが構成されるilp addressを指定する文字列. デフォルトは: `private.moneyd`.
- `SET_ASSET_CODE` - 使用するMoneyd資産コードを指定する文字列
- `SET_ASSET_SCALE` - 使用するMoneyd資産規模を指定する文字列

### リモートデプロイ

リモートサーバーで前述の手順を実行済みであれば、ローカルマシンでMoneydを動かすための特別なソフトウェアを実行する必要はありません。それだけでなく、必要な数のマシンにInterledgerへのアクセスを許可することができます！

SSHローカルポートフォワーディングを使用して、ILPアクセスが必要な任意のマシンにマネーポート`7768` を転送するだけです。

```sh
ssh -N -L 7768:localhost:7768 user@example.com
```

`user@example.com` を、moneydを実行しているサーバーに置き換えます。

### 調整

クラッシュしたりバグに遭遇した場合、moneydインスタンスが親コネクタにクレームを送信出来ていないことがあり得ます。これにより、親コネクタはあなたが負債を抱えているとみなし、パケットの転送を拒否することになります。


これを修正するには、Moneydを一旦停止して再度実行してください：

```
moneyd xrp:topup --amount 1000
```

さらに調整が必要な場合は、量を調整できます。量はXRPドロップで表示されます。1000000は単一のXRPであるため、これらの量は通常非常に小さく抑えることができます。

### アカウント情報

XRPアカウントの残高と未払いの支払いチャネルに関する情報を取得できます。この情報にアクセスするには、次を実行します。:

```
moneyd xrp:info
```

### Clean Up Channels

支払いチャネルからお金を取り戻したい場合が考えられます。 Moneydは、これを行うためのツールを提供しています。

チャネルのクローズは2つのフェーズで行われます。まず、閉じるためにチャネルをマークします。これにより、チャネルの有効期限が設定されます。次に、有効期限が切れたら、別のクローズトランザクションを送信して資金を取り戻し、チャネルを削除できます。

クローズするチャネルをマークするには、次を実行します:

```
moneyd xrp:cleanup
```

`<space>` で閉じるチャンネルを選択して、 `<enter>`を押します。 `moneyd xrp:info`を実行すると、チャネルに有効期限が設定されていることがわかります。

チャネルが閉じる準備ができるまでにおよそ1時間かかります。これにより、カウンターパーティーがクレームを提出する時間が出来ます。

1時間が経過したら、クリーンアップを再度実行します:

```
moneyd xrp:cleanup
```

今回は、チャネルは`ready to close`と言う必要があります。閉鎖するためにマークすると、今度は永久に消えます。 XRPアカウントには、総チャンネル容量から現在のチャンネル残高を差し引いた金額が入金されます。

moneydをスタートさせた時に、その前のチャンネルが閉じている途中もしくは閉じてしまっている場合、新しい`name`を設定して、新しいチャネルを強制的に開く必要があります。
[複数のインスタンス](#multiple-instances) の指示に従って作業を完了させてください。

## 複数のインスタンス

同一のXRPアカウントと親コネクタに対して、moneydの複数のインスタンスを実行したい場合があります。

moneydのインスタンスを区別するために、アップリンクを構成する際に一意の `" name "`を設定します。
。この`" name "`はILPアドレスのセグメントになるため、`[A-Za-z0-9 \ -_〜]`のみを使用する必要があります。 `" name "`は親BTPホストごとに一意である必要があります。

名前の入力を求めるには、詳細モードで構成する必要があります。古い `〜/ .moneyd.json`を最初にバックアップするのを忘れないでください。次に、使用する通貨の構成を実行します。たとえば、XRPでは、次を実行します:

```
moneyd xrp:configure --advanced
```

そして、`"name"`の入力を求められたら、希望する一意の名前を入力します。
これにより、新しいチャネルが強制的に開かれます。

必要な数の`"name"`を使用できます。 チャンネルを開くためにXRPを使い果たしてしまった場合は、[Clean Up Channels](#clean-up-channels) に従って返還を要求してください。

## 支払いの送信

moneydが実行されていますので、ファイルをアップロードしてunhashすることでテストできます。
unhashは、ILPに基づくシンプルなコンテンツアドレス指定ファイルアップロードサービスです。

moneydとコネクトしてunhashホストに送金をする、[ILP Curl](https://github.com/interledgerjs/ilp-curl)を使います。

```sh
npm install -g ilp-curl
echo "This is my example file" > example.txt

# use "https://unhash.ilp-test.com" if you're on the testnet"
ilp-curl -X POST https://alpha.unhash.io --data @example.txt
# --> {"digest":"ff5574cef56e644f3fc4d0311b15a3e95f115080bcc029889f9e32121fd60407"}

curl https://alpha.unhash.io/ff5574cef56e644f3fc4d0311b15a3e95f115080bcc029889f9e32121fd60407
# --> "This is my example file"
```

これで、ファイルのアップロードの支払いのためのILP支払いが正常に送信されました！ILPを使用するための別の方法は、シンプル支払い設定プロトコル、SPSPを使用することです。次の例では、`$sharafian.com`にマイクロペイメントを送信します。

```sh
npm install -g ilp-spsp

# use "$spsp.ilp-test.com" if you're on the testnet
ilp-spsp send --receiver \$sharafian.com --amount 100

# --> paying 100 to "$sharafian.com"...
# --> sent!
```

ユースケースをもっと見たい方は [Interledgerjs on Github](https://github.com/interledgerjs) を参照ください。

## コネクタリスト

(ここに独自のコネクタを追加するには、PRを送信してください)

- `client.scyl.la` - N. Virginia
- `ilsp.openafricanetwork.org` - W. Europe (現在、AWSがアフリカでインスタンスをホストするのを待っています...)
