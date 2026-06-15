#!/usr/bin/env python3
"""
all-stages.png を8分割して個別PNG（1.png〜8.png）を生成するスクリプト。
背景をアルファ化し、各ステージを 400×600px で書き出す。

背景方式（生成時の背景色に合わせる）:
- マゼンタ（#ff00ff、デフォルト）: 紫・青・ピンクを含む花用
- 青（#0000ff、--blue）: 黄・橙・赤・茶・緑が主体の花用。色差キーで色相を
  汚さず抜けるため珊瑚色フリンジが出ない（暖色花の推奨パス）

使い方:
    python crop_stages.py [--aggressive] [--warm] [--blue] \
        <all-stages.png のパス> <出力ディレクトリ>

例:
    python crop_stages.py --blue imagegen-output/sunflower-growth-8-stages-png/all-stages.png \
                          imagegen-output/sunflower-growth-8-stages-png/
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
# 青スクリーン色差キー。diff=B-max(R,G) がこの値以上で完全透明、0以下で完全不透明。
BLUE_KEY_SCALE = 160


def remove_chroma(img: Image.Image) -> Image.Image:
    data = np.array(img.convert("RGBA"))
    mask = (
        (data[:, :, 0] > CHROMA_R_MIN)
        & (data[:, :, 1] < CHROMA_G_MAX)
        & (data[:, :, 2] > CHROMA_B_MIN)
    )
    data[mask] = [0, 0, 0, 0]
    return Image.fromarray(data)


def remove_blue_screen(img: Image.Image) -> Image.Image:
    # 青背景(#0000ff)用の色差キー。黄・橙・茶・緑の暖色/植物は B>max(R,G) と
    # なる画素が背景以外に存在しないため、青優勢度で前景/背景を完全分離できる。
    # マゼンタ方式と違い色相を決める R・G を一切汚さないので珊瑚色リングが出ない。
    data = np.array(img.convert("RGBA")).astype(np.int32)
    r, g, b = data[:, :, 0], data[:, :, 1], data[:, :, 2]
    maxrg = np.maximum(r, g)
    diff = b - maxrg  # 青優勢度。被写体（暖色・緑）では 0 以下
    alpha = np.clip(1.0 - diff / BLUE_KEY_SCALE, 0.0, 1.0)
    # デスピル: 青の溢れを抑え B<=G に収める（R:G の色相を保ったまま青被りを除去）
    b_despill = np.minimum(b, g)
    out = np.empty(data.shape, dtype=np.uint8)
    out[:, :, 0] = r
    out[:, :, 1] = g
    out[:, :, 2] = b_despill
    out[:, :, 3] = np.round(alpha * data[:, :, 3]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def fix_left_edge(img: Image.Image) -> Image.Image:
    # x=0, x=1 列に残る白ピクセルを透明化する。
    # Retina (2x) 環境では CSS 1px = 物理 2px のため両列が必要。
    data = np.array(img.convert("RGBA"))
    data[:, 0:2, 3] = 0
    return Image.fromarray(data)


def main(
    src_path: str,
    out_dir: str,
    aggressive: bool = False,
    warm: bool = False,
    screen: str = "magenta",
) -> None:
    src = Path(src_path)
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    img = Image.open(src).convert("RGBA")
    w, h = img.size
    stage_w = w // NUM_STAGES

    print(f"入力: {src} ({w}x{h}) スクリーン: {screen}")
    print(f"各ステージ幅: {stage_w}px → リサイズ先: {OUTPUT_WIDTH}x{OUTPUT_HEIGHT}px")

    for i in range(NUM_STAGES):
        crop = img.crop((i * stage_w, 0, (i + 1) * stage_w, h))
        if screen == "blue":
            # 青スクリーンは色差キーで色相を汚さず抜けるため defringe 不要
            processed = remove_blue_screen(crop)
        else:
            processed = defringe(remove_chroma(crop), aggressive=aggressive, warm=warm)
        if processed.size != (OUTPUT_WIDTH, OUTPUT_HEIGHT):
            processed = processed.resize((OUTPUT_WIDTH, OUTPUT_HEIGHT), Image.LANCZOS)
        processed = fix_left_edge(processed)
        dest = out / f"{i + 1}.png"
        processed.save(dest)
        print(f"  保存: {dest}")

    print("完了")


if __name__ == "__main__":
    flags = {"--aggressive", "--warm", "--blue"}
    pos = [a for a in sys.argv[1:] if a not in flags]
    if len(pos) != 2:
        sys.exit(
            f"使い方: {sys.argv[0]} [--aggressive] [--warm] [--blue] "
            "<all-stages.png> <出力ディレクトリ>\n"
            "  --warm は黄〜赤〜茶の暖色花のマゼンタ背景用（紫・青・ピンクの花には使わない）\n"
            "  --blue は青背景(#0000ff)で生成した暖色/緑の花用（色差キーで珊瑚色リングが出ない）"
        )
    main(
        pos[0],
        pos[1],
        aggressive="--aggressive" in sys.argv,
        warm="--warm" in sys.argv,
        screen="blue" if "--blue" in sys.argv else "magenta",
    )
