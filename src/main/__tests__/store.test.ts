import { describe, it, expect, beforeEach } from 'vitest'
import { getState, incrementPoints, updateState, flushState } from '../store'

beforeEach(() => {
  updateState({ totalPoints: 0, growthStage: 'seedling', bloomedPlantId: null })
})

describe('getState', () => {
  it('デフォルト状態を返す', () => {
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
