import type { PlantId } from "../../shared/ipc";
import { PLANT_NAMES } from "../../shared/plantNames";
import sharedSeedlingSvg from "./assets/plants/shared/seedling.svg";
import rose1 from "./assets/plants/rose/1.svg";
import rose2 from "./assets/plants/rose/2.svg";
import rose3 from "./assets/plants/rose/3.svg";
import rose4 from "./assets/plants/rose/4.svg";
import rose5 from "./assets/plants/rose/5.svg";
import rose6 from "./assets/plants/rose/6.svg";
import rose7 from "./assets/plants/rose/7.svg";
import rose8 from "./assets/plants/rose/8.svg";
import sunflower1 from "./assets/plants/sunflower/1.svg";
import sunflower2 from "./assets/plants/sunflower/2.svg";
import sunflower3 from "./assets/plants/sunflower/3.svg";
import sunflower4 from "./assets/plants/sunflower/4.svg";
import sunflower5 from "./assets/plants/sunflower/5.svg";
import sunflower6 from "./assets/plants/sunflower/6.svg";
import sunflower7 from "./assets/plants/sunflower/7.svg";
import sunflower8 from "./assets/plants/sunflower/8.svg";
import tulip1 from "./assets/plants/tulip/1.svg";
import tulip2 from "./assets/plants/tulip/2.svg";
import tulip3 from "./assets/plants/tulip/3.svg";
import tulip4 from "./assets/plants/tulip/4.svg";
import tulip5 from "./assets/plants/tulip/5.svg";
import tulip6 from "./assets/plants/tulip/6.svg";
import tulip7 from "./assets/plants/tulip/7.svg";
import tulip8 from "./assets/plants/tulip/8.svg";

export interface PlantMeta {
  name: string;
  svg: string;
  svgs: readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ];
}

export const SHARED_PLANT_SVGS = { seedling: sharedSeedlingSvg };

const plantSvgs: Record<
  PlantId,
  readonly [string, string, string, string, string, string, string, string]
> = {
  rose: [rose1, rose2, rose3, rose4, rose5, rose6, rose7, rose8],
  sunflower: [
    sunflower1,
    sunflower2,
    sunflower3,
    sunflower4,
    sunflower5,
    sunflower6,
    sunflower7,
    sunflower8,
  ],
  tulip: [tulip1, tulip2, tulip3, tulip4, tulip5, tulip6, tulip7, tulip8],
};

export const PLANT_REGISTRY: Record<PlantId, PlantMeta> = Object.fromEntries(
  Object.entries(PLANT_NAMES).map(([id, name]) => [
    id,
    {
      name,
      svg: plantSvgs[id as PlantId][7],
      svgs: plantSvgs[id as PlantId],
    },
  ]),
) as Record<PlantId, PlantMeta>;
