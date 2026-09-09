# Pulsoid to VRChat OSC Relay

Pulsoid から配信されるリアルタイム心拍数（Heart Rate）データを、VRChat の OSC に直接送信する中継ツールです。
[vard88508/vrc-osc-miband-hrm](https://github.com/vard88508/vrc-osc-miband-hrm) と完全に同一の OSC パラメータ仕様（計算式・アドレス）を出力するため、既存のアバターギミックやアニメーションをそのまま利用できます。

---

## このツールについて
このツールはAntigravityを使用したバイブコーディングによって開発されました。

`README.md`も[## このツールについて](#このツールについて)と[#開発時用のメモ](#開発時用のメモ)以外は生成AIによって生成されました。

## 🌟 特徴

- **ダイレクト送信**: `vrc-osc-miband-hrm` やブラウザの常駐が不要。本ツール単体で Pulsoid から VRChat (UDP 9000) へ直接送信。
- **完全無料・安全（Widget URL 連携）**:
  - Pulsoid の無料アカウントで作成できる **ウィジェット URL**（OBS 等で使用する URL）からリアルタイム心拍数を安全に取得。
  - **BRO プラン（有料サブスクリプション）不要**。
  - **他人の Client ID や非公式な認証情報の流用は一切なし**。自分専用のウィジェットで安全かつクリーンに動作します。
- **Windows 単体実行ファイル (.exe) 付属**: Node.js や Docker のインストール不要で、ダブルクリックですぐに起動。
- **100% 互換**:
  - `/avatar/parameters/Heartrate` (Float: -1.0 〜 1.0)
  - `/avatar/parameters/Heartrate2` (Float: 0.0 〜 1.0)
  - `/avatar/parameters/Heartrate3` (Int: 0 〜 255)
  - `/chatbox/input` (Chatbox表示、レート制限約1.3秒間隔)
- **安定した再接続**: ネットワーク切断時や再起動時にバックオフ付きで自動再接続。
- **Docker対応**: Linux や開発環境でもコンテナで手軽に実行可能。

---

## 🚀 使い方 (Windows 単体 exe で動かす場合)

### 1. Pulsoid Widget URL の取得（無料）
1. ブラウザで [Pulsoid Widgets](https://pulsoid.net/ui/widgets) を開きます。
2. 任意のウィジェット（または新規作成）の「**Copy link**」をクリックします。
   - 例: `https://pulsoid.net/widget/view/00000000-0000-0000-0000-000000000000`

### 2. 起動と設定
`bin/pulsoid-to-vrc-osc.exe` をダブルクリックして起動します。

1. 初回起動時、コンソールに `Enter your Pulsoid Widget URL:` と表示されます。
2. コピーした Widget URL を貼り付けて Enter を押します。
   （あらかじめ `config.json` の `"widgetUrlOrId"` に書いておくことも可能です）
3. ウィジェットが自動検証され、設定が `config.json` に保存されます。
4. そのまま VRChat への心拍数 OSC 送信が開始されます！

> 💡 **次回以降の起動**:
> 設定が保存されているため、起動するだけで即座に中継が始まります。

---

## ⚙️ 設定のカスタマイズ (`config.json`)

```json
{
  "pulsoid": {
    "widgetUrlOrId": "https://pulsoid.net/widget/view/YOUR_WIDGET_ID"
  },
  "vrchat": {
    "oscHost": "127.0.0.1",
    "oscPort": 9000
  },
  "chatbox": {
    "enabled": false,
    "template": "❤{HR} bpm",
    "minIntervalMs": 1300
  },
  "heartrate": {
    "skipZero": true
  }
}
```

- **頭上 Chatbox にも心拍数を表示したい場合**: `"chatbox": { "enabled": true }` に変更します。
- **Meta Quest 単体版 VRChat の場合**: `oscHost` に同一 Wi-Fi 内の Quest のローカル IP を指定します。

---

## 🐳 Docker で動かす場合

```bash
# 設定ファイル作成
cp config.example.json config.json
# config.json に自分の Widget URL を記載

# 起動
docker compose up -d

# リアルタイムログ確認
docker compose logs -f

# 停止
docker compose down
```

---

## 開発時用のメモ
## 環境のセットアップ
Dockerがあれば実行・テスト・ビルドが行えるようになっています。

テストは以下のコマンドで実行できます。

ただし、このテストコードは更新されていない可能性が高いです。

```
docker compose run --rm app npm test
```

### 単体exeのビルド方法
Dockerでビルドできるようになっています。

```
docker compose run --rm app npm run build:exe
```

---

## ⚙️ 互換仕様とクレジット

本ツールの OSC パラメータ仕様は [vard88508/vrc-osc-miband-hrm](https://github.com/vard88508/vrc-osc-miband-hrm) (MIT License, Copyright (c) 2022 Vard) と互換性があります。
