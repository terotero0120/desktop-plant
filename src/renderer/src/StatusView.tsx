import { useEffect, useState } from "react";
import type { StatusInfo } from "../../shared/ipc";
import { IPC_CHANNELS, GROWTH_BANDS } from "../../shared/ipc";
import { PLANT_REGISTRY } from "./plantRegistry";

function calcDayNumber(startedAt: number): number {
  const s = new Date(startedAt);
  const n = new Date();
  const sMidnight = new Date(
    s.getFullYear(),
    s.getMonth(),
    s.getDate(),
  ).getTime();
  const nMidnight = new Date(
    n.getFullYear(),
    n.getMonth(),
    n.getDate(),
  ).getTime();
  return Math.max(1, Math.floor((nMidnight - sMidnight) / 86400000) + 1);
}

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function StatusView(): React.JSX.Element {
  const [info, setInfo] = useState<StatusInfo | null>(null);

  useEffect(() => {
    window.electron.ipcRenderer
      .invoke(IPC_CHANNELS.GET_STATUS)
      .then((data: StatusInfo) => setInfo(data))
      .catch((error) => {
        console.error("Failed to load status:", error);
      });
  }, []);

  if (!info) {
    return <div style={styles.container} />;
  }

  const { state, growthThreshold } = info;

  const stageLabel =
    state.growthStage === "seedling"
      ? "苗"
      : state.growthStage === "bud"
        ? "蕾"
        : state.bloomedPlantId
          ? `開花中（${PLANT_REGISTRY[state.bloomedPlantId].name}）`
          : "開花中";

  const remaining =
    state.growthStage === "seedling"
      ? Math.max(
          0,
          Math.ceil((growthThreshold * 3) / (GROWTH_BANDS - 1)) -
            state.totalPoints,
        )
      : state.growthStage === "bud"
        ? Math.max(
            0,
            Math.ceil((growthThreshold * 6) / (GROWTH_BANDS - 1)) -
              state.totalPoints,
          )
        : state.bloomedPlantId === null
          ? Math.max(0, growthThreshold - state.totalPoints)
          : null;

  const nextLabel =
    state.growthStage === "seedling"
      ? "蕾"
      : state.growthStage === "bud"
        ? "開花"
        : state.bloomedPlantId === null
          ? "満開"
          : null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>ステータス</span>
      </div>

      <ul style={styles.rows}>
        <li style={styles.row}>
          <span style={styles.rowLabel}>状態</span>
          <span style={styles.rowValue}>{stageLabel}</span>
        </li>
        {remaining !== null && nextLabel && (
          <li style={styles.row}>
            <span style={styles.rowLabel}>次の段階まで</span>
            <span style={styles.rowValue}>
              あと {remaining.toLocaleString()}pt で{nextLabel}
            </span>
          </li>
        )}
        <li style={styles.row}>
          <span style={styles.rowLabel}>育て始め</span>
          <span style={styles.rowValue}>
            {state.startedAt !== null
              ? formatDateTime(state.startedAt)
              : "不明"}
          </span>
        </li>
        {state.startedAt !== null && (
          <li style={styles.row}>
            <span style={styles.rowLabel}>経過</span>
            <span style={styles.rowValue}>
              {calcDayNumber(state.startedAt)}日目
            </span>
          </li>
        )}
        <li style={styles.row}>
          <span style={styles.rowLabel}>累計ポイント</span>
          <span style={styles.rowValue}>
            {state.totalPoints.toLocaleString()}pt
          </span>
        </li>
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
    marginBottom: "16px",
    borderBottom: "1px solid var(--ev-c-gray-3)",
    paddingBottom: "8px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "var(--color-text)",
  },
  rows: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "13px 12px",
    borderRadius: "6px",
    background: "var(--color-background-soft)",
  },
  rowLabel: {
    fontSize: "13px",
    color: "var(--ev-c-text-2)",
  },
  rowValue: {
    fontSize: "14px",
    color: "var(--color-text)",
    fontWeight: "500",
  },
};
