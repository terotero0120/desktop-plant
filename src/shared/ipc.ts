export type GrowthStage = "seedling" | "bud" | "bloom";

export const PLANT_IDS = ["rose", "sunflower", "tulip"] as const;
export type PlantId = (typeof PLANT_IDS)[number];
export const GROWTH_BANDS = 9;
export const STAGE_BUD_BAND = 3;
export const STAGE_BLOOM_BAND = 6;

export function calcBandIndex(
  totalPoints: number,
  growthThreshold: number,
): number {
  if (totalPoints >= growthThreshold) return GROWTH_BANDS - 1;
  return Math.min(
    Math.floor((totalPoints * (GROWTH_BANDS - 1)) / growthThreshold),
    GROWTH_BANDS - 2,
  );
}

export interface PlantState {
  totalPoints: number;
  growthStage: GrowthStage;
  plantId: PlantId;
  bloomedPlantId: PlantId | null;
  startedAt: number | null;
}

export interface CollectionEntry {
  plantId: PlantId;
  firstBloomed: string; // ISO 8601
  totalBlooms: number;
}

export interface StatusInfo {
  state: PlantState;
  growthThreshold: number;
}

export const IPC_CHANNELS = {
  GET_STATE: "plant:get-state",
  STATE_UPDATE: "plant:state-update",
  PLANT_NEXT_SEED: "plant:next-seed",
  SHOW_CONTEXT_MENU: "plant:show-context-menu",
  GET_COLLECTION: "plant:get-collection",
  GET_STATUS: "plant:get-status",
  COLLECTION_UPDATE: "plant:collection-update",
} as const;
