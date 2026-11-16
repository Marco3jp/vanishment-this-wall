# 紹介動画

アプリの流れ（ダウンロード → 起動 → 画面共有 → QR → 視聴 → 便利機能 → 開発用モード）をテロップだけで見せる58秒の動画を Remotion で作る。
配信ページと視聴ページは本物のサーバーをヘッドレス Chromium で動かして撮ったスクリーンショットを使い、OS やブラウザ本体の画面（Releases、共有するものを選ぶ画面、カメラ、PiP）は HTML で組んでいる。

## 作り方

1. `bun install`
2. `bun run fonts`（Noto Sans JP を `public/fonts/` にダウンロードする）
3. `bun run capture`（`public/shots/` と `src/shots.json` を作る）
4. `bun run render`（`out/promo.mp4` ができる）

手直しするときは `bun run studio` でプレビューできる。決まったフレームだけ見たいときは `bun capture/stills.ts <保存先> 100 500 900` で静止画を書き出す。

## ヘッドレス Chromium の描き方

撮影も書き出しも、Playwright の headless shell を `--use-gl=angle --use-angle=gl-egl --ignore-gpu-blocklist` で起動し、WSL では `GALLIUM_DRIVER=d3d12` で Windows の GPU に描かせる（`capture/headless.ts`、`remotion.config.ts`）。既定の SwiftShader（CPU）より速い。

## 撮った画面に手を入れているところ

- QR と URL は `http://192.168.1.23:47800/` にしている（WSL の中のアドレスが出るため）。開発用モードの数字に出るアドレスも、PC を `192.168.1.23`、スマホを `192.168.1.41` に置き換えている
- 視聴側の端末は Android の Chrome の User-Agent を名乗らせている
- 画面共有は Chromium のフェイクの映像（60fps）を取り込んでいる。「送っている映像」とスマホの映像は、動画側で共有中のタブの映像に差し替えている
