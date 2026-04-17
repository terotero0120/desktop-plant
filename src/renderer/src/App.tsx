import { useState, useEffect } from "react";
import type { GrowthStage, PlantState } from "../../shared/ipc";
import { IPC_CHANNELS } from "../../shared/ipc";
import potSvg from "./assets/plants/pot.svg";
import seedlingSvg from "./assets/plants/seedling.svg";
import budSvg from "./assets/plants/bud.svg";
import { PLANT_REGISTRY } from "./plantRegistry";

const stageImages: Record<GrowthStage, string> = {
  seedling: seedlingSvg,
  bud: budSvg,
  bloom: seedlingSvg, // unreachable: bloom always has a bloomedPlantId
};

function getPlantImage(state: PlantState): string {
  if (state.growthStage === "bloom" && state.bloomedPlantId) {
    return PLANT_REGISTRY[state.bloomedPlantId].svg;
  }
  return stageImages[state.growthStage];
}

function App(): React.JSX.Element {
  const [state, setState] = useState<PlantState>({
    totalPoints: 0,
    growthStage: "seedling",
    bloomedPlantId: null,
    startedAt: null,
  });

  useEffect(() => {
    window.electron.ipcRenderer
      .invoke(IPC_CHANNELS.GET_STATE)
      .then((s: PlantState) => {
        setState(s);
      });

    const removeStateListener = window.electron.ipcRenderer.on(
      IPC_CHANNELS.STATE_UPDATE,
      (_e, s: PlantState) => {
        setState(s);
      },
    );

    const onContextMenu = (e: MouseEvent): void => {
      e.preventDefault();
      window.electron.ipcRenderer.send(IPC_CHANNELS.SHOW_CONTEXT_MENU);
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
        src={getPlantImage(state)}
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
          {state.totalPoints}pt / {state.growthStage}
        </div>
      )}
    </div>
  );
}

export default App;
