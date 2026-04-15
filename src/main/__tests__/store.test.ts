import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getState, incrementPoints, updateState, flushState,
  checkGrowth, resetPlant,
  getCollection, recordBloom, flushCollection, resetCollection,
  PLANT_IDS, BUD_THRESHOLD, GROWTH_THRESHOLD
} from '../store'

beforeEach(() => {
  resetPlant()
  resetCollection()
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
    expect(getState().bloomedPlantId).toBe('sunflower')
  })

  it('bloomedPlantId は PLANT_IDS の中の値である', () => {
    updateState({ totalPoints: GROWTH_THRESHOLD, growthStage: 'bud' })
    checkGrowth()
    expect(PLANT_IDS).toContain(getState().bloomedPlantId)
  })
})

describe('resetPlant', () => {
  it('全フィールドをデフォルト値にリセットする', () => {
    updateState({ totalPoints: 10000, growthStage: 'bloom', bloomedPlantId: 'rose' })
    resetPlant()
    const state = getState()
    expect(state.totalPoints).toBe(0)
    expect(state.growthStage).toBe('seedling')
    expect(state.bloomedPlantId).toBeNull()
  })

  it('リセット後 incrementPoints が再び機能する', () => {
    updateState({ growthStage: 'bloom', totalPoints: GROWTH_THRESHOLD, bloomedPlantId: 'rose' })
    resetPlant()
    incrementPoints(10)
    expect(getState().totalPoints).toBe(10)
  })

  it('コレクションには影響しない（図鑑はリセットされない）', () => {
    recordBloom('rose')
    resetPlant()
    expect(getCollection()).toHaveLength(1)
    expect(getCollection()[0].plantId).toBe('rose')
  })
})

describe('getCollection', () => {
  it('初期状態では空配列を返す', () => {
    expect(getCollection()).toEqual([])
  })

  it('コピーを返す（外部変更がコレクションに影響しない）', () => {
    recordBloom('rose')
    const col = getCollection()
    col[0].totalBlooms = 999
    expect(getCollection()[0].totalBlooms).toBe(1)
  })
})

describe('recordBloom', () => {
  it('新種の開花でエントリが追加される', () => {
    recordBloom('rose')
    const col = getCollection()
    expect(col).toHaveLength(1)
    expect(col[0].plantId).toBe('rose')
    expect(col[0].totalBlooms).toBe(1)
    expect(col[0].firstBloomed).toBeTruthy()
  })

  it('同種の2回目の開花で totalBlooms がインクリメントされる', () => {
    recordBloom('rose')
    recordBloom('rose')
    const col = getCollection()
    expect(col).toHaveLength(1)
    expect(col[0].totalBlooms).toBe(2)
  })

  it('異種の開花で別エントリが追加される', () => {
    recordBloom('rose')
    recordBloom('sunflower')
    expect(getCollection()).toHaveLength(2)
  })

  it('firstBloomed は ISO 8601 形式の文字列である', () => {
    recordBloom('tulip')
    const { firstBloomed } = getCollection()[0]
    expect(() => new Date(firstBloomed)).not.toThrow()
    expect(new Date(firstBloomed).toISOString()).toBe(firstBloomed)
  })
})

describe('flushCollection', () => {
  it('_store が未初期化（initStore 未呼び出し）のとき何もしない', () => {
    expect(() => flushCollection()).not.toThrow()
  })
})

describe('incrementPoints + コレクション登録', () => {
  it('bloom 遷移時に getCollection にエントリが追加される', () => {
    updateState({ growthStage: 'bud', totalPoints: GROWTH_THRESHOLD - 1 })
    incrementPoints(1)
    expect(getState().growthStage).toBe('bloom')
    const col = getCollection()
    expect(col).toHaveLength(1)
    expect(PLANT_IDS).toContain(col[0].plantId)
    expect(col[0].totalBlooms).toBe(1)
  })

  it('bloom 中の incrementPoints ではコレクションが変化しない', () => {
    updateState({ growthStage: 'bloom', totalPoints: GROWTH_THRESHOLD, bloomedPlantId: 'rose' })
    incrementPoints(100)
    expect(getCollection()).toHaveLength(0)
  })
})
