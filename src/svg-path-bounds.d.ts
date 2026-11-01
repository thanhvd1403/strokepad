declare module 'svg-path-bounds' {
  /** Returns [minX, minY, maxX, maxY] for an SVG path string. */
  export default function svgPathBounds(path: string): [number, number, number, number]
}
