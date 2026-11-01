import type { GridStyle } from '../types'

export function GridLines({
  size,
  padding,
  style,
  flashIntensity = 0,
}: {
  size: number
  padding: number
  style: GridStyle
  flashIntensity?: number
}) {
  if (style === 'none' || size <= 0) return null
  const inner = size - padding * 2
  const left = padding
  const top = padding
  const right = padding + inner
  const bottom = padding + inner
  const midX = padding + inner / 2
  const midY = padding + inner / 2

  return (
    <g stroke="var(--border)" strokeWidth={1.1} fill="none" opacity={0.85}>
      <rect x={left} y={top} width={inner} height={inner} rx={8} strokeWidth={1.6} />
      <line x1={midX} y1={top} x2={midX} y2={bottom} strokeDasharray="4 6" />
      <line x1={left} y1={midY} x2={right} y2={midY} strokeDasharray="4 6" />
      {style === 'rice' ? (
        <>
          <line
            x1={left}
            y1={top}
            x2={right}
            y2={bottom}
            strokeDasharray="4 7"
            opacity={0.7}
          />
          <line
            x1={right}
            y1={top}
            x2={left}
            y2={bottom}
            strokeDasharray="4 7"
            opacity={0.7}
          />
        </>
      ) : null}
      {flashIntensity > 0 ? (
        <rect
          x={left}
          y={top}
          width={inner}
          height={inner}
          rx={8}
          fill="none"
          stroke="var(--success)"
          strokeWidth={3}
          opacity={flashIntensity * 0.9}
        />
      ) : null}
    </g>
  )
}

export function PracticeGrid({
  size,
  padding,
  style,
  flashIntensity = 0,
}: {
  size: number
  padding: number
  style: GridStyle
  flashIntensity?: number
}) {
  if (style === 'none' || size <= 0) return null
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="h-full w-full"
      aria-hidden="true"
    >
      <GridLines
        size={size}
        padding={padding}
        style={style}
        flashIntensity={flashIntensity}
      />
    </svg>
  )
}
