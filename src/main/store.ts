// electron-store v8 は ESM-only のため dynamic import を使用する

export type GrowthStage = 'seedling' | 'bud' | 'bloom'

export const GROWTH_THRESHOLD = 15_000
export const BUD_THRESHOLD = GROWTH_THRESHOLD * 0.5

export const PLANT_IDS = ['rose', 'sunflower', 'tulip'] as const
export type PlantId = (typeof PLANT_IDS)[number]

export interface PlantState {
  totalPoints: number
  growthStage: GrowthStage
  bloomedPlantId: PlantId | null
}

export const IPC_CHANNELS = {
  GET_STATE: 'plant:get-state',
  STATE_UPDATE: 'plant:state-update',
  PLANT_NEXT_SEED: 'plant:next-seed'
} as const

type PickRandom = (ids: readonly PlantId[]) => PlantId

function pickRandomDefault(ids: readonly PlantId[]): PlantId {
  if (ids.length === 0) throw new Error('pickRandom: empty ids array')
  return ids[Math.floor(Math.random() * ids.length)]
}

export function checkGrowth(pickRandom: PickRandom = pickRandomDefault): void {
  if (_state.growthStage === 'seedling' && _state.totalPoints >= BUD_THRESHOLD) {
    _state.growthStage = 'bud'
  }
  if (_state.growthStage === 'bud' && _state.totalPoints >= GROWTH_THRESHOLD) {
    _state.growthStage = 'bloom'
    _state.bloomedPlantId = pickRandom(PLANT_IDS)
  }
}

export function resetPlant(): void {
  _state = { ...DEFAULTS }
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
  _state = _store.store as PlantState
  const stageBefore = _state.growthStage
  checkGrowth()
  if (_state.growthStage !== stageBefore) {
    flushState()
  }
}

export function getState(): PlantState {
  return { ..._state }
}

export function incrementPoints(delta: number): void {
  if (_state.growthStage === 'bloom') return
  _state.totalPoints += delta
  checkGrowth()
}

export function updateState(updates: Partial<PlantState>): void {
  _state = { ..._state, ...updates }
}

export function flushState(): void {
  if (!_store) return
  _store.store = _state
}
