import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import type { initInputEngine as InitInputEngine, stopInputEngine as StopInputEngine } from '../inputEngine'

// vi.resetModules() を使うため、モックは beforeEach で vi.doMock() を使って登録する

describe('inputEngine', () => {
  let handlers: Record<string, (e?: unknown) => void>
  let mockIncrementPoints: ReturnType<typeof vi.fn>
  let mockFlushState: ReturnType<typeof vi.fn>
  let initInputEngine: typeof InitInputEngine
  let stopInputEngine: typeof StopInputEngine

  beforeEach(async () => {
    vi.resetModules()
    handlers = {}
    mockIncrementPoints = vi.fn()
    mockFlushState = vi.fn()

    // uiohook-napi をモック — イベントハンドラをキャプチャして手動で呼べるようにする
    vi.doMock('uiohook-napi', () => ({
      uIOhook: {
        on: vi.fn((event: string, handler: (e?: unknown) => void) => {
          handlers[event] = handler
        }),
        start: vi.fn(),
        stop: vi.fn(),
      },
    }))

    vi.doMock('../store', () => ({
      getState: vi.fn(() => ({
        totalPoints: 0,
        growthStage: 'seedling',
        bloomedPlantId: null,
      })),
      incrementPoints: mockIncrementPoints,
      flushState: mockFlushState,
      IPC_CHANNELS: {
        GET_STATE: 'plant:get-state',
        STATE_UPDATE: 'plant:state-update',
      },
    }))

    vi.useFakeTimers()

    const module = await import('../inputEngine')
    initInputEngine = module.initInputEngine
    stopInputEngine = module.stopInputEngine

    initInputEngine(() => null)
  })

  afterEach(() => {
    stopInputEngine()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // --- ポイント計算 ---

  describe('keydown', () => {
    it('1回のキー入力で 1pt 加算される', () => {
      handlers['keydown']()
      expect(mockIncrementPoints).toHaveBeenCalledOnce()
      expect(mockIncrementPoints).toHaveBeenCalledWith(1)
    })

    it('複数のキー入力で累積加算される', () => {
      handlers['keydown']()
      vi.advanceTimersByTime(300) // アイドルリセットのスロットル(200ms)を超える
      handlers['keydown']()
      expect(mockIncrementPoints).toHaveBeenCalledTimes(2)
      expect(mockIncrementPoints).toHaveBeenCalledWith(1)
    })
  })

  describe('click', () => {
    it('1回のクリックで 2pt 加算される', () => {
      handlers['click']()
      expect(mockIncrementPoints).toHaveBeenCalledOnce()
      expect(mockIncrementPoints).toHaveBeenCalledWith(2)
    })
  })

  describe('mousemove', () => {
    it('初回 mousemove はポイントを加算しない（座標初期化のみ）', () => {
      handlers['mousemove']({ x: 0, y: 0 })
      expect(mockIncrementPoints).not.toHaveBeenCalled()
    })

    it('1000px 移動で 10pt 加算される', () => {
      // 初期化
      handlers['mousemove']({ x: 0, y: 0 })
      // 600px + 800px = 1000px（3-4-5 の倍数）
      handlers['mousemove']({ x: 600, y: 800 })
      expect(mockIncrementPoints).toHaveBeenCalledOnce()
      expect(mockIncrementPoints).toHaveBeenCalledWith(10)
    })

    it('1000px 未満の移動ではポイントが加算されない', () => {
      handlers['mousemove']({ x: 0, y: 0 })
      handlers['mousemove']({ x: 500, y: 0 }) // 500px
      expect(mockIncrementPoints).not.toHaveBeenCalled()
    })

    it('累積移動が閾値を超えた時点でポイントが加算される', () => {
      handlers['mousemove']({ x: 0, y: 0 })
      handlers['mousemove']({ x: 600, y: 0 }) // 600px 累積
      expect(mockIncrementPoints).not.toHaveBeenCalled()
      handlers['mousemove']({ x: 1000, y: 0 }) // +400px = 1000px 累積
      expect(mockIncrementPoints).toHaveBeenCalledOnce()
      expect(mockIncrementPoints).toHaveBeenCalledWith(10)
    })

    it('2000px 移動で 20pt 加算される', () => {
      handlers['mousemove']({ x: 0, y: 0 })
      // 2000px 直線移動
      handlers['mousemove']({ x: 2000, y: 0 })
      expect(mockIncrementPoints).toHaveBeenCalledOnce()
      expect(mockIncrementPoints).toHaveBeenCalledWith(20)
    })

    it('1500px 移動後の余り 500px は次回のカウントに持ち越される', () => {
      handlers['mousemove']({ x: 0, y: 0 })
      handlers['mousemove']({ x: 1500, y: 0 }) // 10pt 加算、余り 500px
      expect(mockIncrementPoints).toHaveBeenCalledWith(10)
      mockIncrementPoints.mockClear()

      handlers['mousemove']({ x: 2000, y: 0 }) // +500px = 累積 1000px → 10pt
      expect(mockIncrementPoints).toHaveBeenCalledWith(10)
    })
  })

  // --- タイマー ---

  describe('saveTimer', () => {
    it('10秒ごとに flushState が呼ばれる', () => {
      vi.advanceTimersByTime(10_000)
      expect(mockFlushState).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(10_000)
      expect(mockFlushState).toHaveBeenCalledTimes(2)
    })
  })

  describe('アイドル検出', () => {
    it('60秒のアイドル後もキー入力でポイントが加算される（アイドルは入力時に即座にリセット）', () => {
      vi.advanceTimersByTime(60_000)
      handlers['keydown']()
      expect(mockIncrementPoints).toHaveBeenCalledWith(1)
    })
  })

  // --- stopInputEngine ---

  describe('stopInputEngine', () => {
    it('stopInputEngine 呼び出し時に flushState が呼ばれる', () => {
      mockFlushState.mockClear()
      stopInputEngine()
      expect(mockFlushState).toHaveBeenCalledTimes(1)
    })
  })
})
