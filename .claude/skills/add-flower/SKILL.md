---
name: add-flower
description: desktop-plant プロジェクトに新しい花の種類を追加する。「花を追加して」「新しい植物を追加」「〇〇を花に追加したい」などと言われたとき、または花の種類を増やす作業のときに必ず使うこと。PNGのコピーからコード登録・dev-toolsの更新まで一連の手順をカバーする。
---

# 花の追加手順

PNG画像は `generate-flower-image` スキルで生成済みであることを前提とする。

## 対象ファイル

| ファイル | やること |
|---|---|
| `src/shared/ipc.ts` | `PLANT_IDS` 配列に ID を追加 |
| `src/shared/plantNames.ts` | `PLANT_NAMES` に日本語名を追加 |
| `src/renderer/src/plantRegistry.ts` | PNG インポートと `plantPngs` への登録 |
| `src/renderer/src/assets/plants/<id>/` | 8段階のPNGをコピー |
| `dev-tools/svg-viewer.html` | `<select>` に `<option>` を追加 |

## PNG の仕様

`generate-flower-image` スキルで生成した画像を使う。

- 解像度: `400×600 px`（RGBA、背景透過）
- 8ファイル（`1.png`〜`8.png`）
- 生成元: `imagegen-output/<flower-id>-growth-8-stages-png/`

## 手順

### 1. アセットディレクトリの作成とPNGのコピー

```bash
mkdir -p src/renderer/src/assets/plants/<id>
cp imagegen-output/<id>-growth-8-stages-png/{1..8}.png \
   src/renderer/src/assets/plants/<id>/
```

### 2. `src/shared/ipc.ts` を更新

```ts
export const PLANT_IDS = ["rose", "sunflower", "tulip", /* ここに追加 */] as const;
```

### 3. `src/shared/plantNames.ts` を更新

```ts
export const PLANT_NAMES: Record<PlantId, string> = {
  rose: "バラ",
  // ...
  <id>: "<日本語名>",
};
```

### 4. `src/renderer/src/plantRegistry.ts` を更新

インポートを追加（拡張子は `.png`）:
```ts
import <id>1 from "./assets/plants/<id>/1.png";
import <id>2 from "./assets/plants/<id>/2.png";
import <id>3 from "./assets/plants/<id>/3.png";
import <id>4 from "./assets/plants/<id>/4.png";
import <id>5 from "./assets/plants/<id>/5.png";
import <id>6 from "./assets/plants/<id>/6.png";
import <id>7 from "./assets/plants/<id>/7.png";
import <id>8 from "./assets/plants/<id>/8.png";
```

`plantPngs` に登録:
```ts
<id>: [<id>1, <id>2, <id>3, <id>4, <id>5, <id>6, <id>7, <id>8],
```

### 5. `dev-tools/svg-viewer.html` を更新

```html
<option value="<id>"><表示名></option>
```

### 6. 型チェックで確認

```bash
npm run typecheck
```

## 注意事項

- フォーマッターが自動実行される（PostToolUse hook）ので、`ipc.ts` 編集後に再読み込みが必要なら Read してから次の Edit を行う
- `PLANT_IDS` の型 `PlantId` が他ファイル全体に伝播するため、登録漏れがあると型エラーになる
- PNG 画像がまだ生成されていない場合は先に `generate-flower-image` スキルを実行すること
