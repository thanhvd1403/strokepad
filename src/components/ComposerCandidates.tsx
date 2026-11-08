import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { clsx } from 'clsx'
import { pinyin } from 'pinyin-pro'
import { useTranslation } from 'react-i18next'
import type { PinyinSuggestionStatus } from '../lib/use-pinyin-suggestions'
import type { Entry } from '../types'
import { EntryRow } from './EntryRow'
import { Button, Card } from './ui'

export interface ComposerCandidate {
  text: string
  entry?: Entry
}

export function ComposerCandidates({
  candidates,
  status,
  selectedIndex,
  onSelect,
  onRetry,
}: {
  candidates: ComposerCandidate[]
  status: PinyinSuggestionStatus
  selectedIndex: number
  onSelect: (text: string) => void
  onRetry: () => void
}) {
  const { t } = useTranslation()

  if (!candidates.length) {
    if (status === 'loading') {
      return (
        <Card className="flex items-center gap-2 p-4 text-xs text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('search.pinyinLoading')}
        </Card>
      )
    }
    if (status === 'error') {
      return (
        <Card className="space-y-2 p-4">
          <p className="text-xs leading-relaxed text-danger">{t('search.pinyinError')}</p>
          <Button size="sm" variant="ghost" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            {t('common.tryAgain')}
          </Button>
        </Card>
      )
    }
    return (
      <Card className="p-4">
        <p className="text-xs leading-relaxed text-muted">{t('search.noCandidates')}</p>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-ink">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          {t('search.candidates')}
        </h2>
        <span className="text-xs font-medium text-muted">
          {t('search.resultsCount', { count: candidates.length })}
        </span>
      </div>

      <Card className="divide-y divide-line/60 p-1.5">
        {candidates.map((candidate, index) =>
          candidate.entry ? (
            <EntryRow
              key={candidate.entry.id}
              entry={candidate.entry}
              highlighted={index === selectedIndex}
              onPractice={() => onSelect(candidate.text)}
            />
          ) : (
            <button
              key={candidate.text}
              type="button"
              onClick={() => onSelect(candidate.text)}
              aria-current={index === selectedIndex ? 'true' : undefined}
              className={clsx(
                'flex w-full items-center gap-3 rounded-2xl border px-2 py-2.5 text-left transition active:scale-[0.995]',
                index === selectedIndex
                  ? 'border-accent/40 bg-accent-soft/40'
                  : 'border-transparent hover:border-line hover:bg-surface-2/60',
              )}
            >
              <span className="hanzi grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-accent-soft/70 text-2xl font-medium text-ink">
                {candidate.text}
              </span>
              <span className="min-w-0 flex-1">
                <span className="hanzi block truncate text-base font-semibold text-ink">
                  {candidate.text}
                </span>
                <span className="mt-0.5 block truncate text-[13px] font-medium text-accent">
                  {pinyin(candidate.text, { toneType: 'symbol' })}
                </span>
              </span>
            </button>
          ),
        )}
      </Card>
    </div>
  )
}
