# dev-tools

開発用ツール置き場。ビルド成果物には含まれない。

## svg-viewer.html

花のSVG画像（成長段階1〜8）をブラウザで確認するツール。

```
open dev-tools/svg-viewer.html
```

### 花を増やすとき

1. SVGファイルを追加する
   ```
   src/renderer/src/assets/plants/{花の名前}/1.svg 〜 8.svg
   ```

2. `svg-viewer.html` の `<select>` に `<option>` を追記する
   ```html
   <select id="flower-select">
     <option value="rose">Rose</option>
     <option value="sunflower">Sunflower</option>
     <option value="tulip">Tulip</option>
     <option value="{花の名前}">{表示名}</option>  ← 追加
   </select>
   ```
