// electron-store v8 は ESM-only のため dynamic import を使用する

export type GrowthStage = 'seedling' | 'bud' | 'bloom'

export interface PlantState {
  totalPoints: number
  growthStage: GrowthStage
  bloomedPlantId: string | null
}

export const IPC_CHANNELS = {
  GET_STATE: 'plant:get-state',
  STATE_UPDATE: 'plant:state-update'
} as const

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
  _state = _store.store as PlantState
}

export function getState(): PlantState {
  return { ..._state }
}

export function incrementPoints(delta: number): void {
  _state.totalPoints += delta
}

export function updateState(updates: Partial<PlantState>): void {
  _state = { ..._state, ...updates }
}

export function flushState(): void {
  if (!_store) return
  _store.store = _state
}
