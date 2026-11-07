import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n'
import './index.css'
import App from './App'
import { prefetchPinyinDictionaries } from './lib/pinyin-suggest'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Warm the pinyin DAG model in the background. It is about 2.5 MB Brotli, so
// wait until the app shell is idle and skip it on metered connections.
const warmPinyin = () => prefetchPinyinDictionaries()
if (typeof window.requestIdleCallback === 'function') {
  window.requestIdleCallback(warmPinyin, { timeout: 5000 })
} else {
  window.setTimeout(warmPinyin, 3000)
}
