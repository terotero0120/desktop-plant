import { useEffect, useState } from "react";
import type { CollectionEntry } from "../../shared/ipc";
import { IPC_CHANNELS, PLANT_IDS } from "../../shared/ipc";
import budSvg from "./assets/plants/bud.svg";
import { PLANT_REGISTRY } from "./plantRegistry";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function CollectionView(): React.JSX.Element {
  const [collection, setCollection] = useState<CollectionEntry[]>([]);

  useEffect(() => {
    window.electron.ipcRenderer
      .invoke(IPC_CHANNELS.GET_COLLECTION)
      .then((entries: CollectionEntry[]) => setCollection(entries))
      .catch((error) => {
        console.error("Failed to load collection:", error);
        setCollection([]);
      });
  }, []);

  const obtained = collection.length;
  const total = PLANT_IDS.length;
  const pct = Math.floor((obtained / total) * 100);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>図鑑</span>
        <span style={styles.rate}>
          {obtained} / {total}（{pct}%）
        </span>
      </div>
      <ul style={styles.list}>
        {PLANT_IDS.map((id) => {
          const entry = collection.find((e) => e.plantId === id);
          return (
            <li key={id} style={entry ? styles.item : lockedItemStyle}>
              <img
                src={entry ? PLANT_REGISTRY[id].svg : budSvg}
                alt={entry ? PLANT_REGISTRY[id].name : "？？？"}
                style={entry ? styles.plantImg : styles.plantImgLocked}
                draggable={false}
              />
              <div style={styles.info}>
                <span style={styles.name}>
                  {entry ? PLANT_REGISTRY[id].name : "？？？"}
                </span>
                {entry && (
                  <span style={styles.detail}>
                    初回: {formatDate(entry.firstBloomed)} / 開花:{" "}
                    {entry.totalBlooms}回
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px",
    fontFamily: "inherit",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "16px",
    borderBottom: "1px solid var(--ev-c-gray-3)",
    paddingBottom: "8px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "var(--color-text)",
  },
  rate: {
    fontSize: "14px",
    color: "var(--ev-c-text-2)",
  },
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    borderRadius: "8px",
    background: "var(--color-background-soft)",
  },
  itemLocked: {
    opacity: 0.5,
  },
  plantImg: {
    width: "44px",
    height: "44px",
    flexShrink: 0,
    objectFit: "contain",
  },
  plantImgLocked: {
    width: "44px",
    height: "44px",
    flexShrink: 0,
    objectFit: "contain",
    filter: "grayscale(1)",
  },
  info: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: "16px",
    color: "var(--color-text)",
  },
  detail: {
    fontSize: "12px",
    color: "var(--ev-c-text-2)",
  },
};

const lockedItemStyle: React.CSSProperties = {
  ...styles.item,
  ...styles.itemLocked,
};
