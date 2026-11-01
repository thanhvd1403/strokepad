import HanziWriter from 'hanzi-writer'
import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useElementSize } from '../lib/hooks'
import type { GridStyle, StrokeData } from '../types'
import { PracticeGrid } from './PracticeGrid'
import { Button } from './ui'

export function StrokeOrderPlayer({
  character,
  data,
  grid,
}: {
  character: string
  data: StrokeData
  grid: GridStyle
}) {
  const { t } = useTranslation()
  const [containerRef, size] = useElementSize<HTMLDivElement>()
  const writerRef = useRef<HanziWriter | null>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const gridPadding = Math.max(6, size * 0.04)

  useEffect(() => {
    const target = targetRef.current
    if (!target || size <= 0) return
    const styles = getComputedStyle(document.documentElement)
    const ink = styles.getPropertyValue('--text').trim() || '#3d3a34'
    const accent = styles.getPropertyValue('--accent').trim() || '#b5624b'
    target.innerHTML = ''
    setReady(false)

    let writer: HanziWriter | null = null
    try {
      writer = HanziWriter.create(target, character, {
        width: size,
        height: size,
        padding: gridPadding,
        showCharacter: true,
        showOutline: false,
        charDataLoader: () => data,
        strokeColor: ink,
        radicalColor: accent,
        highlightColor: accent,
        strokeAnimationSpeed: 1,
        delayBetweenStrokes: 220,
      })
      writerRef.current = writer
      writer.animateCharacter()
      setReady(true)
    } catch {
      // If the data is malformed, leave the container empty.
    }

    return () => {
      writer?.pauseAnimation()
      writerRef.current = null
      target.innerHTML = ''
    }
  }, [character, data, gridPadding, size])

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="relative aspect-square w-full max-w-[280px] rounded-3xl border border-line bg-surface-2/50"
      >
        <div className="absolute inset-0">
          <PracticeGrid size={size} padding={gridPadding} style={grid} />
        </div>
        <div ref={targetRef} className="relative h-full w-full" />
      </div>
      <Button
        variant="soft"
        size="sm"
        onClick={() => writerRef.current?.animateCharacter()}
        disabled={!ready}
      >
        <RotateCcw className="h-4 w-4" />
        {t('common.replay')}
      </Button>
    </div>
  )
}
