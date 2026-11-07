import { PenLine, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { pinyin } from 'pinyin-pro'
import { isPinyinQuery } from '../lib/pinyin-suggest'
import { isHan, type RankedEntry } from '../lib/search'
import { toScript } from '../lib/script'
import type { Entry, Script } from '../types'
import { Badge, Button, Card, EmptyState } from './ui'
import { EntryRow } from './EntryRow'
import { FavoriteButton } from './FavoriteButton'
import { PinyinSuggestions } from './PinyinSuggestions'

export function SearchResults({
  results,
  query,
  script,
  entries,
  onPractice,
  onPracticeSentence,
}: {
  results: RankedEntry[]
  query: string
  script: Script
  entries: Entry[]
  onPractice: (entry: Entry) => void
  onPracticeSentence: (text: string) => void
}) {
  const { t } = useTranslation()
  const [limit, setLimit] = useState(30)
  const trimmed = query.trim()
  const hanChars = [...trimmed].filter(isHan)
  const isSingleCharacter = hanChars.length === 1 && trimmed === hanChars[0]
  const sentence = hanChars.length > 0 ? toScript(trimmed, script, entries) : null
  const canonicalSentence =
    hanChars.length > 0 ? toScript(trimmed, 'simplified', entries) : null
  const showTextCard = Boolean(sentence) && !isSingleCharacter
  const isPinyin = isPinyinQuery(trimmed)
  const resultLabel = isPinyin
    ? results.some((entry) => entry.type === 'char') &&
      results.some((entry) => entry.type === 'word')
      ? t('search.charsAndWords')
      : results.some((entry) => entry.type === 'char')
        ? t('search.chars')
        : t('search.words')
    : t('search.results')

  return (
    <div className="space-y-3">
      {showTextCard && sentence ? (
        <Card className="overflow-hidden p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Badge tone="lavender">
              <Sparkles className="h-3 w-3" />
              {t('search.practiceYourText')}
            </Badge>
            <FavoriteButton
              type="sentence"
              text={canonicalSentence ?? sentence}
              pinyin={pinyin(sentence, { toneType: 'symbol' })}
              meaning={sentence}
              size="sm"
            />
          </div>
          <p className="hanzi text-2xl font-medium leading-relaxed text-ink">
            {sentence}
          </p>
          <p className="mt-1 text-xs text-accent">
            {pinyin(sentence, { toneType: 'symbol' })}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            {t('search.textCharacters', { count: hanChars.length })} ·{' '}
            {t('search.practiceTextHint')}
          </p>
          <Button
            className="mt-3 w-full"
            variant="soft"
            onClick={() => onPracticeSentence(sentence)}
          >
            <PenLine className="h-4 w-4" />
            {t('search.practiceText')}
          </Button>
        </Card>
      ) : null}

      {results.length > 0 ? (
        <>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-ink">{resultLabel}</h2>
            <span className="text-xs font-medium text-muted">
              {t('search.resultsCount', { count: results.length })}
            </span>
          </div>

          <Card className="divide-y divide-line/60 p-1.5">
            {results.slice(0, limit).map((entry) => (
              <EntryRow key={entry.id} entry={entry} onPractice={onPractice} />
            ))}
          </Card>

          {results.length > limit ? (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setLimit((value) => value + 30)}
            >
              {t('common.showMore')}
            </Button>
          ) : null}
        </>
      ) : hanChars.length > 0 && !showTextCard ? (
        <EmptyState
          title={t('search.empty')}
          description={t('search.emptyHint')}
          icon={<Sparkles className="h-6 w-6" />}
        />
      ) : null}

      <PinyinSuggestions
        query={trimmed}
        entries={entries}
        enabled={results.length === 0 && hanChars.length === 0}
        onPractice={onPracticeSentence}
      />
    </div>
  )
}
