import type { PlantId } from "../../shared/ipc";
import { PLANT_NAMES } from "../../shared/plantNames";
import roseSvg from "./assets/plants/rose.svg";
import sunflowerSvg from "./assets/plants/sunflower.svg";
import tulipSvg from "./assets/plants/tulip.svg";

export interface PlantMeta {
  name: string; // 表示名（日本語）
  svg: string; // Vite が解決した SVG URL
}

// 植物を追加する場合:
// 1. src/renderer/src/assets/plants/ に SVG を追加
// 2. src/shared/ipc.ts の PLANT_IDS に ID を追加
// 3. src/shared/plantNames.ts と以下にエントリを追加
const svgs: Record<PlantId, string> = {
  rose: roseSvg,
  sunflower: sunflowerSvg,
  tulip: tulipSvg,
};

export const PLANT_REGISTRY: Record<PlantId, PlantMeta> = Object.fromEntries(
  Object.entries(PLANT_NAMES).map(([id, name]) => [
    id,
    { name, svg: svgs[id as PlantId] },
  ]),
) as Record<PlantId, PlantMeta>;
