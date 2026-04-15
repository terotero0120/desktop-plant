import { useState, useEffect } from 'react'
import type { GrowthStage, PlantId, PlantState } from '../../main/store'
import { IPC_CHANNELS } from '../../main/store'
import potSvg from './assets/plants/pot.svg'
import seedlingSvg from './assets/plants/seedling.svg'
import budSvg from './assets/plants/bud.svg'
import roseSvg from './assets/plants/rose.svg'
import sunflowerSvg from './assets/plants/sunflower.svg'
import tulipSvg from './assets/plants/tulip.svg'

const plantImages: Record<GrowthStage | PlantId, string> = {
  seedling: seedlingSvg,
  bud: budSvg,
  bloom: seedlingSvg, // unreachable: bloom always has a bloomedPlantId
  rose: roseSvg,
  sunflower: sunflowerSvg,
  tulip: tulipSvg
}

function getPlantImage(state: PlantState): string {
  if (state.growthStage === 'bloom' && state.bloomedPlantId) {
    return plantImages[state.bloomedPlantId]
  }
  return plantImages[state.growthStage]
}

function App(): React.JSX.Element {
  const [state, setState] = useState<PlantState>({
    totalPoints: 0,
    growthStage: 'seedling',
    bloomedPlantId: null
  })

  useEffect(() => {
    window.electron.ipcRenderer.invoke(IPC_CHANNELS.GET_STATE).then((s: PlantState) => {
      setState(s)
    })

    const removeStateListener = window.electron.ipcRenderer.on(
      IPC_CHANNELS.STATE_UPDATE,
      (_e, s: PlantState) => {
        setState(s)
      }
    )

    const onContextMenu = (e: MouseEvent): void => {
      e.preventDefault()
      window.electron.ipcRenderer.send(IPC_CHANNELS.SHOW_CONTEXT_MENU)
    }
    window.addEventListener('contextmenu', onContextMenu)

    return () => {
      removeStateListener()
      window.removeEventListener('contextmenu', onContextMenu)
    }
  }, [])

  const layerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '200px',
    height: '300px'
  }

  return (
    <div style={{ position: 'relative', width: '200px', height: '300px' }}>
      <img src={getPlantImage(state)} alt="plant" style={layerStyle} />
      <img src={potSvg} alt="pot" style={layerStyle} />
    </div>
  )
}

export default App
