import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PwaUpdate } from './components/PwaUpdate'
import { Button } from './components/ui'
import { useLanguageSync, useThemeSync } from './lib/hooks'
import { Favorites } from './routes/Favorites'
import { Home } from './routes/Home'
import { Licenses } from './routes/Licenses'
import { Practice } from './routes/Practice'
import { Settings } from './routes/Settings'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}

function NotFound() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="animate-fade-up flex min-h-[60dvh] flex-col items-center justify-center gap-3 text-center">
      <p className="hanzi text-4xl text-accent">迷</p>
      <h1 className="text-lg font-bold text-ink">{t('errors.notFound')}</h1>
      <Button variant="soft" onClick={() => navigate('/')}>
        {t('errors.goHome')}
      </Button>
    </div>
  )
}

export default function App() {
  useThemeSync()
  useLanguageSync()

  return (
    <>
      <ScrollToTop />
      <PwaUpdate />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="practice" element={<Practice />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="settings" element={<Settings />} />
          <Route path="licenses" element={<Licenses />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
