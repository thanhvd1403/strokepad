import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  PenLine,
  Play,
  RotateCcw,
  Settings2,
  Undo2,
} from 'lucide-react'
import { pinyin } from 'pinyin-pro'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CharacterStrip } from '../components/CharacterStrip'
import { FavoriteButton } from '../components/FavoriteButton'
import { PracticeCanvas } from '../components/PracticeCanvas'
import { StrokeOrderPlayer } from '../components/StrokeOrderPlayer'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Segmented,
  Sheet,
  Toggle,
} from '../components/ui'
import { loadEntries } from '../lib/data'
import { findEntry, practiceCharacters } from '../lib/search'
import { getReferenceStrokes, loadStrokeData, matchStroke } from '../lib/strokes'
import { useSettings } from '../store/settings'
import type { Entry, GridStyle, Point, PracticeMode, StrokeData } from '../types'

function firstMeaning(entry: Entry | undefined, language: 'en' | 'vi') {
  if (!entry) return undefined
  const primary = language === 'vi' ? entry.vi[0] : entry.en[0]
  const fallback = language === 'vi' ? entry.en[0] : entry.vi[0]
  return primary ?? fallback
}

export function Practice() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const text = searchParams.get('text') ?? ''
  const characters = useMemo(() => practiceCharacters(text), [text])
  const requestedIndex = Number(searchParams.get('i') ?? '0')
  const charIndex = Math.max(
    0,
    Math.min(
      Number.isFinite(requestedIndex) ? requestedIndex : 0,
      Math.max(characters.length - 1, 0),
    ),
  )
  const currentChar = characters[charIndex]

  const language = useSettings((state) => state.language)
  const mode = useSettings((state) => state.mode)
  const setMode = useSettings((state) => state.setMode)
  const grid = useSettings((state) => state.grid)
  const setGrid = useSettings((state) => state.setGrid)
  const showOutline = useSettings((state) => state.showOutline)
  const setShowOutline = useSettings((state) => state.setShowOutline)
  const blendOutline = useSettings((state) => state.blendOutline)
  const setBlendOutline = useSettings((state) => state.setBlendOutline)
  const showNumbers = useSettings((state) => state.showNumbers)
  const setShowNumbers = useSettings((state) => state.setShowNumbers)
  const hints = useSettings((state) => state.hints)
  const setHints = useSettings((state) => state.setHints)
  const autoAdvance = useSettings((state) => state.autoAdvance)
  const setAutoAdvance = useSettings((state) => state.setAutoAdvance)
  const sound = useSettings((state) => state.sound)
  const setSound = useSettings((state) => state.setSound)
  const leniency = useSettings((state) => state.leniency)
  const setLeniency = useSettings((state) => state.setLeniency)
  const hintAfter = useSettings((state) => state.hintAfter)
  const setHintAfter = useSettings((state) => state.setHintAfter)

  const [entries, setEntries] = useState<Entry[]>([])
  const [strokeData, setStrokeData] = useState<StrokeData | null>(null)
  const [strokeLoading, setStrokeLoading] = useState(true)
  const [acceptedStrokes, setAcceptedStrokes] = useState<Point[][]>([])
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [mistakes, setMistakes] = useState(0)
  const [currentMistakes, setCurrentMistakes] = useState(0)
  const [hintRequested, setHintRequested] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [watchOpen, setWatchOpen] = useState(false)
  const [successFlash, setSuccessFlash] = useState(false)
  const acceptedRef = useRef<Point[][]>([])
  const flashTimersRef = useRef<number[]>([])

  useEffect(() => {
    loadEntries()
      .then((data) => setEntries(data.entries))
      .catch(() => setEntries([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    if (!currentChar) return
    setStrokeLoading(true)
    setStrokeData(null)
    loadStrokeData(currentChar)
      .then((data) => {
        if (!cancelled) {
          setStrokeData(data)
          setStrokeLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStrokeData(null)
          setStrokeLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [currentChar])

  const referenceStrokes = useMemo(
    () => (strokeData ? getReferenceStrokes(strokeData) : []),
    [strokeData],
  )

  const clearFlashTimers = useCallback(() => {
    for (const timer of flashTimersRef.current) window.clearTimeout(timer)
    flashTimersRef.current = []
  }, [])

  const triggerSuccessFlash = useCallback(() => {
    clearFlashTimers()
    setSuccessFlash(true)
    flashTimersRef.current = [
      window.setTimeout(() => setSuccessFlash(false), 160),
      window.setTimeout(() => setSuccessFlash(true), 300),
      window.setTimeout(() => setSuccessFlash(false), 460),
    ]
  }, [clearFlashTimers])

  const resetStrokes = useCallback(() => {
    acceptedRef.current = []
    setAcceptedStrokes([])
    setCurrentMistakes(0)
    setHintRequested(false)
    setSuccessFlash(false)
    clearFlashTimers()
  }, [clearFlashTimers])

  useEffect(() => {
    return () => clearFlashTimers()
  }, [clearFlashTimers])

  useEffect(() => {
    resetStrokes()
    setMistakes(0)
  }, [currentChar, resetStrokes])

  useEffect(() => {
    setCompleted(new Set())
    setMistakes(0)
  }, [text])

  const goToIndex = useCallback(
    (next: number) => {
      if (next < 0 || next >= characters.length) return
      navigate(`/practice?text=${encodeURIComponent(text)}&i=${next}`, {
        replace: true,
      })
    },
    [characters.length, navigate, text],
  )

  const markCompleted = useCallback(
    (index: number) => {
      setCompleted((current) => {
        const next = new Set(current)
        next.add(index)
        return next
      })
      if (autoAdvance && index < characters.length - 1) {
        window.setTimeout(() => goToIndex(index + 1), 900)
      }
    },
    [autoAdvance, characters.length, goToIndex],
  )

  const handleStroke = useCallback(
    (stroke: Point[]) => {
      const strokeIndex = acceptedRef.current.length
      const reference = referenceStrokes[strokeIndex]
      if (!reference) return false

      const result = matchStroke(stroke, reference, {
        mode,
        size: 1024,
        padding: 0,
        leniency,
        acceptedUser: acceptedRef.current,
        acceptedReference: referenceStrokes.slice(0, strokeIndex),
      })

      if (result.ok) {
        acceptedRef.current = [...acceptedRef.current, stroke]
        setAcceptedStrokes(acceptedRef.current)
        setCurrentMistakes(0)
        setHintRequested(false)
        if (sound && typeof navigator.vibrate === 'function') navigator.vibrate(8)
        if (acceptedRef.current.length === referenceStrokes.length) {
          markCompleted(charIndex)
          triggerSuccessFlash()
        }
        return true
      }

      setMistakes((value) => value + 1)
      setCurrentMistakes((value) => value + 1)
      if (sound && typeof navigator.vibrate === 'function') navigator.vibrate([18, 28, 18])
      return false
    },
    [charIndex, leniency, markCompleted, mode, referenceStrokes, sound, triggerSuccessFlash],
  )

  const handleUndo = useCallback(() => {
    if (!acceptedRef.current.length) return
    acceptedRef.current = acceptedRef.current.slice(0, -1)
    setAcceptedStrokes(acceptedRef.current)
    setCurrentMistakes(0)
    setHintRequested(false)
    setSuccessFlash(false)
    clearFlashTimers()
    setCompleted((current) => {
      const next = new Set(current)
      next.delete(charIndex)
      return next
    })
  }, [charIndex, clearFlashTimers])

  const handleRestart = useCallback(() => {
    resetStrokes()
    setMistakes(0)
    setCompleted((current) => {
      const next = new Set(current)
      next.delete(charIndex)
      return next
    })
  }, [charIndex, resetStrokes])

  const handleMarkCorrect = useCallback(() => {
    const reference = referenceStrokes[acceptedRef.current.length]
    if (!reference) return
    acceptedRef.current = [...acceptedRef.current, reference]
    setAcceptedStrokes(acceptedRef.current)
    setCurrentMistakes(0)
    setHintRequested(false)
    if (acceptedRef.current.length === referenceStrokes.length) {
      markCompleted(charIndex)
      triggerSuccessFlash()
    }
  }, [charIndex, markCompleted, referenceStrokes, triggerSuccessFlash])

  const textEntry = useMemo(() => findEntry(entries, text), [entries, text])
  const charEntry = useMemo(
    () => (currentChar ? findEntry(entries, currentChar) : undefined),
    [currentChar, entries],
  )
  const textMeaning = firstMeaning(textEntry, language)
  const charMeaning = firstMeaning(charEntry, language)

  const favoriteType =
    textEntry?.type === 'word' ? 'word' : characters.length > 1 ? 'sentence' : 'char'
  const favoritePinyin = textEntry?.pinyin ?? pinyin(text, { toneType: 'symbol' })

  const isComplete =
    referenceStrokes.length > 0 && acceptedStrokes.length >= referenceStrokes.length
  const showHint = hintRequested || (hints && currentMistakes >= hintAfter)
  const hintIndex = acceptedStrokes.length

  if (!characters.length) {
    return (
      <div className="animate-fade-up space-y-4">
        <IconButton label={t('common.back')} onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <EmptyState
          title={t('search.empty')}
          description={t('search.emptyHint')}
          icon={<PenLine className="h-6 w-6" />}
          action={
            <Button variant="soft" onClick={() => navigate('/')}>
              {t('errors.goHome')}
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="animate-fade-up space-y-3.5">
      <div className="flex items-center gap-1.5">
        <IconButton label={t('common.back')} onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            {t('practice.progress', {
              current: charIndex + 1,
              total: characters.length,
            })}
          </p>
          <h1 className="hanzi truncate text-xl font-bold leading-tight text-ink">
            {text}
          </h1>
        </div>
        <FavoriteButton
          type={favoriteType}
          text={text}
          pinyin={favoritePinyin}
          meaning={textMeaning}
        />
        <IconButton label={t('practice.settings')} onClick={() => setSettingsOpen(true)}>
          <Settings2 className="h-5 w-5" />
        </IconButton>
      </div>

      <CharacterStrip
        characters={characters}
        currentIndex={charIndex}
        completed={completed}
        onSelect={goToIndex}
      />

      <div className="flex items-center justify-between gap-2">
        <Segmented
          value={mode}
          onChange={(value: PracticeMode) => setMode(value)}
          options={[
            { value: 'guided', label: t('practice.guided') },
            { value: 'plain', label: t('practice.plain') },
          ]}
        />
        <div className="text-right">
          <p className="text-xs font-semibold text-ink">
            {t('practice.stroke')} {Math.min(hintIndex + 1, referenceStrokes.length || 1)}
            <span className="text-muted"> / {referenceStrokes.length || '…'}</span>
          </p>
          <p className="text-xs text-muted">
            {t('common.mistakes')}: {mistakes}
          </p>
        </div>
      </div>

      <div className="relative">
        {strokeLoading ? (
          <div className="mx-auto aspect-square w-full max-w-[min(86vw,380px)] animate-pulse-soft rounded-3xl border border-line bg-surface-2/60" />
        ) : strokeData ? (
          <PracticeCanvas
            data={strokeData}
            mode={mode}
            grid={grid}
            showOutline={showOutline}
            blendOutline={blendOutline}
            successFlash={successFlash}
            showNumbers={showNumbers}
            acceptedStrokes={acceptedStrokes}
            hintVisible={showHint && !isComplete}
            hintIndex={hintIndex}
            onStroke={handleStroke}
            disabled={isComplete}
          />
        ) : (
          <EmptyState
            title={t('practice.noStrokeData')}
            description={t('practice.noStrokeDataHint')}
            icon={<PenLine className="h-6 w-6" />}
          />
        )}

      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="soft"
            size="sm"
            onClick={() => setHintRequested(true)}
            disabled={isComplete || !strokeData}
          >
            <Lightbulb className="h-4 w-4" />
            {t('common.hint')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={!acceptedStrokes.length}
          >
            <Undo2 className="h-4 w-4" />
            {t('common.undo')}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRestart}>
            <RotateCcw className="h-4 w-4" />
            {t('common.restart')}
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {currentMistakes >= 4 && !isComplete ? (
            <Button variant="outline" size="sm" onClick={handleMarkCorrect}>
              {t('practice.markCorrect')}
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWatchOpen(true)}
            disabled={!strokeData}
          >
            <Play className="h-4 w-4" />
            {t('common.watch')}
          </Button>
        </div>
      </div>

      <Card className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="hanzi grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent-soft text-3xl font-medium text-ink">
            {currentChar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-lg font-semibold text-ink">{currentChar}</span>
              <span className="text-base font-semibold text-accent">
                {charEntry?.pinyin ?? pinyin(currentChar ?? '', { toneType: 'symbol' })}
              </span>
              <Badge tone={charEntry?.hsk === 0 ? 'neutral' : 'sage'}>
                {charEntry?.hsk === 0
                  ? t('common.common')
                  : charEntry?.hsk
                    ? `HSK ${charEntry.hsk}`
                    : t('common.noDefinition')}
              </Badge>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              {charMeaning ?? t('common.noDefinition')}
            </p>
            <p className="mt-1 text-xs font-medium text-muted">
              {referenceStrokes.length}{' '}
              {t('common.strokes', { count: referenceStrokes.length })}
            </p>
          </div>
        </div>
        {text.length > 1 ? (
          <div className="mt-3 border-t border-line/60 pt-2.5">
            <p className="hanzi text-base font-medium text-ink">{text}</p>
            <p className="mt-0.5 text-sm text-accent">{favoritePinyin}</p>
            {textMeaning ? (
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{textMeaning}</p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <div className="flex items-center justify-between gap-2 px-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToIndex(charIndex - 1)}
          disabled={charIndex <= 0}
        >
          <ChevronLeft className="h-4 w-4" />
          {t('common.previous')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => goToIndex(charIndex + 1)}
          disabled={charIndex >= characters.length - 1}
        >
          {t('common.next')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Sheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title={t('practice.settings')}
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-semibold text-muted">{t('practice.title')}</p>
            <Segmented
              className="w-full"
              value={mode}
              onChange={(value: PracticeMode) => setMode(value)}
              options={[
                { value: 'guided', label: t('practice.guided') },
                { value: 'plain', label: t('practice.plain') },
              ]}
            />
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {mode === 'guided' ? t('practice.guidedHint') : t('practice.plainHint')}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-muted">{t('practice.grid')}</p>
            <Segmented
              className="w-full"
              value={grid}
              onChange={(value: GridStyle) => setGrid(value)}
              options={[
                { value: 'rice', label: t('practice.gridRice') },
                { value: 'field', label: t('practice.gridField') },
                { value: 'none', label: t('practice.gridNone') },
              ]}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted">{t('practice.leniency')}</p>
              <span className="text-xs font-semibold text-ink">{leniency.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.6}
              max={2}
              step={0.1}
              value={leniency}
              onChange={(event) => setLeniency(Number(event.target.value))}
              className="mt-2 w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
            <div className="flex justify-between text-xs text-muted">
              <span>Strict</span>
              <span>Lenient</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted">{t('practice.hintAfter')}</p>
              <span className="text-xs font-semibold text-ink">{hintAfter}</span>
            </div>
            <input
              type="range"
              min={0}
              max={5}
              step={1}
              value={hintAfter}
              onChange={(event) => setHintAfter(Number(event.target.value))}
              className="mt-2 w-full"
              style={{ accentColor: 'var(--accent)' }}
            />
          </div>

          <div className="divide-y divide-line/60">
            <Toggle
              checked={showOutline}
              onChange={setShowOutline}
              label={t('practice.showOutline')}
              description={t('practice.guidedHint')}
            />
            <Toggle
              checked={blendOutline}
              onChange={setBlendOutline}
              label={t('practice.blendOutline')}
              description={t('practice.blendOutlineHint')}
            />
            <Toggle
              checked={showNumbers}
              onChange={setShowNumbers}
              label={t('practice.showNumbers')}
            />
            <Toggle checked={hints} onChange={setHints} label={t('practice.hints')} />
            <Toggle
              checked={autoAdvance}
              onChange={setAutoAdvance}
              label={t('practice.autoAdvance')}
            />
            <Toggle checked={sound} onChange={setSound} label={t('settings.sound')} />
          </div>
        </div>
      </Sheet>

      <Sheet
        open={watchOpen}
        onClose={() => setWatchOpen(false)}
        title={t('practice.watchOrder')}
      >
        {strokeData ? (
          <div className="space-y-3">
            <p className="text-center text-xs text-muted">{t('practice.watchHint')}</p>
            <StrokeOrderPlayer character={currentChar} data={strokeData} grid={grid} />
          </div>
        ) : null}
      </Sheet>
    </div>
  )
}
