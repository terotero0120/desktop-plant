import type { PlantId } from "../../shared/ipc";
import { PLANT_NAMES } from "../../shared/plantNames";
import rose1 from "./assets/plants/rose/1.png";
import rose2 from "./assets/plants/rose/2.png";
import rose3 from "./assets/plants/rose/3.png";
import rose4 from "./assets/plants/rose/4.png";
import rose5 from "./assets/plants/rose/5.png";
import rose6 from "./assets/plants/rose/6.png";
import rose7 from "./assets/plants/rose/7.png";
import rose8 from "./assets/plants/rose/8.png";
import sunflower1 from "./assets/plants/sunflower/1.png";
import sunflower2 from "./assets/plants/sunflower/2.png";
import sunflower3 from "./assets/plants/sunflower/3.png";
import sunflower4 from "./assets/plants/sunflower/4.png";
import sunflower5 from "./assets/plants/sunflower/5.png";
import sunflower6 from "./assets/plants/sunflower/6.png";
import sunflower7 from "./assets/plants/sunflower/7.png";
import sunflower8 from "./assets/plants/sunflower/8.png";
import tulip1 from "./assets/plants/tulip/1.png";
import tulip2 from "./assets/plants/tulip/2.png";
import tulip3 from "./assets/plants/tulip/3.png";
import tulip4 from "./assets/plants/tulip/4.png";
import tulip5 from "./assets/plants/tulip/5.png";
import tulip6 from "./assets/plants/tulip/6.png";
import tulip7 from "./assets/plants/tulip/7.png";
import tulip8 from "./assets/plants/tulip/8.png";
import hydrangea1 from "./assets/plants/hydrangea/1.png";
import hydrangea2 from "./assets/plants/hydrangea/2.png";
import hydrangea3 from "./assets/plants/hydrangea/3.png";
import hydrangea4 from "./assets/plants/hydrangea/4.png";
import hydrangea5 from "./assets/plants/hydrangea/5.png";
import hydrangea6 from "./assets/plants/hydrangea/6.png";
import hydrangea7 from "./assets/plants/hydrangea/7.png";
import hydrangea8 from "./assets/plants/hydrangea/8.png";
import higanbana1 from "./assets/plants/higanbana/1.png";
import higanbana2 from "./assets/plants/higanbana/2.png";
import higanbana3 from "./assets/plants/higanbana/3.png";
import higanbana4 from "./assets/plants/higanbana/4.png";
import higanbana5 from "./assets/plants/higanbana/5.png";
import higanbana6 from "./assets/plants/higanbana/6.png";
import higanbana7 from "./assets/plants/higanbana/7.png";
import higanbana8 from "./assets/plants/higanbana/8.png";
import lavender1 from "./assets/plants/lavender/1.png";
import lavender2 from "./assets/plants/lavender/2.png";
import lavender3 from "./assets/plants/lavender/3.png";
import lavender4 from "./assets/plants/lavender/4.png";
import lavender5 from "./assets/plants/lavender/5.png";
import lavender6 from "./assets/plants/lavender/6.png";
import lavender7 from "./assets/plants/lavender/7.png";
import lavender8 from "./assets/plants/lavender/8.png";

export interface PlantMeta {
  name: string;
  png: string;
  pngs: readonly [
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

const plantPngs: Record<
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
  hydrangea: [
    hydrangea1,
    hydrangea2,
    hydrangea3,
    hydrangea4,
    hydrangea5,
    hydrangea6,
    hydrangea7,
    hydrangea8,
  ],
  higanbana: [
    higanbana1,
    higanbana2,
    higanbana3,
    higanbana4,
    higanbana5,
    higanbana6,
    higanbana7,
    higanbana8,
  ],
  lavender: [
    lavender1,
    lavender2,
    lavender3,
    lavender4,
    lavender5,
    lavender6,
    lavender7,
    lavender8,
  ],
};

export const PLANT_REGISTRY: Record<PlantId, PlantMeta> = Object.fromEntries(
  Object.entries(PLANT_NAMES).map(([id, name]) => [
    id,
    {
      name,
      png: plantPngs[id as PlantId][7],
      pngs: plantPngs[id as PlantId],
    },
  ]),
) as Record<PlantId, PlantMeta>;
