// electron-store v8 は ESM-only のため dynamic import を使用する

import type {
  CollectionEntry,
  GrowthStage,
  PlantId,
  PlantState,
} from "../shared/ipc";
import {
  PLANT_IDS,
  GROWTH_BANDS,
  calcBandIndex,
  STAGE_BUD_BAND,
  STAGE_BLOOM_BAND,
  isPlantState,
  isCollectionEntryArray,
} from "../shared/ipc";
export type {
  CollectionEntry,
  GrowthStage,
  PlantId,
  PlantState,
} from "../shared/ipc";
export {
  PLANT_IDS,
  IPC_CHANNELS,
  GROWTH_BANDS,
  STAGE_BUD_BAND,
  STAGE_BLOOM_BAND,
} from "../shared/ipc";

const isDev = process.env.NODE_ENV === "development";
export const GROWTH_THRESHOLD = isDev ? 1_000 : 15_000;

type PickRandom = (ids: readonly PlantId[]) => PlantId;

function pickRandomDefault(ids: readonly PlantId[]): PlantId {
  if (ids.length === 0) throw new Error("pickRandom: empty ids array");
  return ids[Math.floor(Math.random() * ids.length)];
}

export function checkGrowth(): void {
  const bandIndex = calcBandIndex(_state.totalPoints, GROWTH_THRESHOLD);
  const newStage: GrowthStage =
    bandIndex < STAGE_BUD_BAND
      ? "seedling"
      : bandIndex < STAGE_BLOOM_BAND
        ? "bud"
        : "bloom";
  _state.growthStage = newStage;
  if (bandIndex === GROWTH_BANDS - 1 && !_state.bloomedPlantId) {
    _state.bloomedPlantId = _state.plantId;
  }
}

export function resetPlant(
  now = Date.now(),
  pickRandom: PickRandom = pickRandomDefault,
): void {
  _state = {
    ...PLANT_DEFAULTS,
    startedAt: now,
    plantId: pickRandom(PLANT_IDS),
  };
}

export function resetCollection(): void {
  _collection = [];
}

const PLANT_DEFAULTS: PlantState = {
  totalPoints: 0,
  growthStage: "seedling",
  plantId: "rose",
  bloomedPlantId: null,
  startedAt: null,
};

interface AppStore {
  plant: PlantState;
  collection: CollectionEntry[];
  privacyConsent: boolean;
}

const APP_DEFAULTS: AppStore = {
  plant: { ...PLANT_DEFAULTS },
  collection: [],
  privacyConsent: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _store: any = null;
let _state: PlantState = { ...PLANT_DEFAULTS };
let _collection: CollectionEntry[] = [];

let _privacyConsent: boolean = false;

export async function initStore(): Promise<void> {
  const { default: Store } = await import("electron-store");
  _store = new Store<AppStore>({ defaults: APP_DEFAULTS });
  const rawPlant = _store.get("plant");
  if (isPlantState(rawPlant)) {
    _state = rawPlant;
  } else {
    console.warn("[store] invalid plant state in store, resetting:", rawPlant);
    _state = { ...PLANT_DEFAULTS };
    _store.set("plant", _state);
  }

  const rawCollection = _store.get("collection");
  if (isCollectionEntryArray(rawCollection)) {
    _collection = rawCollection;
  } else {
    console.warn(
      "[store] invalid collection in store, resetting:",
      rawCollection,
    );
    _collection = [];
    _store.set("collection", _collection);
  }

  const rawConsent = _store.get("privacyConsent");
  if (typeof rawConsent === "boolean") {
    _privacyConsent = rawConsent;
  } else {
    _privacyConsent = false;
    _store.set("privacyConsent", false);
  }
  if (_state.startedAt === null && _state.totalPoints === 0) {
    resetPlant(Date.now());
    flushState();
  } else if (!_state.plantId) {
    _state.plantId = pickRandomDefault(PLANT_IDS);
    flushState();
  }
  const stageBefore = _state.growthStage;
  _state.bloomedPlantId = null;
  checkGrowth();
  if (_state.growthStage !== stageBefore) {
    if (_state.bloomedPlantId !== null) {
      recordBloom(_state.bloomedPlantId);
    }
    flushState();
  }
}

export function getState(): PlantState {
  return { ..._state };
}

export function getCollection(): CollectionEntry[] {
  return _collection.map((e) => ({ ...e }));
}

export function recordBloom(plantId: PlantId): void {
  const existing = _collection.find((e) => e.plantId === plantId);
  if (existing) {
    existing.totalBlooms++;
  } else {
    _collection.push({
      plantId,
      firstBloomed: new Date().toISOString(),
      totalBlooms: 1,
    });
  }
  flushCollection();
}

export function incrementPoints(delta: number): void {
  if (_state.bloomedPlantId !== null) return;
  _state.totalPoints += delta;
  checkGrowth();
  if (_state.bloomedPlantId !== null) {
    recordBloom(_state.bloomedPlantId);
    flushState();
  }
}

export function updateState(updates: Partial<PlantState>): void {
  _state = { ..._state, ...updates };
}

export function flushState(): void {
  if (!_store) return;
  _store.set("plant", _state);
}

export function flushCollection(): void {
  if (!_store) return;
  _store.set("collection", _collection);
}

export function getConsent(): boolean {
  return _privacyConsent;
}

export function setConsent(): void {
  _privacyConsent = true;
}

export function flushConsent(): void {
  if (!_store) return;
  _store.set("privacyConsent", _privacyConsent);
}

export function resetConsent(): void {
  _privacyConsent = false;
}
