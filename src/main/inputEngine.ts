import { uIOhook } from "uiohook-napi";
import { getState, incrementPoints, flushState } from "./store";

// spec section 1: 換算レート（暫定）
const KEYSTROKE_PTS = 1; // 1打鍵 = 1pt
const CLICK_PTS = 2; // クリック（実装後に調整）
const MOVE_PTS_PER_1000PX = 10; // 1000px = 10pt（実装後に調整）

const SAVE_INTERVAL_MS = 10_000; // 10秒ごとにディスクへ書き込み
const STATE_PUSH_MS = 1_000; // renderer へのプッシュを最大1秒に1回

let accumulatedMovePx = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseInitialized = false;

let saveTimer: ReturnType<typeof setInterval> | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

type StateBroadcaster = () => void;
type CollectionBroadcaster = () => void;
let _broadcastState: StateBroadcaster = () => {};
let _broadcastCollection: CollectionBroadcaster = () => {};
let _initialized = false;

function addPoints(pts: number): void {
  const prevBloomed = getState().bloomedPlantId !== null;
  incrementPoints(pts);
  if (!prevBloomed && getState().bloomedPlantId !== null) {
    _broadcastCollection();
  }
  schedulePush();
}

function schedulePush(): void {
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    _broadcastState();
  }, STATE_PUSH_MS);
}

export function initInputEngine(
  broadcastState: StateBroadcaster,
  broadcastCollection: CollectionBroadcaster,
): void {
  if (_initialized) return;
  _initialized = true;

  _broadcastState = broadcastState;
  _broadcastCollection = broadcastCollection;

  uIOhook.on("keydown", () => {
    addPoints(KEYSTROKE_PTS);
  });

  uIOhook.on("click", () => {
    addPoints(CLICK_PTS);
  });

  uIOhook.on("mousemove", (e: { x: number; y: number }) => {
    if (!mouseInitialized) {
      mouseInitialized = true;
      lastMouseX = e.x;
      lastMouseY = e.y;
      return;
    }

    const dx = e.x - lastMouseX;
    const dy = e.y - lastMouseY;
    accumulatedMovePx += Math.sqrt(dx * dx + dy * dy);
    lastMouseX = e.x;
    lastMouseY = e.y;

    if (accumulatedMovePx >= 1000) {
      const pts = Math.floor(accumulatedMovePx / 1000) * MOVE_PTS_PER_1000PX;
      accumulatedMovePx = accumulatedMovePx % 1000;
      addPoints(pts);
    }
  });

  uIOhook.start();

  saveTimer = setInterval(flushState, SAVE_INTERVAL_MS);
}

export function stopInputEngine(): void {
  if (!_initialized) return;
  uIOhook.stop();
  uIOhook.removeAllListeners();

  if (saveTimer) {
    clearInterval(saveTimer);
    saveTimer = null;
  }
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }

  _initialized = false;
  accumulatedMovePx = 0;
  mouseInitialized = false;
  lastMouseX = 0;
  lastMouseY = 0;
  flushState();
}
