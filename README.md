# desktop-plant

キーボード入力やマウス操作を成長ポイントに変換して観葉植物を育てる、Electron 製デスクトップアプリです。

## 技術スタック

- Electron + React + TypeScript
- electron-vite
- uiohook-napi（グローバル入力フック）
- electron-store（データ永続化）

## 開発環境のセットアップ

```bash
npm install
```

## 開発用起動

```bash
npm run dev
```

## ビルド

### macOS

```bash
npm run build:mac
```

`dist/desktop-plant-x.x.x.dmg` が生成されます。

> アドホック署名（`identity: '-'`）を使用しているため、初回起動時に Gatekeeper の警告が出る場合があります。
> その場合は右クリック→「開く」、または以下のコマンドで回避できます。
> ```bash
> sudo xattr -r -d com.apple.quarantine /Applications/desktop-plant.app
> ```

### Windows ARM64（Mac からクロスコンパイル）

```bash
npm run build:win:arm64
```

`dist/desktop-plant-x.x.x-arm64-win.zip` が生成されます。
zip を Windows ARM64 環境に転送して解凍し、`desktop-plant.exe` を直接起動してください。

> NSIS インストーラーは Wine が必要なため Windows 上でのみビルド可能です。
> ARM64 の動作確認後、x64 対応および NSIS インストーラー化を予定しています。

## 仕様・タスク

- [仕様書](doc/spec.md)
- [タスクリスト](doc/task-list.md)
