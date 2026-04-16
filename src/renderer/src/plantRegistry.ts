import type { PlantId } from "../../shared/ipc";
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
// 3. 以下に import と PLANT_REGISTRY エントリを追加
export const PLANT_REGISTRY: Record<PlantId, PlantMeta> = {
  rose: { name: "バラ", svg: roseSvg },
  sunflower: { name: "ヒマワリ", svg: sunflowerSvg },
  tulip: { name: "チューリップ", svg: tulipSvg },
};
