// electron-store v8 は ESM-only のため dynamic import を使用する

export type GrowthStage = 'seedling' | 'bud' | 'bloom'

export interface PlantState {
  totalPoints: number
  growthStage: GrowthStage
  bloomedPlantId: string | null
}

const DEFAULTS: PlantState = {
  totalPoints: 0,
  growthStage: 'seedling',
  bloomedPlantId: null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _store: any = null
let _state: PlantState = { ...DEFAULTS }

export async function initStore(): Promise<void> {
  const { default: Store } = await import('electron-store')
  _store = new Store<PlantState>({ defaults: DEFAULTS })
  _state = {
    totalPoints: _store.get('totalPoints'),
    growthStage: _store.get('growthStage'),
    bloomedPlantId: _store.get('bloomedPlantId')
  }
}

export function getState(): PlantState {
  return { ..._state }
}

export function updateState(updates: Partial<PlantState>): void {
  _state = { ..._state, ...updates }
}

export function flushState(): void {
  if (!_store) return
  _store.set('totalPoints', _state.totalPoints)
  _store.set('growthStage', _state.growthStage)
  _store.set('bloomedPlantId', _state.bloomedPlantId)
}
