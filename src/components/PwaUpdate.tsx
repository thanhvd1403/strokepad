import { clsx } from 'clsx'
import { CheckCircle2, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button, IconButton } from './ui'

export function PwaUpdate() {
  const { t } = useTranslation()
  const location = useLocation()
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      registrationRef.current = registration ?? null
      if (registration && navigator.onLine) {
        void registration.update().catch(() => {})
      }
    },
    onOfflineReady() {
      setOfflineReady(true)
    },
  })

  useEffect(() => {
    if (!offlineReady) return
    const timer = window.setTimeout(() => setOfflineReady(false), 3500)
    return () => window.clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      void registrationRef.current?.update().catch(() => {})
    }

    document.addEventListener('visibilitychange', check)
    window.addEventListener('online', check)
    window.addEventListener('pageshow', check)

    return () => {
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('online', check)
      window.removeEventListener('pageshow', check)
    }
  }, [])

  if (!needRefresh && !offlineReady) return null

  const onPractice = location.pathname.startsWith('/practice')

  return (
    <div
      className={clsx(
        'fixed inset-x-0 z-40 px-4',
        onPractice ? 'bottom-4' : 'bottom-24',
      )}
    >
      <div className="mx-auto max-w-3xl" role="status" aria-live="polite">
        {needRefresh ? (
          <div className="animate-fade-up flex items-center gap-3 rounded-3xl border border-line bg-surface/95 p-3 shadow-xl backdrop-blur-xl">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {t('common.updateAvailable')}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                {t('common.updateHint')}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                void updateServiceWorker(true)
              }}
            >
              {t('common.reload')}
            </Button>
            <IconButton
              label={t('common.later')}
              onClick={() => setNeedRefresh(false)}
            >
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        ) : (
          <div className="animate-fade-up flex items-center gap-2 rounded-2xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-xs font-medium text-sage shadow-lg">
            <CheckCircle2 className="h-4 w-4" />
            {t('common.offlineReady')}
          </div>
        )}
      </div>
    </div>
  )
}
