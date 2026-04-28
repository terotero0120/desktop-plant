import type { CollectionEntry, PlantState, StatusInfo } from "../../shared/ipc";

export function ipcGetStatus(): Promise<StatusInfo> {
  return window.plantApi.getStatus();
}

export function ipcGetCollection(): Promise<CollectionEntry[]> {
  return window.plantApi.getCollection();
}

export function onStateUpdate(
  handler: (state: PlantState) => void,
): () => void {
  return window.plantApi.onStateUpdate(handler);
}

export function onCollectionUpdate(
  handler: (collection: CollectionEntry[]) => void,
): () => void {
  return window.plantApi.onCollectionUpdate(handler);
}

export function ipcSendShowContextMenu(): void {
  window.plantApi.showContextMenu();
}
