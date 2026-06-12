import { describe, it, expect } from "vitest";
import {
  calcBandIndex,
  calcRemainingToNextStage,
  GROWTH_BANDS,
  STAGE_BUD_BAND,
  STAGE_BLOOM_BAND,
} from "../ipc";

const THRESHOLD = 30_000;

describe("calcBandIndex", () => {
  it("0pt で band 0 を返す", () => {
    expect(calcBandIndex(0, THRESHOLD)).toBe(0);
  });

  it("band 3 境界の直前（threshold*3/8 - 1pt）は band 2 を返す", () => {
    // STAGE_BUD_BAND = 3, GROWTH_BANDS - 1 = 8
    // band 3 の下限 = ceil(THRESHOLD * 3 / 8) = ceil(11250) = 11250
    const boundary = Math.ceil(
      (THRESHOLD * STAGE_BUD_BAND) / (GROWTH_BANDS - 1),
    );
    expect(calcBandIndex(boundary - 1, THRESHOLD)).toBe(STAGE_BUD_BAND - 1);
  });

  it("band 3 境界ちょうどは band 3 を返す", () => {
    const boundary = Math.ceil(
      (THRESHOLD * STAGE_BUD_BAND) / (GROWTH_BANDS - 1),
    );
    expect(calcBandIndex(boundary, THRESHOLD)).toBe(STAGE_BUD_BAND);
  });

  it("band 6 境界の直前は band 5 を返す", () => {
    const boundary = Math.ceil(
      (THRESHOLD * STAGE_BLOOM_BAND) / (GROWTH_BANDS - 1),
    );
    expect(calcBandIndex(boundary - 1, THRESHOLD)).toBe(STAGE_BLOOM_BAND - 1);
  });

  it("band 6 境界ちょうどは band 6 を返す", () => {
    const boundary = Math.ceil(
      (THRESHOLD * STAGE_BLOOM_BAND) / (GROWTH_BANDS - 1),
    );
    expect(calcBandIndex(boundary, THRESHOLD)).toBe(STAGE_BLOOM_BAND);
  });

  it("threshold ちょうどは最大バンド（band 8）を返す", () => {
    expect(calcBandIndex(THRESHOLD, THRESHOLD)).toBe(GROWTH_BANDS - 1);
  });

  it("threshold を超えても最大バンド（band 8）にクランプされる", () => {
    expect(calcBandIndex(THRESHOLD + 1, THRESHOLD)).toBe(GROWTH_BANDS - 1);
    expect(calcBandIndex(THRESHOLD * 2, THRESHOLD)).toBe(GROWTH_BANDS - 1);
  });

  it("threshold 未満は最大でも band 7 を返す", () => {
    // threshold - 1 は band 7 になるはず
    expect(calcBandIndex(THRESHOLD - 1, THRESHOLD)).toBe(GROWTH_BANDS - 2);
  });
});

describe("calcRemainingToNextStage", () => {
  it("seedling: 蕾（band 3）までの残りポイントを返す", () => {
    // band 3 下限 = ceil(30000 * 3 / 8) = 11250
    const expected = Math.ceil(
      (THRESHOLD * STAGE_BUD_BAND) / (GROWTH_BANDS - 1),
    );
    expect(calcRemainingToNextStage(0, THRESHOLD, "seedling")).toBe(expected);
  });

  it("seedling: 0未満にならず 0 でクランプされる", () => {
    // band 3 を超えているが growthStage が seedling のまま渡された場合
    const overBoundary =
      Math.ceil((THRESHOLD * STAGE_BUD_BAND) / (GROWTH_BANDS - 1)) + 100;
    expect(calcRemainingToNextStage(overBoundary, THRESHOLD, "seedling")).toBe(
      0,
    );
  });

  it("bud: 開花（band 6）までの残りポイントを返す", () => {
    const boundary = Math.ceil(
      (THRESHOLD * STAGE_BUD_BAND) / (GROWTH_BANDS - 1),
    );
    const nextBoundary = Math.ceil(
      (THRESHOLD * STAGE_BLOOM_BAND) / (GROWTH_BANDS - 1),
    );
    expect(calcRemainingToNextStage(boundary, THRESHOLD, "bud")).toBe(
      nextBoundary - boundary,
    );
  });

  it("bud: 0未満にならず 0 でクランプされる", () => {
    const overBoundary =
      Math.ceil((THRESHOLD * STAGE_BLOOM_BAND) / (GROWTH_BANDS - 1)) + 100;
    expect(calcRemainingToNextStage(overBoundary, THRESHOLD, "bud")).toBe(0);
  });

  it("bloom かつ threshold 未満: threshold までの残りを返す", () => {
    const pts = THRESHOLD - 1000;
    expect(calcRemainingToNextStage(pts, THRESHOLD, "bloom")).toBe(1000);
  });

  it("bloom かつ threshold 以上: null を返す", () => {
    expect(calcRemainingToNextStage(THRESHOLD, THRESHOLD, "bloom")).toBeNull();
    expect(
      calcRemainingToNextStage(THRESHOLD + 1, THRESHOLD, "bloom"),
    ).toBeNull();
  });
});
