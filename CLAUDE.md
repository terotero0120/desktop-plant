# CLAUDE.md

このファイルはリポジトリ内で作業する Claude Code (claude.ai/code) へのガイダンスを提供する。

## 開発ルール

- main への直接 push は禁止。どんな小さな変更もブランチを切って PR 経由で取り込む
- PR 作成後、Codex がコードレビューを行う
- ビルド設定は `electron-builder.yml` に一本化する。package.json に `build` フィールドを置くと yml が無視されるため追加しない

## モデル運用ルール

高価なモデル（Opus / Fable）をメインモデルとして使う場合、費用を抑えるため以下に従う:

- 役割は計画・監査・レビュー指摘の裁定。実装は原則行わない
- コードレビューは Codex 専任。レビューの独立性を保つため、Codex は実装には使わない
- 3ファイル以上 or 50行超の実装は Sonnet に委譲する（Agent ツール `model: sonnet`、または `/model` 切替）
- それ未満の軽微な修正は直接実装してよい
- 委譲プロンプトには受け入れ基準と「`npm run typecheck` / `npm run test` 合格後に完了報告」を必ず含める
- 差し戻しは2往復まで。解決しなければメインモデルが引き取る
- 高難度と判断した実装は、理由を明示の上で直接実装してよい

## コマンド

```bash
npm run dev        # 開発サーバー起動
npm run build      # 型チェック + ビルド
npm run lint       # ESLint
npm run typecheck  # main + renderer の型チェック
npm run test       # Vitest 単発実行（テストは src/main/__tests__/、設定は vitest.config.ts）
npm run test:watch # Vitest ウォッチモード
npm run build:mac  # macOS 向けパッケージング（DMG 作成）
npm run build:unpack # パッケージングなしのディレクトリ出力（動作確認用）
```

## アーキテクチャ

Electron アプリ。3つのプロセス構成: main (`src/main/index.ts`)、preload (`src/preload/index.ts`)、renderer (`src/renderer/src/`)。

- `uiohook-napi` と `electron-store` は main プロセス専用（`electron.vite.config.ts` で `external` 指定）
- renderer から main への通信は `window.electron.ipcRenderer` 経由
- `window-all-closed` は意図的に空 — トレイがアプリを常駐させる
- 植物ウィンドウはデスクトップ専用表示。`LSUIElement` は付けない（付けると常に最前面化する）。Dock 非表示は `app.dock.hide()` で行う

仕様: `doc/spec.md` / macOS 署名・アクセシビリティ許可: `doc/macos-signing.md`
（`doc/task-list.md` は初期実装時のタスクリストのアーカイブ。現状を反映していない）
