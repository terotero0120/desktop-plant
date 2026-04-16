# CLAUDE.md

このファイルはリポジトリ内で作業する Claude Code (claude.ai/code) へのガイダンスを提供する。
出力が完了したら出力内容をCodexがレビューする

## コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # 型チェック + ビルド
npm run lint       # ESLint
npm run typecheck  # main + renderer の型チェック
npm run test       # Vitest 単発実行
npm run test:watch # Vitest ウォッチモード
```

## アーキテクチャ

Electron アプリ。3つのプロセス構成: main (`src/main/index.ts`)、preload (`src/preload/index.ts`)、renderer (`src/renderer/src/`)。

- `uiohook-napi` と `electron-store` は main プロセス専用（`electron.vite.config.ts` で `external` 指定）
- renderer から main への通信は `window.electron.ipcRenderer` 経由
- `window-all-closed` は意図的に空 — トレイがアプリを常駐させる

仕様: `doc/spec.md` / タスクリスト: `doc/task-list.md`
