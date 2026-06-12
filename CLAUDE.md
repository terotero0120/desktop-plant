# CLAUDE.md

このファイルはリポジトリ内で作業する Claude Code (claude.ai/code) へのガイダンスを提供する。
出力が完了したら出力内容をCodexがレビューする

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
npm run test       # Vitest 単発実行
npm run test:watch # Vitest ウォッチモード
```

## アーキテクチャ

Electron アプリ。3つのプロセス構成: main (`src/main/index.ts`)、preload (`src/preload/index.ts`)、renderer (`src/renderer/src/`)。

- `uiohook-napi` と `electron-store` は main プロセス専用（`electron.vite.config.ts` で `external` 指定）
- renderer から main への通信は `window.electron.ipcRenderer` 経由
- `window-all-closed` は意図的に空 — トレイがアプリを常駐させる

仕様: `doc/spec.md` / タスクリスト: `doc/task-list.md`
