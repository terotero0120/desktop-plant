import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getState, incrementPoints, updateState, flushState,
  checkGrowth, resetPlant,
  PLANT_IDS, BUD_THRESHOLD, GROWTH_THRESHOLD
} from '../store'

beforeEach(() => {
  resetPlant()
})

describe('getState', () => {
  it('beforeEach でリセット後に全フィールドが期待値を返す', () => {
    const state = getState()
    expect(state.totalPoints).toBe(0)
    expect(state.growthStage).toBe('seedling')
    expect(state.bloomedPlantId).toBeNull()
  })

  it('コピーを返す（参照渡しでない）', () => {
    const state1 = getState()
    const state2 = getState()
    expect(state1).not.toBe(state2)
    state1.totalPoints = 999
    expect(getState().totalPoints).toBe(0)
  })
})

describe('incrementPoints', () => {
  it('指定した delta を totalPoints に加算する', () => {
    incrementPoints(5)
    expect(getState().totalPoints).toBe(5)
  })

  it('複数回の加算が累積される', () => {
    incrementPoints(1)
    incrementPoints(2)
    incrementPoints(10)
    expect(getState().totalPoints).toBe(13)
  })

  it('0 を加算しても変わらない', () => {
    incrementPoints(0)
    expect(getState().totalPoints).toBe(0)
  })
})

describe('incrementPoints + 成長遷移', () => {
  it('BUD_THRESHOLD に達したとき bud に自動遷移する', () => {
    incrementPoints(BUD_THRESHOLD)
    expect(getState().growthStage).toBe('bud')
  })

  it('GROWTH_THRESHOLD に達したとき bloom に自動遷移する', () => {
    updateState({ growthStage: 'bud', totalPoints: GROWTH_THRESHOLD - 1 })
    incrementPoints(1)
    expect(getState().growthStage).toBe('bloom')
    expect(getState().bloomedPlantId).not.toBeNull()
  })

  it('bloom 中は totalPoints が加算されない', () => {
    updateState({ growthStage: 'bloom', totalPoints: GROWTH_THRESHOLD, bloomedPlantId: 'rose' })
    incrementPoints(100)
    expect(getState().totalPoints).toBe(GROWTH_THRESHOLD)
  })

  it('bloom 中の加算は bloomedPlantId を変えない', () => {
    updateState({ growthStage: 'bloom', totalPoints: GROWTH_THRESHOLD, bloomedPlantId: 'rose' })
    incrementPoints(1)
    expect(getState().bloomedPlantId).toBe('rose')
  })
})

describe('updateState', () => {
  it('部分更新をマージする', () => {
    updateState({ totalPoints: 42 })
    const state = getState()
    expect(state.totalPoints).toBe(42)
    expect(state.growthStage).toBe('seedling')
  })

  it('growthStage を更新できる', () => {
    updateState({ growthStage: 'bud' })
    expect(getState().growthStage).toBe('bud')
  })

  it('bloomedPlantId を設定できる', () => {
    updateState({ bloomedPlantId: 'rose' })
    expect(getState().bloomedPlantId).toBe('rose')
  })
})

describe('flushState', () => {
  it('_store が未初期化（initStore 未呼び出し）のとき何もしない', () => {
    expect(() => flushState()).not.toThrow()
  })
})

describe('checkGrowth', () => {
  it('seedling が BUD_THRESHOLD 未満のとき何もしない', () => {
    updateState({ totalPoints: BUD_THRESHOLD - 1 })
    checkGrowth()
    expect(getState().growthStage).toBe('seedling')
  })

  it('seedling が BUD_THRESHOLD に達したとき bud に遷移する', () => {
    updateState({ totalPoints: BUD_THRESHOLD })
    checkGrowth()
    expect(getState().growthStage).toBe('bud')
  })

  it('bud が GROWTH_THRESHOLD に達したとき bloom に遷移し bloomedPlantId が設定される', () => {
    updateState({ totalPoints: GROWTH_THRESHOLD, growthStage: 'bud' })
    checkGrowth(() => 'rose')
    const state = getState()
    expect(state.growthStage).toBe('bloom')
    expect(state.bloomedPlantId).toBe('rose')
  })

  it('bloom 中は checkGrowth を呼んでも bloomedPlantId が変わらない', () => {
    updateState({ totalPoints: GROWTH_THRESHOLD, growthStage: 'bloom', bloomedPlantId: 'tulip' })
    const pick = vi.fn(() => 'rose' as const)
    checkGrowth(pick)
    expect(pick).not.toHaveBeenCalled()
    expect(getState().bloomedPlantId).toBe('tulip')
  })

  it('seedling が GROWTH_THRESHOLD を超えたとき一発で bloom に遷移できる', () => {
    updateState({ totalPoints: GROWTH_THRESHOLD })
    checkGrowth(() => 'sunflower')
    expect(getState().growthStage).toBe('bloom')
    expect(getState().bloomedPlantId).toBe('sunflower')  // ← add this line
  })

  it('bloomedPlantId は PLANT_IDS の中の値である', () => {
    updateState({ totalPoints: GROWTH_THRESHOLD, growthStage: 'bud' })
    checkGrowth()
    expect(PLANT_IDS).toContain(getState().bloomedPlantId)
  })
})
