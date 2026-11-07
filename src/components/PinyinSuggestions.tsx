import { ChevronRight, Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { pinyin } from 'pinyin-pro'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isPinyinQuery, suggestPinyin } from '../lib/pinyin-suggest'
import { toScript } from '../lib/script'
import { useSettings } from '../store/settings'
import type { Entry } from '../types'
import { Badge, Button, Card } from './ui'

type Status = 'idle' | 'loading' | 'done' | 'error'

export function PinyinSuggestions({
  query,
  entries,
  enabled,
  onPractice,
}: {
  query: string
  entries: Entry[]
  enabled: boolean
  onPractice: (text: string) => void
}) {
  const { t } = useTranslation()
  const script = useSettings((state) => state.script)
  const active = enabled && isPinyinQuery(query)
  const [status, setStatus] = useState<Status>('idle')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!active) {
      // oxlint-disable-next-line react/set-state-in-effect -- resetting an async result
      setStatus('idle')
      setSuggestions([])
      return
    }

    let cancelled = false
    // oxlint-disable-next-line react/set-state-in-effect -- resetting an async result
    setStatus('loading')
    setSuggestions([])

    suggestPinyin(query, entries)
      .then((list) => {
        if (cancelled) return
        setSuggestions(list)
        setStatus('done')
      })
      .catch(() => {
        if (cancelled) return
        setSuggestions([])
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [active, entries, query, retry])

  if (!active) return null

  return (
    <Card className="overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Badge tone="lavender">
          <Sparkles className="h-3 w-3" />
          {t('search.sentenceSuggestions')}
        </Badge>
        <span className="text-[11px] font-medium text-muted">
          {t('search.pinyinTap')}
        </span>
      </div>

      {status === 'loading' ? (
        <div className="flex items-center gap-2 py-2 text-xs text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('search.pinyinLoading')}
        </div>
      ) : status === 'error' ? (
        <div className="space-y-2 py-1">
          <p className="text-xs leading-relaxed text-danger">
            {t('search.pinyinError')}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.tryAgain')}
          </Button>
        </div>
      ) : suggestions.length === 0 ? (
        <p className="py-1 text-xs leading-relaxed text-muted">
          {t('search.pinyinEmpty')}
        </p>
      ) : (
        <div className="space-y-1.5">
          {suggestions.map((text, index) => {
            const display = toScript(text, script, entries)
            return (
              <button
                key={text}
                type="button"
                onClick={() => onPractice(display)}
                className="flex w-full items-center gap-3 rounded-2xl border border-line/70 bg-surface px-3 py-2.5 text-left transition hover:border-accent/40 hover:bg-accent-soft/30 active:scale-[0.995]"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent-soft text-xs font-bold text-accent">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="hanzi line-clamp-2 block text-lg font-semibold leading-snug text-ink">
                    {display}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-accent">
                    {pinyin(display, { toneType: 'symbol' })}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted/60" />
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}
