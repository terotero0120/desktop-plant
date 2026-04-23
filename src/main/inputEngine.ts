import { uIOhook } from "uiohook-napi";
import { getState, incrementPoints, flushState } from "./store";

// spec section 1: 換算レート（暫定）
const KEYSTROKE_PTS = 1; // 1打鍵 = 1pt
const CLICK_PTS = 2; // クリック（実装後に調整）
const MOVE_PTS_PER_1000PX = 10; // 1000px = 10pt（実装後に調整）

const IDLE_TIMEOUT_MS = 60_000; // 60秒無入力でアイドル
const SAVE_INTERVAL_MS = 10_000; // 10秒ごとにディスクへ書き込み
const STATE_PUSH_MS = 1_000; // renderer へのプッシュを最大1秒に1回
const IDLE_RESET_THROTTLE_MS = 200; // アイドルタイマーリセットのスロットル

let isIdle = false;
let accumulatedMovePx = 0;
let lastMouseX = 0;
let lastMouseY = 0;
let mouseInitialized = false;
let lastIdleResetAt = 0;

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setInterval> | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

type StateBroadcaster = () => void;
type CollectionBroadcaster = () => void;
let _broadcastState: StateBroadcaster = () => {};
let _broadcastCollection: CollectionBroadcaster = () => {};
let _initialized = false;

function resetIdle(): void {
  const now = Date.now();
  if (now - lastIdleResetAt < IDLE_RESET_THROTTLE_MS) return;
  lastIdleResetAt = now;

  if (isIdle) isIdle = false;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    isIdle = true;
    idleTimer = null;
  }, IDLE_TIMEOUT_MS);
}

function addPoints(pts: number): void {
  // すべての呼び出し元（keydown/click/mousemove ハンドラ）は addPoints の前に resetIdle() を呼ぶため
  // isIdle=true がここに到達するのは将来の呼び出し元がその規約を破った場合のみ（安全網）
  if (isIdle) return;
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
    resetIdle();
    addPoints(KEYSTROKE_PTS);
  });

  uIOhook.on("click", () => {
    resetIdle();
    addPoints(CLICK_PTS);
  });

  uIOhook.on("mousemove", (e: { x: number; y: number }) => {
    if (!mouseInitialized) {
      mouseInitialized = true;
      lastMouseX = e.x;
      lastMouseY = e.y;
      resetIdle();
      return;
    }

    const dx = e.x - lastMouseX;
    const dy = e.y - lastMouseY;
    accumulatedMovePx += Math.sqrt(dx * dx + dy * dy);
    lastMouseX = e.x;
    lastMouseY = e.y;

    resetIdle();

    if (accumulatedMovePx >= 1000) {
      const pts = Math.floor(accumulatedMovePx / 1000) * MOVE_PTS_PER_1000PX;
      accumulatedMovePx = accumulatedMovePx % 1000;
      addPoints(pts);
    }
  });

  uIOhook.start();

  saveTimer = setInterval(flushState, SAVE_INTERVAL_MS);
  resetIdle();
}

export function stopInputEngine(): void {
  uIOhook.stop();
  uIOhook.removeAllListeners();

  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
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
  isIdle = false;
  lastIdleResetAt = 0;
  flushState();
}
