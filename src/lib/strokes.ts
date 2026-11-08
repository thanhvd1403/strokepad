import svgPathBounds from 'svg-path-bounds'
import type { Point, StrokeData } from '../types'

const cache = new Map<string, Promise<StrokeData | null>>()

export function loadStrokeData(char: string): Promise<StrokeData | null> {
  const cached = cache.get(char)
  if (cached) return cached

  const promise = (async () => {
    try {
      const local = await fetch(`/data/strokes/${encodeURIComponent(char)}.json`)
      if (local.ok) return (await local.json()) as StrokeData
    } catch {
      // Fall through to the CDN.
    }
    try {
      const remote = await fetch(
        `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${encodeURIComponent(char)}.json`,
      )
      if (remote.ok) return (await remote.json()) as StrokeData
    } catch {
      // No network and no local copy.
    }
    return null
  })()

  cache.set(char, promise)
  return promise
}

export function medianToCanvas(
  median: number[][],
  size: number,
  padding: number,
): Point[] {
  const inner = size - padding * 2
  return median.map(([x, y]) => ({
    x: padding + (x / 1024) * inner,
    y: padding + ((1024 - y) / 1024) * inner,
  }))
}

export function mediansToCanvas(
  data: StrokeData,
  size: number,
  padding: number,
): Point[][] {
  return data.medians.map((median) => medianToCanvas(median, size, padding))
}

export interface CharacterTransform {
  cx: number
  cy: number
  scale: number
}

/**
 * Centre the character's own bounding box inside the 1024×1024 practice box.
 * Make Me a Hanzi glyphs do not fill the full em square evenly, so using raw
 * coordinates makes the outline look off-centre in the grid.
 */
export function getCharacterTransform(data: StrokeData): CharacterTransform {
  let minX = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  // Prefer the real outline bounds. They include the stroke thickness and
  // keep the glyph visually centred, unlike the thinner median lines.
  for (const path of data.strokes ?? []) {
    try {
      const [x1, y1, x2, y2] = svgPathBounds(path)
      if (![x1, y1, x2, y2].every(Number.isFinite)) continue
      minX = Math.min(minX, x1)
      maxX = Math.max(maxX, x2)
      minY = Math.min(minY, y1)
      maxY = Math.max(maxY, y2)
    } catch {
      // Ignore a malformed path and fall back to the medians.
    }
  }

  if (!Number.isFinite(minX)) {
    for (const median of data.medians) {
      for (const [x, y] of median) {
        minX = Math.min(minX, x)
        maxX = Math.max(maxX, x)
        minY = Math.min(minY, y)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (!Number.isFinite(minX)) return { cx: 512, cy: 512, scale: 1 }

  const width = maxX - minX
  const height = maxY - minY
  const margin = Math.max(8, Math.max(width, height) * 0.03)
  minX -= margin
  maxX += margin
  minY -= margin
  maxY += margin

  const boxWidth = Math.max(maxX - minX, 1)
  const boxHeight = Math.max(maxY - minY, 1)
  // Fit the visual glyph to 92% of the practice box, leaving a small margin
  // between the strokes and the grid lines.
  const scale = (1024 * 0.92) / Math.max(boxWidth, boxHeight)

  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    scale,
  }
}

/** Character-space points: 0..1024, y-down, centred inside the grid. */
export function mediansToDisplay(
  data: StrokeData,
  transform = getCharacterTransform(data),
): Point[][] {
  return data.medians.map((median) =>
    median.map(([x, y]) => ({
      x: 512 + (x - transform.cx) * transform.scale,
      y: 512 - (y - transform.cy) * transform.scale,
    })),
  )
}

export function getReferenceStrokes(data: StrokeData): Point[][] {
  return mediansToDisplay(data)
}

/** SVG transform mapping raw Make Me a Hanzi coordinates to canvas pixels. */
export function characterTransformToSvg(
  transform: CharacterTransform,
  size: number,
  padding: number,
) {
  const inner = size - padding * 2
  const scale = (transform.scale * inner) / 1024
  const tx = padding + inner / 2 - transform.cx * scale
  const ty = padding + inner / 2 + transform.cy * scale
  return `translate(${tx}, ${ty}) scale(${scale}, ${-scale})`
}

export function characterToCanvas(point: Point, size: number, padding: number): Point {
  const inner = size - padding * 2
  return {
    x: padding + (point.x / 1024) * inner,
    y: padding + (point.y / 1024) * inner,
  }
}

export function canvasToCharacter(point: Point, size: number, padding: number): Point {
  const inner = size - padding * 2
  return {
    x: ((point.x - padding) / inner) * 1024,
    y: ((point.y - padding) / inner) * 1024,
  }
}

export function pointsToSvgPath(points: Point[]) {
  if (!points.length) return ''
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function pathLength(points: Point[]) {
  let total = 0
  for (let i = 1; i < points.length; i++) total += distance(points[i - 1], points[i])
  return total
}

export function centroid(points: Point[]): Point {
  if (!points.length) return { x: 0, y: 0 }
  let x = 0
  let y = 0
  for (const point of points) {
    x += point.x
    y += point.y
  }
  return { x: x / points.length, y: y / points.length }
}

export function resample(points: Point[], count: number): Point[] {
  if (!points.length) return []
  if (points.length === 1) return Array.from({ length: count }, () => points[0])

  const total = pathLength(points)
  if (total === 0) return Array.from({ length: count }, () => points[0])

  const step = total / (count - 1)
  const result: Point[] = [points[0]]
  let accumulated = 0
  let previous = points[0]
  let index = 1

  while (index < points.length && result.length < count) {
    const current = points[index]
    const segment = distance(previous, current)
    if (segment === 0) {
      index++
      continue
    }
    if (accumulated + segment >= step) {
      const t = (step - accumulated) / segment
      const point = {
        x: previous.x + (current.x - previous.x) * t,
        y: previous.y + (current.y - previous.y) * t,
      }
      result.push(point)
      previous = point
      accumulated = 0
    } else {
      accumulated += segment
      previous = current
      index++
    }
  }

  while (result.length < count) result.push(points[points.length - 1])
  return result
}

function normalize(points: Point[]) {
  const center = centroid(points)
  const centered = points.map((point) => ({
    x: point.x - center.x,
    y: point.y - center.y,
  }))
  const rms = Math.sqrt(
    centered.reduce((sum, point) => sum + point.x * point.x + point.y * point.y, 0) /
      Math.max(centered.length, 1),
  )
  const scale = rms > 0 ? 1 / rms : 1
  return centered.map((point) => ({ x: point.x * scale, y: point.y * scale }))
}

function meanDistance(a: Point[], b: Point[]) {
  const count = Math.min(a.length, b.length)
  if (!count) return Number.POSITIVE_INFINITY
  let total = 0
  for (let i = 0; i < count; i++) total += distance(a[i], b[i])
  return total / count
}

function averageOffset(user: Point[][], reference: Point[][]) {
  const count = Math.min(user.length, reference.length)
  if (!count) return { x: 0, y: 0 }
  let x = 0
  let y = 0
  for (let i = 0; i < count; i++) {
    const userCenter = centroid(user[i])
    const referenceCenter = centroid(reference[i])
    x += userCenter.x - referenceCenter.x
    y += userCenter.y - referenceCenter.y
  }
  return { x: x / count, y: y / count }
}

function directionScore(user: Point[], reference: Point[]) {
  const userStart = user[0]
  const userEnd = user[user.length - 1]
  const referenceStart = reference[0]
  const referenceEnd = reference[reference.length - 1]
  const userVector = { x: userEnd.x - userStart.x, y: userEnd.y - userStart.y }
  const referenceVector = {
    x: referenceEnd.x - referenceStart.x,
    y: referenceEnd.y - referenceStart.y,
  }
  const userMagnitude = Math.hypot(userVector.x, userVector.y)
  const referenceMagnitude = Math.hypot(referenceVector.x, referenceVector.y)
  if (userMagnitude === 0 || referenceMagnitude === 0) return 0.5
  const cosine =
    (userVector.x * referenceVector.x + userVector.y * referenceVector.y) /
    (userMagnitude * referenceMagnitude)
  return (cosine + 1) / 2
}

export interface MatchOptions {
  /**
   * True when a ghost stroke is visible (full or next-stroke mode). Tracing a
   * guide uses a tighter position check; writing from memory is more lenient.
   */
  guide: boolean
  size: number
  padding: number
  leniency: number
  acceptedUser: Point[][]
  acceptedReference: Point[][]
}

export interface MatchResult {
  ok: boolean
  score: number
  shape: number
  direction: number
  position: number
  reason?: 'too-short' | 'shape' | 'direction' | 'position' | 'score'
}

export function matchStroke(
  userStroke: Point[],
  referenceStroke: Point[],
  options: MatchOptions,
): MatchResult {
  const { guide, size, padding, leniency, acceptedUser, acceptedReference } = options
  const charSize = size - padding * 2
  const userLength = pathLength(userStroke)
  const referenceLength = pathLength(referenceStroke)

  if (userStroke.length < 2 || (userLength < 3 && referenceLength > charSize * 0.08)) {
    return { ok: false, score: 0, shape: 0, direction: 0, position: 0, reason: 'too-short' }
  }

  const user = resample(userStroke, 24)
  const reference = resample(referenceStroke, 24)
  const shapeDistance = meanDistance(normalize(user), normalize(reference))
  const shape = Math.max(0, Math.min(1, 1 - shapeDistance / 1.05))
  const lengthScore =
    Math.min(userLength, referenceLength) / Math.max(userLength, referenceLength, 1)
  const direction = directionScore(user, reference)

  const isShort = referenceLength < charSize * 0.16
  const userAnchor = isShort ? centroid(user) : user[0]
  const referenceAnchor = isShort ? centroid(reference) : reference[0]

  let adjustedUserAnchor = userAnchor
  let positionTolerance = 0.24 * charSize * leniency

  if (!guide) {
    const offset = averageOffset(acceptedUser, acceptedReference)
    adjustedUserAnchor = {
      x: userAnchor.x - offset.x,
      y: userAnchor.y - offset.y,
    }
    positionTolerance = 0.52 * charSize * leniency
  }

  const position = Math.max(
    0,
    Math.min(1, 1 - distance(adjustedUserAnchor, referenceAnchor) / positionTolerance),
  )

  const score = isShort
    ? 0.35 * shape + 0.1 * lengthScore + 0.15 * direction + 0.4 * position
    : 0.5 * shape + 0.18 * lengthScore + 0.17 * direction + 0.15 * position

  const threshold = Math.max(0.42, Math.min(0.78, 0.68 / leniency))
  const ok =
    score >= threshold &&
    shape >= 0.3 &&
    direction >= 0.35 &&
    position >= 0.12

  let reason: MatchResult['reason']
  if (!ok) {
    if (shape < 0.3) reason = 'shape'
    else if (direction < 0.35) reason = 'direction'
    else if (position < 0.12) reason = 'position'
    else reason = 'score'
  }

  return { ok, score, shape, direction, position, reason }
}
