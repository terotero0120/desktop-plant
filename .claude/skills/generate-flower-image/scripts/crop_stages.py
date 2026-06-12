#!/usr/bin/env python3
"""
all-stages.png を8分割して個別PNG（1.png〜8.png）を生成するスクリプト。
マゼンタ（#ff00ff）背景をアルファ化し、各ステージを 400×600px で書き出す。

使い方:
    python crop_stages.py <all-stages.png のパス> <出力ディレクトリ>

例:
    python crop_stages.py imagegen-output/higanbana-growth-8-stages-png/all-stages.png \
                          imagegen-output/higanbana-growth-8-stages-png/
"""

import sys
from pathlib import Path
import numpy as np

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow が見つかりません。`pip install pillow` を実行してください。")

sys.path.insert(0, str(Path(__file__).parent))
from defringe import defringe  # noqa: E402

OUTPUT_WIDTH = 400
OUTPUT_HEIGHT = 600
NUM_STAGES = 8
# マゼンタ除去の閾値（R>200, G<50, B>200）
CHROMA_R_MIN = 200
CHROMA_G_MAX = 50
CHROMA_B_MIN = 200


def remove_chroma(img: Image.Image) -> Image.Image:
    data = np.array(img.convert("RGBA"))
    mask = (
        (data[:, :, 0] > CHROMA_R_MIN)
        & (data[:, :, 1] < CHROMA_G_MAX)
        & (data[:, :, 2] > CHROMA_B_MIN)
    )
    data[mask] = [0, 0, 0, 0]
    return Image.fromarray(data)


def fix_left_edge(img: Image.Image) -> Image.Image:
    # x=0, x=1 列に残る白ピクセルを透明化する。
    # Retina (2x) 環境では CSS 1px = 物理 2px のため両列が必要。
    data = np.array(img.convert("RGBA"))
    data[:, 0:2, 3] = 0
    return Image.fromarray(data)


def main(src_path: str, out_dir: str) -> None:
    src = Path(src_path)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    img = Image.open(src).convert("RGBA")
    w, h = img.size
    stage_w = w // NUM_STAGES

    print(f"入力: {src} ({w}x{h})")
    print(f"各ステージ幅: {stage_w}px → リサイズ先: {OUTPUT_WIDTH}x{OUTPUT_HEIGHT}px")

    for i in range(NUM_STAGES):
        crop = img.crop((i * stage_w, 0, (i + 1) * stage_w, h))
        processed = defringe(remove_chroma(crop))
        if processed.size != (OUTPUT_WIDTH, OUTPUT_HEIGHT):
            processed = processed.resize((OUTPUT_WIDTH, OUTPUT_HEIGHT), Image.LANCZOS)
        processed = fix_left_edge(processed)
        dest = out / f"{i + 1}.png"
        processed.save(dest)
        print(f"  保存: {dest}")

    print("完了")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(f"使い方: {sys.argv[0]} <all-stages.png> <出力ディレクトリ>")
    main(sys.argv[1], sys.argv[2])
