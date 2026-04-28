import type { PlantState, CollectionEntry, StatusInfo } from "../shared/ipc";

declare global {
  interface Window {
    plantApi: {
      getStatus: () => Promise<StatusInfo>;
      getCollection: () => Promise<CollectionEntry[]>;
      onStateUpdate: (handler: (state: PlantState) => void) => () => void;
      onCollectionUpdate: (
        handler: (collection: CollectionEntry[]) => void,
      ) => () => void;
      showContextMenu: () => void;
    };
  }
}
