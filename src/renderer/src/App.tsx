import { useState, useEffect } from "react";
import type { PlantState, StatusInfo } from "../../shared/ipc";
import { calcBandIndex } from "../../shared/ipc";
import { PLANT_REGISTRY } from "./plantRegistry";
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
  // band は 0〜8 の9値、pngs は 1.png〜8.png の8枚。
  // band 0 と band 1 はどちらも pngs[0]（1.png）にマップされる。
  return PLANT_REGISTRY[state.plantId].pngs[Math.max(0, band - 1)];
}

function App(): React.JSX.Element {
  const [state, setState] = useState<PlantState>(initialState);
  const [growthThreshold, setGrowthThreshold] = useState(30_000);

  useEffect(() => {
    ipcGetStatus()
      .then((info: StatusInfo) => {
        setState(info.state);
        setGrowthThreshold(info.growthThreshold);
      })
      .catch((error) => {
        console.error("Failed to load status:", error);
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

  return (
    <div style={{ position: "relative", width: "200px", height: "300px" }}>
      <img
        src={getPlantImage(state, growthThreshold)}
        alt="plant"
        style={{ display: "block", width: "200px", height: "300px" }}
        draggable={false}
      />
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
