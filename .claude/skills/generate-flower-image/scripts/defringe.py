#!/usr/bin/env python3
"""
クロマキー透過後のPNGに残るマゼンタフリンジ（縁の残色）を除去するスクリプト。

ハードな閾値キーイングでは、マゼンタ背景と前景色のブレンドである
アンチエイリアスピクセルが閾値を外れて残る。本スクリプトは
透明領域に隣接するバンド内だけを対象に:

1. 汚染ピクセルの色を近傍のクリーンな色で置き換える（紫系の花弁を
   誤判定しても近傍の花弁色に置き換わるだけで実害がない）
2. マゼンタ度に応じてアルファを下げ、滑らかな縁を復元する

オプション:
    --aggressive  花弁に封じ込められた塊（背景非連結）も除去する
    --warm        黄〜赤〜茶の暖色花用。B>G を残らず除去する強力モード
                  （紫・青・ピンクの花には使わないこと）

使い方:
    python defringe.py [--aggressive] [--warm] <PNGファイル>...
"""

import sys
import numpy as np

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow が見つかりません。`pip install pillow` を実行してください。")

# マゼンタ度 min(R,B)-G がこの値を超えるバンド内ピクセルをフリンジとみなす。
# 黄色系の花弁とのブレンドは m=13〜50 程度の薄いサーモンピンクになるため低めに設定。
# 正当な花色（ヒガンバナの花糸 m≈30 等）はバンド内でも近傍色置換で保護される
MAGENTA_THRESHOLD = 12
# 暖色花モード（--warm）の閾値。黄色〜赤〜茶の花は B>G が原理的に存在しない（黄=R+G,
# 橙・茶・緑いずれも G>=B）ため、わずかな青超過（m>1）はすべてマゼンタ残色と断定できる。
# 紫・青・ピンクの花（lavender/hydrangea/rose 等）には使わないこと。
WARM_THRESHOLD = 1
# 透明領域からこのピクセル数以内をフリンジ候補バンドとする
BAND_PX = 3
# 透明領域に連結した強マゼンタ塊（取り残し）を完全透明化する閾値。
# 花弁の正当なピンク〜紫はほぼ m<=130（lavender 実測 p99=127）に収まる
FLOOD_THRESHOLD = 130
# 花弁の谷間などバンドより深く残る「ポケット」汚染の連結成分サイズ上限。
# 正当なピンク〜紫の花は m>20 の画素が花全体で巨大な成分になるため除外される
MAX_POCKET_SIZE = 100


def _dilate(mask: np.ndarray, iterations: int) -> np.ndarray:
    # 8近傍の膨張。np.roll は端で巻き戻るためスライスで非循環シフトする。
    m = mask.copy()
    for _ in range(iterations):
        grown = m.copy()
        grown[1:, :] |= m[:-1, :]
        grown[:-1, :] |= m[1:, :]
        grown[:, 1:] |= m[:, :-1]
        grown[:, :-1] |= m[:, 1:]
        m = grown
    return m


def _fill_from_neighbors(rgb: np.ndarray, known: np.ndarray, todo: np.ndarray) -> np.ndarray:
    # known な色を todo 領域へ反復的に伝播させる（近傍平均によるインペイント）。
    color = rgb.astype(np.float64)
    color[~known] = 0.0
    weight = known.astype(np.float64)
    remaining = todo & ~known
    for _ in range(BAND_PX * 4):
        if not remaining.any():
            break
        csum = np.zeros_like(color)
        wsum = np.zeros_like(weight)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            shifted_c = np.zeros_like(color)
            shifted_w = np.zeros_like(weight)
            src_y = slice(max(0, -dy), color.shape[0] - max(0, dy))
            dst_y = slice(max(0, dy), color.shape[0] - max(0, -dy))
            src_x = slice(max(0, -dx), color.shape[1] - max(0, dx))
            dst_x = slice(max(0, dx), color.shape[1] - max(0, -dx))
            shifted_c[dst_y, dst_x] = color[src_y, src_x]
            shifted_w[dst_y, dst_x] = weight[src_y, src_x]
            csum += shifted_c
            wsum += shifted_w
        fillable = remaining & (wsum > 0)
        color[fillable] = csum[fillable] / wsum[fillable][:, None]
        weight[fillable] = 1.0
        remaining = remaining & ~fillable
    return color


def _find_pockets(
    candidates: np.ndarray, near_bg: np.ndarray, aggressive: bool
) -> np.ndarray:
    # 候補ピクセルの8連結成分のうち、小さく（<= MAX_POCKET_SIZE）かつ
    # 透明背景に接しているものをポケット汚染として返す。
    # aggressive 時は背景接触を要求せず、花弁に封じ込められた塊も対象にする
    # （正当なピンクの粒を持つ花には使わないこと）。
    pockets = np.zeros_like(candidates)
    visited = np.zeros_like(candidates)
    h, w = candidates.shape
    ys, xs = np.where(candidates)
    for sy, sx in zip(ys, xs):
        if visited[sy, sx]:
            continue
        stack = [(sy, sx)]
        visited[sy, sx] = True
        component = []
        too_big = False
        while stack:
            y, x = stack.pop()
            component.append((y, x))
            if len(component) > MAX_POCKET_SIZE:
                too_big = True
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and candidates[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        stack.append((ny, nx))
        if too_big:
            continue
        if aggressive or any(near_bg[y, x] for y, x in component):
            for y, x in component:
                pockets[y, x] = True
    return pockets


def defringe(
    img: Image.Image, aggressive: bool = False, warm: bool = False
) -> Image.Image:
    data = np.array(img.convert("RGBA"))
    rgb = data[:, :, :3].astype(int)
    alpha = data[:, :, 3]

    threshold = WARM_THRESHOLD if warm else MAGENTA_THRESHOLD
    magenta = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    bg = alpha == 0

    # 背景に連結した強マゼンタ塊（キーイング取り残し）を背景へ取り込む。
    # 花の内部にある正当なピンク（背景と非連結）はフラッドが届かないため安全。
    candidates = (magenta > FLOOD_THRESHOLD) & ~bg
    while True:
        grown = _dilate(bg, 1) & candidates
        if not grown.any():
            break
        bg = bg | grown
        candidates = candidates & ~grown
    alpha[bg] = 0
    data[:, :, 3] = alpha

    band = _dilate(bg, BAND_PX) & ~bg
    contaminated = band & (magenta > threshold)

    # バンドより深い位置に残る小さなポケット汚染も対象に加える。
    # バンド汚染も候補に含め、バンド経由で背景につながる成分を分断しない
    candidates = (magenta > threshold) & ~bg
    pockets = _find_pockets(candidates, _dilate(bg, 2), aggressive)
    contaminated = contaminated | pockets

    if not contaminated.any():
        return Image.fromarray(data)

    clean = ~bg & ~contaminated
    filled = _fill_from_neighbors(data[:, :, :3], clean, contaminated)
    data[contaminated, :3] = np.clip(filled[contaminated], 0, 255).astype(np.uint8)

    # マゼンタ度が強いほど背景の寄与が大きい縁なので、アルファを比例して下げる
    ramp = np.clip((255 - magenta) / (255 - threshold), 0.0, 1.0)
    data[contaminated, 3] = (alpha[contaminated] * ramp[contaminated]).astype(np.uint8)
    return Image.fromarray(data)


def main(args: list[str]) -> None:
    flags = {"--aggressive", "--warm"}
    aggressive = "--aggressive" in args
    warm = "--warm" in args
    paths = [a for a in args if a not in flags]
    tag = "".join(
        f" ({label})"
        for label, on in (("aggressive", aggressive), ("warm", warm))
        if on
    )
    for path in paths:
        img = Image.open(path)
        defringe(img, aggressive=aggressive, warm=warm).save(path)
        print(f"defringe{tag}: {path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(f"使い方: {sys.argv[0]} [--aggressive] [--warm] <PNGファイル>...")
    main(sys.argv[1:])
