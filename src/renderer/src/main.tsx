import './assets/main.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import CollectionView from './CollectionView'

const view = new URLSearchParams(window.location.search).get('view')
if (view === 'collection') {
  document.documentElement.classList.add('collection-view')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {view === 'collection' ? <CollectionView /> : <App />}
  </StrictMode>
)
