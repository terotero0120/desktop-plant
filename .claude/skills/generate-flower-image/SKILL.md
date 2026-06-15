---
name: generate-flower-image
description: 花の成長8段階PNGをCodexに生成させる。「〇〇のSVG/PNG/画像を作って」「〇〇を8段階で描いて」「花の画像を生成して」「新しい花を追加するための画像が必要」「〇〇の植物を描いてほしい」などと言われたときに必ず使う。植物のWebリサーチから8段階設計・PNG生成・人間レビューまで一連のワークフローをCodexに依頼する。add-flowerスキルでコード登録する前の素材生成フェーズ。
---

# 花の成長8段階PNG生成

Codex に花の8段階成長PNGを生成させるワークフロー。リサーチ・設計・画像生成を**単一セッション**で完結させる。

## 前提仕様

- 最終成果物: PNG（RGBA、背景透過）
- 解像度: **400×600 px**（表示サイズ200×300の2x、Retina対応）
- 植木鉢を各PNGに合成済みにする（アプリ側の pot.svg レイヤーは後で対応）
- 画像生成には Codex の **`$Imagegen` スキル**を必ず使う

## スタイルリファレンス

`imagegen-output/style-reference/` にリファレンス画像を置く運用。

- ファイルがあればそのスタイル・鉢デザインを踏襲するよう Codex に渡す
- ファイルがなければスタイルはプロンプトで指示する（淡いガッシュ・水彩風）

---

## 手順

### 0. 準備

花のID（英語 kebab-case）と日本語名をユーザーから確認する。

出力ディレクトリを作成:
```bash
mkdir -p imagegen-output/<flower-id>-growth-8-stages-png
```

スタイルリファレンスの存在を確認:
```bash
ls imagegen-output/style-reference/
```

プロジェクトルートを取得:
```bash
git rev-parse --show-toplevel
```

---

### 1. Session 1 — プレビュー生成（リサーチ + all-stages.png）

Web調査と `all-stages.png` のプレビュー生成を1セッションで行う。
個別の `1.png~8.png` はまだ生成しない。

```bash
codex exec -C <project_root> --sandbox workspace-write \
  -i <project_root>/imagegen-output/style-reference/<reference-file> \
  < /tmp/<flower-id>-session1-prompt.txt
```

**Session 1 プロンプト**:

```
あなたは植物イラストレーターと植物学者を兼ねた専門家です。
「<花名（日本語）>」（英語ID: <flower-id>）の成長8段階をデザインし、
レビュー用のプレビュー画像を生成してください。
画像生成には必ず $Imagegen スキルを使ってください。

## 作業ディレクトリ
<project_root>/imagegen-output/<flower-id>-growth-8-stages-png/

---

## STEP 1: Web調査

以下の観点で「<花名>」をWebで調べてください:

- 成長タイプ（直立 / つる性 / 横に広がる / 株立ちなど）
- 発芽直後の姿（双葉の形、本葉との違い）
- 葉の形（丸い、細長い、ハート形、切れ込み、鋸歯、葉脈）
- 葉の付き方（対生、互生、根元に集まる、茎に沿って増える）
- 茎の特徴（太さ、色、つる、毛、直立/巻き付き）
- 成長シルエット（縦長、横広がり、コンパクト、枝分かれ）
- つぼみの位置（先端、葉の付け根、単独、複数）
- 花の形（ラッパ型、星形、丸型、花弁数、花の向き）
- 花の色（代表色、中心色、グラデーション）
- 開花直前と開花後の対応（つぼみ位置が花位置に自然につながるか）
- 避けるべき誤表現（似た花との混同、実際にはない葉形や花形）

---

## STEP 2: プレビュー画像の生成（$Imagegen 1回呼び出し）

STEP 1の調査結果をもとに、8段階の成長を1枚に収めたプレビュー画像を生成してください。

$Imagegen を **1回だけ** 呼び出し、横長の1枚画像として全8ステージを描いてください。
個別ファイル（1.png〜8.png）はまだ生成しません。

### プレビュー画像の仕様
- 解像度: **3200×600 px**（各ステージ400px幅 × 8 = 3200px）
- 8ステージを左から右へ**等幅（各400px）**で横並びに配置する
- 切り出し目印として、各ステージの境界（x=400, 800, 1200...）に**細い白い縦線（2px）**を入れる
- 背景色: **花色に合わせて選ぶ**（後で透過処理するためのクロマキー色）
  - **黄・橙・赤・茶・緑が主体で青/水色/紫を含まない花（ひまわり等）→ 純青 #0000ff**。
    色相を決める R・G を汚さず色差キーで抜けるため珊瑚色リングが出ない（推奨）。
    被写体に青系色を一切使わない／影も暖色〜緑の暗色にする指示を必ず添える
  - **紫・青・ピンクを含む花（lavender/hydrangea/rose 等）→ マゼンタ #ff00ff**。
    青背景だと花弁の青/紫が抜けてしまうため
- 植木鉢あり

### スタイルリファレンス（添付画像）
このセッションには `-i` で添付されたスタイルリファレンス画像があります。
$Imagegen を呼び出す際にこの画像をスタイルリファレンスとして渡してください。
植物の種類は<花名>に変えますが、絵のタッチ・色調・植木鉢デザインはリファレンスに忠実に合わせること。

### 出力
- ファイル名: `all-stages.png`
- 保存先: <project_root>/imagegen-output/<flower-id>-growth-8-stages-png/
- 完了後、ファイルパスを出力してください。
```

---

### 2. Claude による画像チェック

Session 1 完了後、`all-stages.png` を読み込み、**Web検索で得た植物情報と照合**して成長描写の妥当性を検証する。

#### 2-1. 画像を読み込む

```bash
# Read ツールで all-stages.png を読み込む（Claude は画像を視覚的に認識できる）
```

#### 2-2. Web検索で植物情報を確認

WebSearch ツールで `<花名> 成長 特徴 開花 植物学` などを検索し、以下の観点で正確な情報を収集する:

- 実際の成長段階と外見の変化
- 葉・茎・花の形状・色の特徴
- その花に特有の誤表現パターン（似た花との混同など）

#### 2-3. 各ステージを照合してレポートする

以下のチェックリストに沿って `all-stages.png` の各ステージを評価し、ユーザーに報告する:

| チェック項目 | 確認内容 |
|-------------|---------|
| ステージ進行 | 左→右で自然な成長順になっているか |
| 植物固有の特徴 | Web調査で判明した形状・色が反映されているか |
| 誤表現の有無 | 同種・近縁種との混同、あり得ない葉形や花形がないか |
| 連続性 | ステージ間（特に7→8のつぼみ→開花）に違和感がないか |
| スタイル | リファレンス画像のタッチ・色調と一致しているか |

**問題があれば具体的に指摘し、Session 1 を修正指示付きで再実行するか確認する。**
問題なければ次のステップへ進む。

---

### 3. 切り出し — 個別PNG生成（1.png〜8.png）

レビューOK後、バンドルスクリプトで `all-stages.png` を切り出す。Codex 不要。
**生成時の背景色に合わせてオプションを選ぶ:**

```bash
# 青背景で生成した暖色/緑の花（ひまわり等）→ --blue を付ける（推奨パス）
python <skill_dir>/scripts/crop_stages.py --blue \
  <project_root>/imagegen-output/<flower-id>-growth-8-stages-png/all-stages.png \
  <project_root>/imagegen-output/<flower-id>-growth-8-stages-png/

# マゼンタ背景で生成した紫・青・ピンクの花 → オプションなし
python <skill_dir>/scripts/crop_stages.py \
  <project_root>/imagegen-output/<flower-id>-growth-8-stages-png/all-stages.png \
  <project_root>/imagegen-output/<flower-id>-growth-8-stages-png/
```

`<skill_dir>` は このスキルファイルと同じディレクトリ（`generate-flower-image/`）。
Pillow がない場合は `pip install pillow` を先に実行する。

- `--blue`: 青背景(#0000ff)を色差キーで抜く。R・G を汚さないため珊瑚色リングが原理的に出ない。**暖色/緑の花の推奨パス**
- （マゼンタ背景時）`--warm`: 黄〜赤〜茶の暖色花でマゼンタ残色を強除去。`--aggressive`: 花弁に封じ込められた塊も除去。いずれも**紫・青・ピンクの花には使わない**

> 暖色花でマゼンタ背景を使うと、背景の青みが花弁の縁に焼き込まれ珊瑚色リングとして残る。`defringe` の各種オプションでも完全には消せない（清浄な花弁と汚染の B/G 比が重なるため）。暖色花は最初から **青背景＋`--blue`** で生成するのが根本解。

個別PNG生成後でも `scripts/defringe.py [--warm] [--aggressive] <png>...` で再処理できる（マゼンタ背景時のみ）。

---

### 4. Claude による検証

```bash
# ファイル存在確認
ls imagegen-output/<flower-id>-growth-8-stages-png/{1..8}.png

# サイズ・透過確認
sips -g pixelWidth -g pixelHeight -g hasAlpha \
  imagegen-output/<flower-id>-growth-8-stages-png/{1..8}.png
```

期待値: `pixelWidth: 400` / `pixelHeight: 600` / `hasAlpha: yes`

#### 左端白線アーティファクト

`crop_stages.py` が切り出し時に x=0・x=1 列の白ピクセルを自動で透明化する（`fix_left_edge` 関数）。手動対応不要。

---

### 5. 画像を開く

```bash
open <project_root>/imagegen-output/<flower-id>-growth-8-stages-png/{1..8}.png
```

---

### 6. 完了報告

```
完了しました。
生成先: imagegen-output/<flower-id>-growth-8-stages-png/1.png 〜 8.png

次のステップ: add-flower スキルでコード登録してください。
```

---

## 注意

- Session 1（リサーチ + all-stages.png生成）は単一の Codex セッションで実行する
- `all-stages.png` は 3200×600px・等幅8分割で生成する（切り出しの前提）。背景色は花色で選ぶ（暖色/緑→青 #0000ff、紫・青・ピンク→マゼンタ #ff00ff）
- 個別PNG（1.png〜8.png）の生成は Codex 不要。Claude が Python で切り出し + 透過処理する
- スタイルリファレンスは `codex exec -i` で直接渡す。テキスト分析経由ではなく画像そのものを $Imagegen に渡すことでスタイル一致精度を上げる
- `codex exec -i` と同時にプロンプトを渡す場合は stdin リダイレクト（`< prompt.txt`）を使う。引数での指定は `-i` と競合して動かない
- `--full-auto` は非推奨。`--sandbox workspace-write` を使う
- 植木鉢はPNGに合成済みにする。アプリ側の `pot.svg` レイヤーとの二重表示は後で対応
- 透過処理はクロマキー方式。暖色/緑の花は青背景＋色差キー(`--blue`)が最良（珊瑚色リングが出ない）、紫・青・ピンクの花はマゼンタ背景を使う
- Pillowが見つからない場合、Codexが広域検索で時間を使うことがある。見つからなければOS標準ツールで代替させる
