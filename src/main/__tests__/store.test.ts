import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getState,
  incrementPoints,
  updateState,
  flushState,
  checkGrowth,
  resetPlant,
  getCollection,
  recordBloom,
  flushCollection,
  resetCollection,
  getConsent,
  setConsent,
  resetConsent,
  flushConsent,
  PLANT_IDS,
  GROWTH_THRESHOLD,
  GROWTH_BANDS,
} from "../store";
import { isPlantState, isCollectionEntryArray } from "../../shared/ipc";

beforeEach(() => {
  resetPlant();
  resetCollection();
  resetConsent();
});

describe("getState", () => {
  it("beforeEach でリセット後に全フィールドが期待値を返す", () => {
    const state = getState();
    expect(state.totalPoints).toBe(0);
    expect(state.growthStage).toBe("seedling");
    expect(state.bloomedPlantId).toBeNull();
    expect(PLANT_IDS).toContain(state.plantId);
  });

  it("コピーを返す（参照渡しでない）", () => {
    const state1 = getState();
    const state2 = getState();
    expect(state1).not.toBe(state2);
    state1.totalPoints = 999;
    expect(getState().totalPoints).toBe(0);
  });
});

describe("incrementPoints", () => {
  it("指定した delta を totalPoints に加算する", () => {
    incrementPoints(5);
    expect(getState().totalPoints).toBe(5);
  });

  it("複数回の加算が累積される", () => {
    incrementPoints(1);
    incrementPoints(2);
    incrementPoints(10);
    expect(getState().totalPoints).toBe(13);
  });

  it("0 を加算しても変わらない", () => {
    incrementPoints(0);
    expect(getState().totalPoints).toBe(0);
  });
});

describe("incrementPoints + 成長遷移", () => {
  it("GROWTH_THRESHOLD * 3/8 に達したとき bud に自動遷移する", () => {
    incrementPoints(Math.ceil((GROWTH_THRESHOLD * 3) / (GROWTH_BANDS - 1)));
    expect(getState().growthStage).toBe("bud");
  });

  it("GROWTH_THRESHOLD に達したとき bloom に自動遷移する", () => {
    resetPlant(Date.now(), () => "rose");
    updateState({ growthStage: "bud", totalPoints: GROWTH_THRESHOLD - 1 });
    incrementPoints(1);
    expect(getState().growthStage).toBe("bloom");
    expect(getState().bloomedPlantId).toBe("rose");
  });

  it("bloom 中は totalPoints が加算されない", () => {
    resetPlant(Date.now(), () => "rose");
    updateState({
      growthStage: "bloom",
      totalPoints: GROWTH_THRESHOLD,
      bloomedPlantId: "rose",
    });
    incrementPoints(100);
    expect(getState().totalPoints).toBe(GROWTH_THRESHOLD);
  });

  it("bloom 中の加算は bloomedPlantId を変えない", () => {
    resetPlant(Date.now(), () => "rose");
    updateState({
      growthStage: "bloom",
      totalPoints: GROWTH_THRESHOLD,
      bloomedPlantId: "rose",
    });
    incrementPoints(1);
    expect(getState().bloomedPlantId).toBe("rose");
  });
});

describe("updateState", () => {
  it("部分更新をマージする", () => {
    updateState({ totalPoints: 42 });
    const state = getState();
    expect(state.totalPoints).toBe(42);
    expect(state.growthStage).toBe("seedling");
  });

  it("growthStage を更新できる", () => {
    updateState({ growthStage: "bud" });
    expect(getState().growthStage).toBe("bud");
  });

  it("bloomedPlantId を設定できる", () => {
    updateState({ bloomedPlantId: "rose" });
    expect(getState().bloomedPlantId).toBe("rose");
  });
});

describe("flushState", () => {
  it("_store が未初期化（initStore 未呼び出し）のとき何もしない", () => {
    expect(() => flushState()).not.toThrow();
  });
});

describe("checkGrowth", () => {
  it("seedling が GROWTH_THRESHOLD * 3/8 未満のとき何もしない", () => {
    updateState({
      totalPoints: Math.ceil((GROWTH_THRESHOLD * 3) / (GROWTH_BANDS - 1)) - 1,
    });
    checkGrowth();
    expect(getState().growthStage).toBe("seedling");
  });

  it("totalPoints が GROWTH_THRESHOLD * 3/8 に達したとき bud に遷移する", () => {
    updateState({
      totalPoints: Math.ceil((GROWTH_THRESHOLD * 3) / (GROWTH_BANDS - 1)),
    });
    checkGrowth();
    expect(getState().growthStage).toBe("bud");
  });

  it("totalPoints が GROWTH_THRESHOLD * 6/8 に達したとき bloom に遷移する", () => {
    resetPlant(Date.now(), () => "rose");
    updateState({
      totalPoints: Math.ceil((GROWTH_THRESHOLD * 6) / (GROWTH_BANDS - 1)),
      growthStage: "bud",
    });
    checkGrowth();
    expect(getState().growthStage).toBe("bloom");
    expect(getState().bloomedPlantId).toBeNull();
  });

  it("band 7（GROWTH_THRESHOLD 未満）ではまだ bloomedPlantId は null", () => {
    resetPlant(Date.now(), () => "rose");
    updateState({
      totalPoints: GROWTH_THRESHOLD - 1,
      growthStage: "bloom",
    });
    checkGrowth();
    expect(getState().bloomedPlantId).toBeNull();
  });

  it("GROWTH_THRESHOLD 到達で bloomedPlantId = plantId になる", () => {
    resetPlant(Date.now(), () => "rose");
    updateState({ totalPoints: GROWTH_THRESHOLD, growthStage: "bud" });
    checkGrowth();
    const state = getState();
    expect(state.growthStage).toBe("bloom");
    expect(state.bloomedPlantId).toBe("rose");
  });

  it("bloom 中は checkGrowth を呼んでも bloomedPlantId が変わらない", () => {
    resetPlant(Date.now(), () => "tulip");
    updateState({
      totalPoints: GROWTH_THRESHOLD,
      growthStage: "bloom",
      bloomedPlantId: "tulip",
    });
    const pick = vi.fn(() => "rose" as const);
    checkGrowth();
    expect(pick).not.toHaveBeenCalled();
    expect(getState().bloomedPlantId).toBe("tulip");
  });

  it("bloomedPlantId は PLANT_IDS の中の値である", () => {
    updateState({ totalPoints: GROWTH_THRESHOLD, growthStage: "bud" });
    checkGrowth();
    expect(PLANT_IDS).toContain(getState().bloomedPlantId);
  });
});

describe("resetPlant", () => {
  it("全フィールドをデフォルト値にリセットする", () => {
    updateState({
      totalPoints: 10000,
      growthStage: "bloom",
      bloomedPlantId: "rose",
    });
    resetPlant();
    const state = getState();
    expect(state.totalPoints).toBe(0);
    expect(state.growthStage).toBe("seedling");
    expect(state.bloomedPlantId).toBeNull();
  });

  it("clock 引数で startedAt が設定される", () => {
    resetPlant(12345);
    expect(getState().startedAt).toBe(12345);
  });

  it("plantId が PLANT_IDS 内の値である", () => {
    resetPlant();
    expect(PLANT_IDS).toContain(getState().plantId);
  });

  it("pickRandom 引数が plantId に反映される", () => {
    resetPlant(Date.now(), () => "sunflower");
    expect(getState().plantId).toBe("sunflower");
  });

  it("リセット後 incrementPoints が再び機能する", () => {
    updateState({
      growthStage: "bloom",
      totalPoints: GROWTH_THRESHOLD,
      bloomedPlantId: "rose",
    });
    resetPlant();
    incrementPoints(10);
    expect(getState().totalPoints).toBe(10);
  });

  it("コレクションには影響しない（図鑑はリセットされない）", () => {
    recordBloom("rose");
    resetPlant();
    expect(getCollection()).toHaveLength(1);
    expect(getCollection()[0].plantId).toBe("rose");
  });
});

describe("getCollection", () => {
  it("初期状態では空配列を返す", () => {
    expect(getCollection()).toEqual([]);
  });

  it("コピーを返す（外部変更がコレクションに影響しない）", () => {
    recordBloom("rose");
    const col = getCollection();
    col[0].totalBlooms = 999;
    expect(getCollection()[0].totalBlooms).toBe(1);
  });
});

describe("recordBloom", () => {
  it("新種の開花でエントリが追加される", () => {
    recordBloom("rose");
    const col = getCollection();
    expect(col).toHaveLength(1);
    expect(col[0].plantId).toBe("rose");
    expect(col[0].totalBlooms).toBe(1);
    expect(col[0].firstBloomed).toBeTruthy();
  });

  it("同種の2回目の開花で totalBlooms がインクリメントされる", () => {
    recordBloom("rose");
    recordBloom("rose");
    const col = getCollection();
    expect(col).toHaveLength(1);
    expect(col[0].totalBlooms).toBe(2);
  });

  it("異種の開花で別エントリが追加される", () => {
    recordBloom("rose");
    recordBloom("sunflower");
    expect(getCollection()).toHaveLength(2);
  });

  it("firstBloomed は ISO 8601 形式の文字列である", () => {
    recordBloom("tulip");
    const { firstBloomed } = getCollection()[0];
    expect(() => new Date(firstBloomed)).not.toThrow();
    expect(new Date(firstBloomed).toISOString()).toBe(firstBloomed);
  });
});

describe("flushCollection", () => {
  it("_store が未初期化（initStore 未呼び出し）のとき何もしない", () => {
    expect(() => flushCollection()).not.toThrow();
  });
});

describe("consent", () => {
  it("初期状態では同意フラグが false である", () => {
    expect(getConsent()).toBe(false);
  });

  it("setConsent() を呼ぶと true になる", () => {
    setConsent();
    expect(getConsent()).toBe(true);
  });

  it("resetConsent() で false に戻る", () => {
    setConsent();
    resetConsent();
    expect(getConsent()).toBe(false);
  });
});

describe("flushConsent", () => {
  it("_store が未初期化（initStore 未呼び出し）のとき何もしない", () => {
    expect(() => flushConsent()).not.toThrow();
  });
});

describe("incrementPoints + コレクション登録", () => {
  it("bloom 遷移時に getCollection にエントリが追加される", () => {
    resetPlant(Date.now(), () => "rose");
    updateState({ growthStage: "bud", totalPoints: GROWTH_THRESHOLD - 1 });
    incrementPoints(1);
    expect(getState().growthStage).toBe("bloom");
    const col = getCollection();
    expect(col).toHaveLength(1);
    expect(PLANT_IDS).toContain(col[0].plantId);
    expect(col[0].totalBlooms).toBe(1);
  });

  it("bloom 中の incrementPoints ではコレクションが変化しない", () => {
    resetPlant(Date.now(), () => "rose");
    updateState({
      growthStage: "bloom",
      totalPoints: GROWTH_THRESHOLD,
      bloomedPlantId: "rose",
    });
    incrementPoints(100);
    expect(getCollection()).toHaveLength(0);
  });
});

describe("type guards", () => {
  describe("isPlantState", () => {
    it("有効な PlantState を受け入れる", () => {
      expect(
        isPlantState({
          totalPoints: 0,
          growthStage: "seedling",
          plantId: "rose",
          bloomedPlantId: null,
          startedAt: null,
        }),
      ).toBe(true);
    });

    it("null を拒否する", () => {
      expect(isPlantState(null)).toBe(false);
    });

    it("不正な growthStage を拒否する", () => {
      expect(
        isPlantState({
          totalPoints: 0,
          growthStage: "sprout",
          plantId: "rose",
          bloomedPlantId: null,
          startedAt: null,
        }),
      ).toBe(false);
    });

    it("不正な plantId を拒否する", () => {
      expect(
        isPlantState({
          totalPoints: 0,
          growthStage: "seedling",
          plantId: "cactus",
          bloomedPlantId: null,
          startedAt: null,
        }),
      ).toBe(false);
    });

    it("負の totalPoints を拒否する", () => {
      expect(
        isPlantState({
          totalPoints: -1,
          growthStage: "seedling",
          plantId: "rose",
          bloomedPlantId: null,
          startedAt: null,
        }),
      ).toBe(false);
    });

    it("bloomedPlantId が有効な PlantId の場合を受け入れる", () => {
      expect(
        isPlantState({
          totalPoints: 15000,
          growthStage: "bloom",
          plantId: "rose",
          bloomedPlantId: "rose",
          startedAt: 1700000000000,
        }),
      ).toBe(true);
    });
  });

  describe("isCollectionEntryArray", () => {
    it("空配列を受け入れる", () => {
      expect(isCollectionEntryArray([])).toBe(true);
    });

    it("有効なコレクションを受け入れる", () => {
      expect(
        isCollectionEntryArray([
          {
            plantId: "rose",
            firstBloomed: new Date().toISOString(),
            totalBlooms: 1,
          },
        ]),
      ).toBe(true);
    });

    it("null を拒否する", () => {
      expect(isCollectionEntryArray(null)).toBe(false);
    });

    it("オブジェクトを拒否する", () => {
      expect(isCollectionEntryArray({})).toBe(false);
    });

    it("totalBlooms が 0 のエントリを拒否する", () => {
      expect(
        isCollectionEntryArray([
          {
            plantId: "rose",
            firstBloomed: new Date().toISOString(),
            totalBlooms: 0,
          },
        ]),
      ).toBe(false);
    });
  });
});

describe("initStore: privacyConsent 復元バリデーション", () => {
  const validPlant = {
    totalPoints: 0,
    growthStage: "seedling",
    plantId: "rose",
    bloomedPlantId: null,
    startedAt: Date.now(),
  };

  async function runInitWithConsent(rawConsent: unknown) {
    const data: Record<string, unknown> = {
      privacyConsent: rawConsent,
      plant: validPlant,
      collection: [],
    };
    const mockSet = vi.fn((key: string, value: unknown) => {
      data[key] = value;
    });
    vi.doMock("electron-store", () => ({
      default: class {
        get(key: string) {
          return data[key];
        }
        set(key: string, value: unknown) {
          mockSet(key, value);
        }
      },
    }));
    vi.resetModules();
    const store = await import("../store");
    store.resetConsent();
    await store.initStore();
    vi.doUnmock("electron-store");
    return { getConsent: store.getConsent, mockSet };
  }

  it("true を復元すると getConsent() が true になる", async () => {
    const { getConsent } = await runInitWithConsent(true);
    expect(getConsent()).toBe(true);
  });

  it("false を復元すると getConsent() が false になる", async () => {
    const { getConsent } = await runInitWithConsent(false);
    expect(getConsent()).toBe(false);
  });

  it.each([
    { label: '"false"（文字列）は false にフォールバックしてストアを上書きする', raw: "false" },
    { label: "null は false にフォールバックしてストアを上書きする", raw: null },
    { label: "undefined は false にフォールバックしてストアを上書きする", raw: undefined },
    { label: "数値 1 は false にフォールバックしてストアを上書きする", raw: 1 },
  ])("$label", async ({ raw }) => {
    const { getConsent, mockSet } = await runInitWithConsent(raw);
    expect(getConsent()).toBe(false);
    expect(mockSet).toHaveBeenCalledWith("privacyConsent", false);
  });
});
