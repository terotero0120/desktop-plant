export type GrowthStage = "seedling" | "bud" | "bloom";

export const PLANT_IDS = ["rose", "sunflower", "tulip"] as const;
export type PlantId = (typeof PLANT_IDS)[number];

export interface PlantState {
  totalPoints: number;
  growthStage: GrowthStage;
  bloomedPlantId: PlantId | null;
}

export interface CollectionEntry {
  plantId: PlantId;
  firstBloomed: string; // ISO 8601
  totalBlooms: number;
}

export const IPC_CHANNELS = {
  GET_STATE: "plant:get-state",
  STATE_UPDATE: "plant:state-update",
  PLANT_NEXT_SEED: "plant:next-seed",
  SHOW_CONTEXT_MENU: "plant:show-context-menu",
  GET_COLLECTION: "plant:get-collection",
} as const;
