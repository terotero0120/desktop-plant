import type { CollectionEntry, PlantState, StatusInfo } from "../../shared/ipc";
import { IPC_CHANNELS } from "../../shared/ipc";

export function ipcGetStatus(): Promise<StatusInfo> {
  return window.electron.ipcRenderer.invoke(IPC_CHANNELS.GET_STATUS);
}

export function ipcGetCollection(): Promise<CollectionEntry[]> {
  return window.electron.ipcRenderer.invoke(IPC_CHANNELS.GET_COLLECTION);
}

export function onStateUpdate(
  handler: (state: PlantState) => void,
): () => void {
  return window.electron.ipcRenderer.on(
    IPC_CHANNELS.STATE_UPDATE,
    (_e, s: PlantState) => handler(s),
  );
}

export function onCollectionUpdate(
  handler: (collection: CollectionEntry[]) => void,
): () => void {
  return window.electron.ipcRenderer.on(
    IPC_CHANNELS.COLLECTION_UPDATE,
    (_e, c: CollectionEntry[]) => handler(c),
  );
}

export function ipcSendShowContextMenu(): void {
  window.electron.ipcRenderer.send(IPC_CHANNELS.SHOW_CONTEXT_MENU);
}
