# CLAUDE.md

このファイルはリポジトリ内で作業する Claude Code (claude.ai/code) へのガイダンスを提供する。

## 開発ルール

- main への直接 push は禁止。どんな小さな変更もブランチを切って PR 経由で取り込む。コードレビューは Codex が行う
- 高価なモデル（Opus / Fable）をメインで使う場合、実装に着手する前に `doc/model-usage.md` を読み、委譲ルールに従う
- ビルド設定は `electron-builder.yml` に一本化する。package.json に `build` フィールドを置くと yml が無視されるため追加しない

## コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # 型チェック + ビルド
npm run lint       # ESLint
npm run typecheck  # main + renderer の型チェック
npm run test       # Vitest 単発実行（src/main/__tests__/）
npm run build:mac  # macOS パッケージング（DMG）
```

## アーキテクチャ

Electron アプリ。3つのプロセス構成: main (`src/main/index.ts`)、preload (`src/preload/index.ts`)、renderer (`src/renderer/src/`)。

- `uiohook-napi` と `electron-store` は main プロセス専用（`electron.vite.config.ts` で `external` 指定）
- `window-all-closed` は意図的に空 — トレイがアプリを常駐させる
- 植物ウィンドウはデスクトップ専用表示。`LSUIElement` は付けない（付けると常に最前面化する）

仕様: `doc/spec.md` / macOS 署名・TCC: `doc/macos-signing.md` / モデル運用: `doc/model-usage.md`
