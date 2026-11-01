import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useMediaQuery, useElementSize } from '../lib/hooks'
import {
  canvasToCharacter,
  characterToCanvas,
  characterTransformToSvg,
  getCharacterTransform,
  mediansToDisplay,
  pointsToSvgPath,
  type CharacterTransform,
} from '../lib/strokes'
import type { GridStyle, Point, PracticeMode, StrokeData } from '../types'
import { useSettings } from '../store/settings'
import { GridLines } from './PracticeGrid'

const CHAR_SPACE = 1024

function Outline({
  data,
  transform,
  size,
  padding,
  isDark,
  acceptedCount,
  blend,
  successFlash,
}: {
  data: StrokeData
  transform: CharacterTransform
  size: number
  padding: number
  isDark: boolean
  acceptedCount: number
  blend: boolean
  successFlash: boolean
}) {
  if (size <= 0) return null
  const baseOpacity = isDark ? 0.16 : 0.09
  const acceptedOpacity = isDark ? 0.72 : 0.58

  return (
    <g transform={characterTransformToSvg(transform, size, padding)}>
      {data.strokes.map((path, index) => {
        const accepted = index < acceptedCount
        const flashGreen = successFlash && accepted
        return (
          <path
            key={index}
            d={path}
            fill={flashGreen ? 'var(--success)' : 'var(--text)'}
            opacity={
              flashGreen
                ? acceptedOpacity
                : blend && accepted
                  ? acceptedOpacity
                  : baseOpacity
            }
          />
        )
      })}
    </g>
  )
}

function StrokeNumbers({
  medians,
  size,
  padding,
}: {
  medians: Point[][]
  size: number
  padding: number
}) {
  if (size <= 0) return null
  const radius = Math.max(7, size * 0.025)
  const fontSize = Math.max(8, size * 0.028)
  return (
    <g>
      {medians.map((median, index) => {
        const point = characterToCanvas(median[0], size, padding)
        return (
          <g key={index}>
            <circle
              cx={point.x}
              cy={point.y}
              r={radius}
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth={1.2}
              opacity={0.95}
            />
            <text
              x={point.x}
              y={point.y + fontSize * 0.35}
              textAnchor="middle"
              fontSize={fontSize}
              fontWeight={700}
              fill="var(--accent)"
            >
              {index + 1}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function trimEnd(points: Point[], trimLength: number): Point[] {
  const result = [...points]
  let remaining = trimLength
  while (result.length > 2 && remaining > 0) {
    const last = result[result.length - 1]
    const previous = result[result.length - 2]
    const segment = Math.hypot(last.x - previous.x, last.y - previous.y)
    if (segment <= remaining) {
      result.pop()
      remaining -= segment
    } else {
      const t = remaining / segment
      result[result.length - 1] = {
        x: last.x + (previous.x - last.x) * t,
        y: last.y + (previous.y - last.y) * t,
      }
      remaining = 0
    }
  }
  return result
}

function Hint({
  medians,
  index,
  size,
  padding,
}: {
  medians: Point[][]
  index: number
  size: number
  padding: number
}) {
  const median = medians[index]
  if (!median || size <= 0) return null
  const points = median.map((point) => characterToCanvas(point, size, padding))
  if (!points.length) return null
  const start = points[0]
  const end = points[points.length - 1]
  const previous = points[points.length - 2] ?? start
  const angle = Math.atan2(end.y - previous.y, end.x - previous.x)
  const arrow = Math.max(8, size * 0.03)
  const line = trimEnd(points, arrow * 1.55)
  const arrowPoints = [
    end,
    {
      x: end.x - arrow * Math.cos(angle - Math.PI / 6),
      y: end.y - arrow * Math.sin(angle - Math.PI / 6),
    },
    {
      x: end.x - arrow * Math.cos(angle + Math.PI / 6),
      y: end.y - arrow * Math.sin(angle + Math.PI / 6),
    },
  ]
  const dotRadius = Math.max(4.5, size * 0.014)

  return (
    <g>
      <path
        d={pointsToSvgPath(line)}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={Math.max(2.5, size * 0.009)}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="7 7"
        opacity={0.9}
      />
      <circle
        cx={start.x}
        cy={start.y}
        r={dotRadius + 2.5}
        fill="var(--surface)"
        stroke="var(--accent)"
        strokeWidth={1.5}
        opacity={0.95}
      />
      <circle cx={start.x} cy={start.y} r={dotRadius} fill="var(--accent)" />
      <polygon
        points={arrowPoints.map((point) => `${point.x},${point.y}`).join(' ')}
        fill="var(--accent)"
      />
    </g>
  )
}

export function PracticeCanvas({
  data,
  mode,
  grid,
  showOutline,
  blendOutline,
  showNumbers,
  acceptedStrokes,
  hintVisible,
  hintIndex,
  successFlash,
  onStroke,
  onDrawStart,
  disabled = false,
}: {
  data: StrokeData
  mode: PracticeMode
  grid: GridStyle
  showOutline: boolean
  blendOutline: boolean
  showNumbers: boolean
  acceptedStrokes: Point[][]
  hintVisible: boolean
  hintIndex: number
  successFlash: boolean
  onStroke: (stroke: Point[]) => boolean
  onDrawStart?: () => void
  disabled?: boolean
}) {
  const [containerRef, size] = useElementSize<HTMLDivElement>()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const currentStrokeRef = useRef<Point[]>([])
  const wrongStrokeRef = useRef<Point[] | null>(null)
  const wrongTimerRef = useRef<number | null>(null)
  const padding = Math.max(8, size * 0.035)
  const theme = useSettings((state) => state.theme)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const isDark = theme === 'dark' || (theme === 'system' && systemDark)
  const transform = useMemo(() => getCharacterTransform(data), [data])
  const displayMedians = useMemo(
    () => mediansToDisplay(data, transform),
    [data, transform],
  )

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || size <= 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5)
    if (canvas.width !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr)
      canvas.height = Math.round(size * dpr)
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, size, size)

    const rootStyles = getComputedStyle(document.documentElement)
    const ink = rootStyles.getPropertyValue('--text').trim() || '#3d3a34'
    const danger = rootStyles.getPropertyValue('--danger').trim() || '#c25b5b'
    const success = rootStyles.getPropertyValue('--success').trim() || '#4f7a4a'
    const width = Math.max(4, size * 0.018)
    const acceptedColor = successFlash ? success : ink

    const drawStroke = (stroke: Point[], color: string, alpha = 1) => {
      if (stroke.length < 2) return
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      stroke.forEach((point, index) => {
        const canvasPoint = characterToCanvas(point, size, padding)
        if (index === 0) ctx.moveTo(canvasPoint.x, canvasPoint.y)
        else ctx.lineTo(canvasPoint.x, canvasPoint.y)
      })
      ctx.stroke()
      ctx.restore()
    }

    if (!blendOutline) {
      for (const stroke of acceptedStrokes) drawStroke(stroke, acceptedColor, 0.96)
    }
    if (currentStrokeRef.current.length > 1) {
      drawStroke(currentStrokeRef.current, ink, 0.7)
    }
    if (wrongStrokeRef.current) {
      drawStroke(wrongStrokeRef.current, danger, 0.95)
    }
  }, [acceptedStrokes, blendOutline, padding, size, successFlash])

  useEffect(() => {
    draw()
  }, [
    draw,
    theme,
    systemDark,
    grid,
    mode,
    showOutline,
    blendOutline,
    showNumbers,
    hintVisible,
    hintIndex,
    successFlash,
  ])

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const local = {
      x: ((event.clientX - rect.left) / rect.width) * size,
      y: ((event.clientY - rect.top) / rect.height) * size,
    }
    const character = canvasToCharacter(local, size, padding)
    return {
      x: Math.max(0, Math.min(CHAR_SPACE, character.x)),
      y: Math.max(0, Math.min(CHAR_SPACE, character.y)),
    }
  }

  const finishStroke = () => {
    const stroke = currentStrokeRef.current
    currentStrokeRef.current = []
    drawingRef.current = false
    if (stroke.length < 2) {
      draw()
      return
    }
    const accepted = onStroke(stroke)
    if (accepted) {
      draw()
      return
    }
    wrongStrokeRef.current = stroke
    draw()
    if (wrongTimerRef.current) window.clearTimeout(wrongTimerRef.current)
    wrongTimerRef.current = window.setTimeout(() => {
      wrongStrokeRef.current = null
      draw()
    }, 320)
  }

  useEffect(() => {
    return () => {
      if (wrongTimerRef.current) window.clearTimeout(wrongTimerRef.current)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative mx-auto aspect-square w-full max-w-[min(86vw,380px)] select-none rounded-[1.4rem]"
    >
      <svg
        viewBox={`0 0 ${Math.max(size, 1)} ${Math.max(size, 1)}`}
        width={size || 1}
        height={size || 1}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <GridLines size={size} padding={padding} style={grid} />
        {blendOutline || (mode === 'guided' && showOutline) ? (
          <Outline
            data={data}
            transform={transform}
            size={size}
            padding={padding}
            isDark={isDark}
            acceptedCount={acceptedStrokes.length}
            blend={blendOutline}
            successFlash={successFlash}
          />
        ) : null}
        {hintVisible ? (
          <Hint medians={displayMedians} index={hintIndex} size={size} padding={padding} />
        ) : null}
        {showNumbers ? (
          <StrokeNumbers medians={displayMedians} size={size} padding={padding} />
        ) : null}
      </svg>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none rounded-[1.4rem]"
        style={{ width: size || 1, height: size || 1 }}
        onPointerDown={(event) => {
          if (disabled) return
          try {
            event.currentTarget.setPointerCapture(event.pointerId)
          } catch {
            // Synthetic pointer events (and some browsers) may not support capture.
          }
          drawingRef.current = true
          currentStrokeRef.current = [pointFromEvent(event)]
          onDrawStart?.()
          draw()
        }}
        onPointerMove={(event) => {
          if (!drawingRef.current || disabled) return
          const point = pointFromEvent(event)
          const previous = currentStrokeRef.current[currentStrokeRef.current.length - 1]
          if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) > 1.2) {
            currentStrokeRef.current.push(point)
            draw()
          }
        }}
        onPointerUp={() => {
          if (!drawingRef.current || disabled) return
          finishStroke()
        }}
        onPointerCancel={() => {
          if (!drawingRef.current) return
          currentStrokeRef.current = []
          drawingRef.current = false
          draw()
        }}
        aria-label="Writing canvas"
        role="img"
      />
      {size === 0 ? (
        <div className="absolute inset-0 grid place-items-center text-xs text-muted">
          Loading…
        </div>
      ) : null}
    </div>
  )
}
