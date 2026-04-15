import { useEffect, useLayoutEffect, useState } from 'react'
import type { CollectionEntry, PlantId } from '../../shared/ipc'
import { IPC_CHANNELS, PLANT_IDS } from '../../shared/ipc'

const PLANT_NAMES: Record<PlantId, string> = {
  rose: 'バラ',
  sunflower: 'ヒマワリ',
  tulip: 'チューリップ'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function CollectionView(): React.JSX.Element {
  const [collection, setCollection] = useState<CollectionEntry[]>([])

  useLayoutEffect(() => {
    const html = document.documentElement
    const body = document.body
    html.style.width = '100%'
    html.style.height = '100%'
    body.style.width = '100%'
    body.style.height = '100%'
    body.style.minHeight = '100vh'
    body.style.overflowY = 'auto'
    body.style.userSelect = 'auto'
    body.style.background = 'var(--color-background)'
    const root = document.getElementById('root')
    if (root) {
      root.style.width = '100%'
      root.style.height = '100%'
    }
  }, [])

  useEffect(() => {
    window.electron.ipcRenderer
      .invoke(IPC_CHANNELS.GET_COLLECTION)
      .then((entries: CollectionEntry[]) => setCollection(entries))
  }, [])

  const obtained = collection.length
  const total = PLANT_IDS.length
  const pct = Math.floor((obtained / total) * 100)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>図鑑</span>
        <span style={styles.rate}>
          {obtained} / {total}（{pct}%）
        </span>
      </div>
      <ul style={styles.list}>
        {PLANT_IDS.map((id) => {
          const entry = collection.find((e) => e.plantId === id)
          return (
            <li key={id} style={entry ? styles.item : lockedItemStyle}>
              <span style={styles.icon}>{entry ? '🌸' : '🔒'}</span>
              <div style={styles.info}>
                <span style={styles.name}>{PLANT_NAMES[id]}</span>
                {entry ? (
                  <span style={styles.detail}>
                    初回: {formatDate(entry.firstBloomed)} / 開花: {entry.totalBlooms}回
                  </span>
                ) : (
                  <span style={{ ...styles.detail, ...styles.detailLocked }}>
                    まだ咲かせていない
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '20px',
    fontFamily: 'inherit'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '16px',
    borderBottom: '1px solid var(--ev-c-gray-3)',
    paddingBottom: '8px'
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'var(--color-text)'
  },
  rate: {
    fontSize: '14px',
    color: 'var(--ev-c-text-2)'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    background: 'var(--color-background-soft)'
  },
  itemLocked: {
    opacity: 0.5
  },
  icon: {
    fontSize: '28px',
    lineHeight: 1,
    flexShrink: 0
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0
  },
  name: {
    fontSize: '16px',
    color: 'var(--color-text)'
  },
  detail: {
    fontSize: '12px',
    color: 'var(--ev-c-text-2)'
  },
  detailLocked: {
    color: 'var(--ev-c-text-3)'
  }
}

const lockedItemStyle: React.CSSProperties = { ...styles.item, ...styles.itemLocked }
