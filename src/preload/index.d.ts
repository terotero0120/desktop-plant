import { ElectronAPI } from '@electron-toolkit/preload'
import type { PlantState } from '../main/store'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
  }
}

// IPC チャンネル定義（型参照用）
// renderer → main
//   ipcRenderer.invoke('plant:get-state') → Promise<PlantState>
// main → renderer
//   ipcRenderer.on('plant:state-update', (_, state: PlantState) => void)

export type { PlantState }

