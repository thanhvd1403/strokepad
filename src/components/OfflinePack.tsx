import { clsx } from 'clsx'
import {
  CheckCircle2,
  Download,
  HardDrive,
  Loader2,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ENTRIES_URL } from '../lib/data'
import {
  countCachedStrokes,
  DICTIONARY_CACHE,
  STROKE_CACHE,
  STROKE_INDEX_CACHE,
  STROKE_INDEX_URL,
  strokeDataUrl,
} from '../lib/offline'
import { Button } from './ui'

type Status = 'idle' | 'downloading' | 'error'

const CONCURRENCY = 6

export function OfflinePack() {
  const { t } = useTranslation()
  const supported = typeof caches !== 'undefined'
  const [status, setStatus] = useState<Status>('idle')
  const [total, setTotal] = useState(0)
  const [completed, setCompleted] = useState(0)
  const [cached, setCached] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const charsRef = useRef<string[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  const refreshCached = useCallback(async () => {
    try {
      const count = await countCachedStrokes()
      if (mountedRef.current) setCached(count)
    } catch {
      // Cache inspection can fail in private modes; keep the last value.
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!supported) return
    let cancelled = false

    const loadIndex = async () => {
      try {
        const response = await fetch(STROKE_INDEX_URL, { cache: 'no-cache' })
        if (!response.ok) return
        const list: unknown = await response.json()
        if (cancelled || !Array.isArray(list)) return
        charsRef.current = list.filter(
          (item): item is string => typeof item === 'string',
        )
        setTotal(charsRef.current.length)
      } catch {
        // Offline before the index is cached; the download button explains it.
      }
    }

    void loadIndex()
    // oxlint-disable-next-line react/set-state-in-effect -- reading CacheStorage is an external sync
    void refreshCached()

    return () => {
      cancelled = true
    }
  }, [refreshCached, supported])

  const start = async () => {
    if (!supported) return
    if (!navigator.onLine) {
      setStatus('error')
      setMessage(t('settings.offlineNeedsNetwork'))
      return
    }

    const controller = new AbortController()
    abortRef.current = controller
    setStatus('downloading')
    setCompleted(0)
    setMessage(null)

    try {
      // Ask the browser to keep this storage around when it can.
      void navigator.storage?.persist?.().catch(() => {})

      const indexResponse = await fetch(STROKE_INDEX_URL, {
        signal: controller.signal,
        cache: 'no-cache',
      })
      if (!indexResponse.ok) throw new Error('stroke index')
      const indexClone = indexResponse.clone()
      const list = (await indexResponse.json()) as unknown
      if (!Array.isArray(list)) throw new Error('stroke index')
      const chars = list.filter((item): item is string => typeof item === 'string')
      charsRef.current = chars
      if (mountedRef.current) setTotal(chars.length)

      const indexCache = await caches.open(STROKE_INDEX_CACHE)
      await indexCache.put(STROKE_INDEX_URL, indexClone)

      const dictionaryCache = await caches.open(DICTIONARY_CACHE)
      if (!(await dictionaryCache.match(ENTRIES_URL))) {
        const response = await fetch(ENTRIES_URL, {
          signal: controller.signal,
          cache: 'reload',
        })
        if (!response.ok) throw new Error('dictionary')
        await dictionaryCache.put(ENTRIES_URL, response.clone())
      }

      const strokeCache = await caches.open(STROKE_CACHE)
      let next = 0
      let done = 0

      const worker = async () => {
        while (true) {
          if (controller.signal.aborted) {
            throw new DOMException('Aborted', 'AbortError')
          }
          const index = next++
          if (index >= chars.length) return

          const url = strokeDataUrl(chars[index])
          if (!(await strokeCache.match(url))) {
            const response = await fetch(url, { signal: controller.signal })
            if (!response.ok) throw new Error(`stroke ${chars[index]}`)
            await strokeCache.put(url, response.clone())
          }

          done++
          if (mountedRef.current && (done % 8 === 0 || done === chars.length)) {
            setCompleted(done)
            setCached(done)
          }
        }
      }

      await Promise.all(Array.from({ length: CONCURRENCY }, worker))

      if (!mountedRef.current) return
      setCompleted(chars.length)
      setCached(chars.length)
      setStatus('idle')
    } catch (error) {
      if (!mountedRef.current) return
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStatus('idle')
        void refreshCached()
        return
      }
      setStatus('error')
      setMessage(t('settings.offlineFailed'))
      void refreshCached()
    } finally {
      abortRef.current = null
    }
  }

  const cancel = () => {
    abortRef.current?.abort()
  }

  const remove = async () => {
    if (!supported) return
    try {
      await caches.delete(STROKE_CACHE)
      if (!mountedRef.current) return
      setCached(0)
      setCompleted(0)
      setStatus('idle')
      setMessage(t('settings.offlineRemoved'))
    } catch {
      if (mountedRef.current) {
        setStatus('error')
        setMessage(t('settings.offlineFailed'))
      }
    }
  }

  if (!supported) {
    return (
      <p className="py-3 text-xs leading-relaxed text-muted">
        {t('settings.offlineUnsupported')}
      </p>
    )
  }

  const allCached = total > 0 && cached >= total
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="space-y-3 py-3">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
          <HardDrive className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {t('settings.offlineTitle')}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {t('settings.offlineHint')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-muted">
        <span className={allCached ? 'font-medium text-sage' : undefined}>
          {t('settings.offlineCached', { count: cached.toLocaleString() })}
        </span>
        <span>{t('settings.offlineSize')}</span>
      </div>

      {status === 'downloading' ? (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('settings.offlineProgress', {
                completed: completed.toLocaleString(),
                total: total.toLocaleString(),
              })}
            </span>
            <Button size="sm" variant="ghost" onClick={cancel}>
              {t('settings.offlineCancel')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {allCached ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage">
              <CheckCircle2 className="h-4 w-4" />
              {t('settings.offlineDone')}
            </span>
          ) : (
            <Button size="sm" variant="soft" onClick={() => void start()}>
              <Download className="h-4 w-4" />
              {t('settings.offlineDownload')}
            </Button>
          )}
          {cached > 0 ? (
            <Button size="sm" variant="ghost" onClick={() => void remove()}>
              <Trash2 className="h-4 w-4" />
              {t('settings.offlineRemove')}
            </Button>
          ) : null}
        </div>
      )}

      {message ? (
        <p
          className={clsx(
            'text-xs leading-relaxed',
            status === 'error' ? 'text-danger' : 'text-sage',
          )}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
