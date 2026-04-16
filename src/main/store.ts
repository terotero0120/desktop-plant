// electron-store v8 は ESM-only のため dynamic import を使用する

import type { CollectionEntry, PlantId, PlantState } from "../shared/ipc";
import { PLANT_IDS } from "../shared/ipc";
export type {
  CollectionEntry,
  GrowthStage,
  PlantId,
  PlantState,
} from "../shared/ipc";
export { PLANT_IDS, IPC_CHANNELS } from "../shared/ipc";

const isDev = process.env.NODE_ENV === "development";
export const GROWTH_THRESHOLD = isDev ? 1_000 : 15_000;
export const BUD_THRESHOLD = GROWTH_THRESHOLD * 0.5;

type PickRandom = (ids: readonly PlantId[]) => PlantId;

function pickRandomDefault(ids: readonly PlantId[]): PlantId {
  if (ids.length === 0) throw new Error("pickRandom: empty ids array");
  return ids[Math.floor(Math.random() * ids.length)];
}

export function checkGrowth(pickRandom: PickRandom = pickRandomDefault): void {
  if (
    _state.growthStage === "seedling" &&
    _state.totalPoints >= BUD_THRESHOLD
  ) {
    _state.growthStage = "bud";
  }
  if (_state.growthStage === "bud" && _state.totalPoints >= GROWTH_THRESHOLD) {
    _state.growthStage = "bloom";
    _state.bloomedPlantId = pickRandom(PLANT_IDS);
  }
}

export function resetPlant(): void {
  _state = { ...PLANT_DEFAULTS };
}

export function resetCollection(): void {
  _collection = [];
}

const PLANT_DEFAULTS: PlantState = {
  totalPoints: 0,
  growthStage: "seedling",
  bloomedPlantId: null,
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
  _state = _store.get("plant") as PlantState;
  _collection = _store.get("collection") as CollectionEntry[];
  _privacyConsent = _store.get("privacyConsent") as boolean;
  const stageBefore = _state.growthStage;
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
  if (_state.growthStage === "bloom") return;
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
