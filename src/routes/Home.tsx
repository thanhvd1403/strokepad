import {
  BookOpen,
  Dices,
  History,
  Library,
  Loader2,
  PenLine,
  Sparkles,
} from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ComposerCandidates,
  type ComposerCandidate,
} from '../components/ComposerCandidates'
import { CompositionPreview } from '../components/CompositionPreview'
import { HskFilter } from '../components/HskFilter'
import { SearchBar } from '../components/SearchBar'
import { SearchResults } from '../components/SearchResults'
import { Badge, Button, Card, EmptyState } from '../components/ui'
import {
  readCandidateMemory,
  rememberCandidate,
} from '../lib/candidate-memory'
import { loadEntries } from '../lib/data'
import { useRecentSearches } from '../lib/hooks'
import { isPinyinQuery, suggestPinyin } from '../lib/pinyin-suggest'
import {
  containsHan,
  normalizePinyinInput,
  randomStarter,
  searchEntries,
  starterEntries,
  type RankedEntry,
} from '../lib/search'
import { entryText, toScript } from '../lib/script'
import { usePinyinSuggestions } from '../lib/use-pinyin-suggestions'
import { useSettings } from '../store/settings'
import type { Entry, EntryData, Script } from '../types'

const ASCII_PUNCTUATION: Record<string, string> = {
  ',': '，',
  '.': '。',
  '?': '？',
  '!': '！',
  ';': '；',
}

function convertPunctuation(value: string) {
  return value.replace(/[,.?!;]/g, (char) => ASCII_PUNCTUATION[char] ?? char)
}

function StarterGrid({
  entries,
  script,
  onPick,
}: {
  entries: Entry[]
  script: Script
  onPick: (entry: Entry) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {entries.map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onPick(entry)}
          className="group flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface px-2 py-3 transition hover:border-accent/40 hover:bg-accent-soft/30 active:scale-95"
        >
          <span className="hanzi text-3xl font-medium text-ink">
            {entryText(entry, script)}
          </span>
          <span className="text-[13px] font-medium text-muted">{entry.pinyin}</span>
        </button>
      ))}
    </div>
  )
}

function RecentSearches({
  recent,
  onPick,
  onClear,
}: {
  recent: string[]
  onPick: (value: string) => void
  onClear: () => void
}) {
  const { t } = useTranslation()
  if (!recent.length) return null
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-muted">
          <History className="h-3.5 w-3.5" />
          {t('search.recent')}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-muted transition hover:text-ink"
        >
          {t('search.clearHistory')}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {recent.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPick(item)}
            className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent/40 hover:bg-accent-soft/40"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  )
}

function HowItWorks() {
  const { t } = useTranslation()
  const steps = [
    {
      icon: Sparkles,
      title: t('search.startTitle'),
      body: t('search.startHint'),
    },
    {
      icon: PenLine,
      title: t('practice.ghost'),
      body: t('practice.ghostHint'),
    },
    {
      icon: Library,
      title: t('collections.title'),
      body: t('collections.hint'),
    },
  ]
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {steps.map((step) => {
        const Icon = step.icon
        return (
          <Card key={step.title} className="p-3.5">
            <div className="mb-2 grid h-8 w-8 place-items-center rounded-xl bg-accent-soft text-accent">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-semibold text-ink">{step.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.body}</p>
          </Card>
        )
      })}
    </div>
  )
}

export function Home() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const script = useSettings((state) => state.script)
  const inputMode = useSettings((state) => state.inputMode)
  const setInputMode = useSettings((state) => state.setInputMode)
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '')
  const [composedText, setComposedText] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [memory, setMemory] = useState(readCandidateMemory)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const submitToken = useRef(0)
  const [hskLevels, setHskLevels] = useState<number[]>(() =>
    (searchParams.get('hsk') ?? '')
      .split(',')
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0),
  )
  const [data, setData] = useState<EntryData | null>(null)
  const [error, setError] = useState(false)
  const { recent, add, clear } = useRecentSearches()
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    let cancelled = false
    loadEntries()
      .then((loaded) => {
        if (!cancelled) setData(loaded)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (hskLevels.length) params.set('hsk', hskLevels.join(','))
    setSearchParams(params, { replace: true })
  }, [query, hskLevels, setSearchParams])

  const trimmedQuery = query.trim()

  const wordResults = useMemo(() => {
    if (inputMode !== 'word' || !data || !deferredQuery.trim()) return []
    return searchEntries(data.entries, deferredQuery, hskLevels)
  }, [inputMode, data, deferredQuery, hskLevels])

  const sentenceResults = useMemo(() => {
    if (inputMode !== 'sentence' || !data || !trimmedQuery) return []
    return searchEntries(data.entries, trimmedQuery, hskLevels)
  }, [inputMode, data, trimmedQuery, hskLevels])

  const { status, suggestions, retry } = usePinyinSuggestions(
    trimmedQuery,
    data?.entries ?? [],
    inputMode === 'sentence' &&
      Boolean(data) &&
      Boolean(trimmedQuery) &&
      sentenceResults.length < 9,
  )

  const starters = useMemo(
    () => (data ? starterEntries(data.entries, 12) : []),
    [data],
  )

  const candidates = useMemo<ComposerCandidate[]>(() => {
    if (!data || !trimmedQuery) return []

    const entryCandidates: ComposerCandidate[] = sentenceResults
      .slice(0, 9)
      .map((entry) => ({
        text: entryText(entry, script),
        entry,
      }))
    const seen = new Set(entryCandidates.map((candidate) => candidate.text))
    const extraCandidates: ComposerCandidate[] = suggestions
      .map((text) => toScript(text, script, data.entries))
      .filter((text) => !seen.has(text))
      .slice(0, 4)
      .map((text) => ({ text }))

    const list = [...entryCandidates, ...extraCandidates]
    const remembered = memory[normalizePinyinInput(trimmedQuery)]
    if (remembered) {
      const index = list.findIndex((candidate) => candidate.text === remembered)
      if (index > 0) {
        const [candidate] = list.splice(index, 1)
        list.unshift(candidate)
      }
    }
    return list
  }, [data, trimmedQuery, sentenceResults, script, suggestions, memory])

  const activeIndex = Math.min(selectedIndex, Math.max(candidates.length - 1, 0))

  const practiceText = (text: string) => {
    navigate(`/practice?text=${encodeURIComponent(text)}&i=0`)
  }

  const practiceEntry = (entry: Entry | RankedEntry) => {
    const display = entryText(entry, script)
    add(display)
    practiceText(display)
  }

  const practiceSentence = (text: string) => {
    add(text)
    practiceText(text)
  }

  const practiceComposed = () => {
    const text = composedText.trim()
    if (text) practiceSentence(text)
  }

  const focusInput = () => {
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const remember = (text: string) => {
    const key = normalizePinyinInput(query)
    if (!key || !text) return
    setMemory((current) => rememberCandidate(current, key, text))
  }

  const commit = (text: string, suffix = '') => {
    if (!text) return
    remember(text)
    setComposedText((current) => current + text + suffix)
    setQuery('')
    setSelectedIndex(0)
    focusInput()
  }

  const appendComposed = (text: string) => {
    if (!text) return
    setComposedText((current) => current + text)
    focusInput()
  }

  const handleSentenceChange = (next: string) => {
    if (containsHan(next)) {
      const cleaned = next.replace(/[a-zA-Z0-9\s]/g, '')
      if (cleaned) appendComposed(convertPunctuation(cleaned))
      setQuery('')
      setSelectedIndex(0)
      return
    }

    const punctuation = next.match(/^(.*?)([,.?!;，。！？；：、…]+)$/)
    if (punctuation) {
      const pinyinPart = punctuation[1]
      const suffix = convertPunctuation(punctuation[2])
      if (pinyinPart === query) {
        if (query.trim()) {
          const candidate = candidates[activeIndex]
          if (candidate) commit(candidate.text, suffix)
          return
        }
        appendComposed(suffix)
        setQuery('')
        setSelectedIndex(0)
        return
      }
      setQuery(pinyinPart)
      setSelectedIndex(0)
      return
    }

    setQuery(next)
    setSelectedIndex(0)
  }

  const handleQueryChange = (next: string) => {
    if (inputMode === 'word') {
      submitToken.current += 1
      setSubmitting(false)
      setQuery(next)
      return
    }
    handleSentenceChange(next)
  }

  const handleSpace = () => {
    if (inputMode !== 'sentence') return
    const candidate = candidates[activeIndex]
    if (candidate) commit(candidate.text)
  }

  const moveSelection = (delta: number) => {
    if (!candidates.length) return
    setSelectedIndex(
      Math.min(Math.max(activeIndex + delta, 0), candidates.length - 1),
    )
  }

  const handleEscape = () => {
    if (query) {
      setQuery('')
      setSelectedIndex(0)
      focusInput()
    }
  }

  const handleDeleteComposed = () => {
    if (query) return
    setComposedText((current) => Array.from(current).slice(0, -1).join(''))
    focusInput()
  }

  const handleClear = () => {
    if (inputMode === 'word') {
      submitToken.current += 1
      setSubmitting(false)
      setQuery('')
    } else if (query) {
      setQuery('')
      setSelectedIndex(0)
    } else {
      setComposedText('')
    }
    focusInput()
  }

  const resetInput = () => {
    submitToken.current += 1
    setQuery('')
    setComposedText('')
    setSelectedIndex(0)
    setSubmitting(false)
    focusInput()
  }

  const switchMode = () => {
    setInputMode(inputMode === 'word' ? 'sentence' : 'word')
    resetInput()
  }

  const finalizeSentence = () => {
    const candidate = trimmedQuery ? candidates[activeIndex] : undefined
    const text = (composedText + (candidate?.text ?? '')).trim()
    if (!text) return
    if (candidate) remember(candidate.text)
    practiceSentence(text)
  }

  const handleWordSubmit = () => {
    const trimmed = query.trim()
    if (!trimmed || submitting) return

    if (containsHan(trimmed)) {
      practiceSentence(toScript(trimmed, script, data?.entries ?? []))
      return
    }

    if (!isPinyinQuery(trimmed)) {
      add(trimmed)
      return
    }

    // Characters and words take priority. Only fall back to a generated
    // sentence when the dictionary has no match.
    const currentResults = data
      ? searchEntries(data.entries, trimmed, hskLevels)
      : []
    if (currentResults.length > 0) {
      practiceEntry(currentResults[0])
      return
    }

    add(trimmed)
    setSubmitting(true)
    const token = ++submitToken.current
    void suggestPinyin(trimmed, data?.entries)
      .then((list) => {
        if (token !== submitToken.current) return
        const best = list[0]
        if (best) {
          practiceText(toScript(best, script, data?.entries ?? []))
        }
      })
      .catch(() => {
        // Keep the dictionary results visible; the suggestion card shows the
        // error and a retry action.
      })
      .finally(() => {
        if (token === submitToken.current) setSubmitting(false)
      })
  }

  const handleSubmit = () => {
    if (inputMode === 'word') {
      handleWordSubmit()
      return
    }

    if (trimmedQuery) {
      const candidate = candidates[activeIndex]
      if (candidate) commit(candidate.text)
      return
    }

    if (composedText.trim()) practiceComposed()
  }

  return (
    <div className="animate-fade-up space-y-5">
      <section className="space-y-3">
        <div>
          <h1 className="text-[1.65rem] font-bold leading-tight tracking-tight text-ink">
            {t('search.startTitle')}
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            {t(
              inputMode === 'sentence'
                ? 'search.sentenceStartHint'
                : 'search.startHint',
            )}
          </p>
        </div>
        <SearchBar
          value={query}
          mode={inputMode}
          composed={inputMode === 'sentence' ? composedText : ''}
          onChange={handleQueryChange}
          onSubmit={handleSubmit}
          onSwitchMode={switchMode}
          onSpace={inputMode === 'sentence' ? handleSpace : undefined}
          onNavigate={inputMode === 'sentence' ? moveSelection : undefined}
          onEscape={inputMode === 'sentence' ? handleEscape : undefined}
          onDeleteComposed={
            inputMode === 'sentence' ? handleDeleteComposed : undefined
          }
          onClear={handleClear}
          canNavigate={inputMode === 'sentence' && candidates.length > 1}
          inputRef={inputRef}
        />
        {inputMode === 'word' && submitting ? (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('search.pinyinFinding')}
          </p>
        ) : null}
        <HskFilter selected={hskLevels} onChange={setHskLevels} />
      </section>

      {error ? (
        <EmptyState
          title={t('errors.generic')}
          description={t('search.offline')}
          icon={<BookOpen className="h-6 w-6" />}
        />
      ) : !data ? (
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse-soft rounded-2xl bg-surface-2" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-2/3 animate-pulse-soft rounded-full bg-surface-2" />
              <div className="h-2.5 w-1/2 animate-pulse-soft rounded-full bg-surface-2" />
            </div>
          </div>
          <p className="mt-4 text-xs text-muted">{t('search.loading')}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">{t('search.loadingHint')}</p>
        </Card>
      ) : inputMode === 'word' ? (
        trimmedQuery ? (
          <SearchResults
            results={wordResults}
            query={query}
            script={script}
            entries={data.entries}
            onPractice={practiceEntry}
            onPracticeSentence={practiceSentence}
          />
        ) : (
          <div className="space-y-6">
            <RecentSearches recent={recent} onPick={handleQueryChange} onClear={clear} />

            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  {t('search.starter')}
                </h2>
                <Badge tone="sage">HSK 1</Badge>
              </div>
              <StarterGrid entries={starters} script={script} onPick={practiceEntry} />
              <Button
                variant="soft"
                className="w-full"
                onClick={() => {
                  const entry = randomStarter(data.entries)
                  if (entry) practiceEntry(entry)
                }}
              >
                <Dices className="h-4 w-4" />
                {t('search.random')}
              </Button>
            </section>

            <HowItWorks />
          </div>
        )
      ) : (
        <div className="space-y-3">
          {trimmedQuery ? (
            <ComposerCandidates
              candidates={candidates}
              status={status}
              selectedIndex={activeIndex}
              onSelect={(text) => commit(text)}
              onRetry={retry}
            />
          ) : null}
          {composedText.trim() ? (
            <CompositionPreview
              text={composedText}
              onPractice={finalizeSentence}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
