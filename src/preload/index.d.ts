import { ElectronAPI } from "@electron-toolkit/preload";
import type { PlantState } from "../main/store";

declare global {
  interface Window {
    electron: ElectronAPI;
    api: unknown;
  }
}

export type { PlantState };
