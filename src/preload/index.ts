import { contextBridge, ipcRenderer } from "electron";
import { IPC_CHANNELS } from "../shared/ipc";
import type { PlantState, CollectionEntry, StatusInfo } from "../shared/ipc";

function makeSubscription<T>(
  channel: string,
  handler: (v: T) => void,
): () => void {
  const listener = (_e: Electron.IpcRendererEvent, v: T): void => handler(v);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

const plantApi = {
  getStatus: (): Promise<StatusInfo> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_STATUS),
  getCollection: (): Promise<CollectionEntry[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_COLLECTION),
  onStateUpdate: (handler: (state: PlantState) => void): () => void =>
    makeSubscription(IPC_CHANNELS.STATE_UPDATE, handler),
  onCollectionUpdate: (
    handler: (collection: CollectionEntry[]) => void,
  ): () => void => makeSubscription(IPC_CHANNELS.COLLECTION_UPDATE, handler),
  showContextMenu: (): void =>
    ipcRenderer.send(IPC_CHANNELS.SHOW_CONTEXT_MENU),
};

contextBridge.exposeInMainWorld("plantApi", plantApi);
