import { useState, useEffect } from "react";
import type { PlantState, StatusInfo } from "../../shared/ipc";
import { calcBandIndex } from "../../shared/ipc";
import potSvg from "./assets/plants/pot.svg";
import { PLANT_REGISTRY, SHARED_PLANT_SVGS } from "./plantRegistry";
import {
  ipcGetStatus,
  onStateUpdate,
  ipcSendShowContextMenu,
} from "./ipcClient";

const initialState: PlantState = {
  totalPoints: 0,
  growthStage: "seedling",
  plantId: "rose",
  bloomedPlantId: null,
  startedAt: null,
};

function getPlantImage(state: PlantState, growthThreshold: number): string {
  const band = calcBandIndex(state.totalPoints, growthThreshold);
  if (band === 0) return SHARED_PLANT_SVGS.seedling;
  return PLANT_REGISTRY[state.plantId].svgs[band - 1];
}

function App(): React.JSX.Element {
  const [state, setState] = useState<PlantState>(initialState);
  const [growthThreshold, setGrowthThreshold] = useState(15_000);

  useEffect(() => {
    ipcGetStatus().then((info: StatusInfo) => {
      setState(info.state);
      setGrowthThreshold(info.growthThreshold);
    });

    const removeStateListener = onStateUpdate((s) => setState(s));

    const onContextMenu = (e: MouseEvent): void => {
      e.preventDefault();
      ipcSendShowContextMenu();
    };
    window.addEventListener("contextmenu", onContextMenu);

    return () => {
      removeStateListener();
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  const layerStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "200px",
    height: "300px",
  };

  return (
    <div style={{ position: "relative", width: "200px", height: "300px" }}>
      <img
        src={getPlantImage(state, growthThreshold)}
        alt="plant"
        style={layerStyle}
        draggable={false}
      />
      <img src={potSvg} alt="pot" style={layerStyle} draggable={false} />
      {import.meta.env.DEV && (
        <div
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            color: "white",
            fontSize: 10,
            pointerEvents: "none",
          }}
        >
          {state.totalPoints}pt / {state.growthStage} (band{" "}
          {calcBandIndex(state.totalPoints, growthThreshold)})
        </div>
      )}
    </div>
  );
}

export default App;
