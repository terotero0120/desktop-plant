import { uIOhook } from 'uiohook-napi'
import type { BrowserWindow } from 'electron'
import { getState, incrementPoints, flushState, IPC_CHANNELS } from './store'

// spec section 1: 換算レート（暫定）
const KEYSTROKE_PTS = 1             // 1打鍵 = 1pt
const CLICK_PTS = 2                 // クリック（実装後に調整）
const MOVE_PTS_PER_1000PX = 10      // 1000px = 10pt（実装後に調整）

const IDLE_TIMEOUT_MS = 60_000      // 60秒無入力でアイドル
const SAVE_INTERVAL_MS = 10_000     // 10秒ごとにディスクへ書き込み
const STATE_PUSH_MS = 1_000         // renderer へのプッシュを最大1秒に1回
const IDLE_RESET_THROTTLE_MS = 200  // アイドルタイマーリセットのスロットル

let isIdle = false
let accumulatedMovePx = 0
let lastMouseX = 0
let lastMouseY = 0
let mouseInitialized = false
let lastIdleResetAt = 0

let idleTimer: ReturnType<typeof setTimeout> | null = null
let saveTimer: ReturnType<typeof setInterval> | null = null
let pushTimer: ReturnType<typeof setTimeout> | null = null

type WindowGetter = () => BrowserWindow | null
let _getWindow: WindowGetter = () => null

function resetIdle(): void {
  const now = Date.now()
  if (now - lastIdleResetAt < IDLE_RESET_THROTTLE_MS) return
  lastIdleResetAt = now

  if (isIdle) isIdle = false
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    isIdle = true
    idleTimer = null
  }, IDLE_TIMEOUT_MS)
}

function addPoints(pts: number): void {
  if (isIdle) return
  incrementPoints(pts)
  schedulePush()
}

function schedulePush(): void {
  if (pushTimer) return
  pushTimer = setTimeout(() => {
    pushTimer = null
    const win = _getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.STATE_UPDATE, getState())
    }
  }, STATE_PUSH_MS)
}

export function initInputEngine(getWindow: WindowGetter): void {
  _getWindow = getWindow

  uIOhook.on('keydown', () => {
    resetIdle()
    addPoints(KEYSTROKE_PTS)
  })

  uIOhook.on('click', () => {
    resetIdle()
    addPoints(CLICK_PTS)
  })

  uIOhook.on('mousemove', (e: { x: number; y: number }) => {
    if (!mouseInitialized) {
      mouseInitialized = true
      lastMouseX = e.x
      lastMouseY = e.y
      resetIdle()
      return
    }

    const dx = e.x - lastMouseX
    const dy = e.y - lastMouseY
    accumulatedMovePx += Math.sqrt(dx * dx + dy * dy)
    lastMouseX = e.x
    lastMouseY = e.y

    resetIdle()

    if (accumulatedMovePx >= 1000) {
      const pts = Math.floor(accumulatedMovePx / 1000) * MOVE_PTS_PER_1000PX
      accumulatedMovePx = accumulatedMovePx % 1000
      addPoints(pts)
    }
  })

  uIOhook.start()

  saveTimer = setInterval(flushState, SAVE_INTERVAL_MS)
  resetIdle()
}

export function stopInputEngine(): void {
  uIOhook.stop()

  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
  if (saveTimer) { clearInterval(saveTimer); saveTimer = null }
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null }

  flushState()
}
