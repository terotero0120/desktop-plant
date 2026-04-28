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

export function isGrowthStage(v: unknown): v is GrowthStage {
  return v === "seedling" || v === "bud" || v === "bloom";
}

export function isPlantId(v: unknown): v is PlantId {
  return (PLANT_IDS as readonly string[]).includes(v as string);
}

export function isPlantState(v: unknown): v is PlantState {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.totalPoints === "number" &&
    isFinite(o.totalPoints) &&
    o.totalPoints >= 0 &&
    isGrowthStage(o.growthStage) &&
    isPlantId(o.plantId) &&
    (o.bloomedPlantId === null || isPlantId(o.bloomedPlantId)) &&
    (o.startedAt === null || typeof o.startedAt === "number")
  );
}

export function isCollectionEntry(v: unknown): v is CollectionEntry {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    isPlantId(o.plantId) &&
    typeof o.firstBloomed === "string" &&
    o.firstBloomed.length > 0 &&
    typeof o.totalBlooms === "number" &&
    Number.isInteger(o.totalBlooms) &&
    o.totalBlooms >= 1
  );
}

export function isCollectionEntryArray(v: unknown): v is CollectionEntry[] {
  return Array.isArray(v) && v.every(isCollectionEntry);
}

export const IPC_CHANNELS = {
  GET_STATE: "plant:get-state",
  STATE_UPDATE: "plant:state-update",
  PLANT_NEXT_SEED: "plant:next-seed",
  SHOW_CONTEXT_MENU: "plant:show-context-menu",
  GET_COLLECTION: "plant:get-collection",
  GET_STATUS: "plant:get-status",
  COLLECTION_UPDATE: "plant:collection-update",
  SET_IGNORE_MOUSE_EVENTS: "plant:set-ignore-mouse-events",
} as const;
