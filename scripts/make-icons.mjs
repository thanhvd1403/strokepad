import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const ICONS = path.join(ROOT, 'public', 'icons')
fs.mkdirSync(ICONS, { recursive: true })

const data = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'node_modules', 'hanzi-writer-data', '汉.json'), 'utf8'),
)

function svg({ size = 512, maskable = false }) {
  const pad = maskable ? 0.22 : 0.15
  const inner = size * (1 - pad * 2)
  const offset = size * pad
  const scale = inner / 1024
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.22}" fill="#FBF6EC"/>
  <rect x="${size * 0.06}" y="${size * 0.06}" width="${size * 0.88}" height="${size * 0.88}" rx="${size * 0.16}" fill="#FFFDF8" stroke="#E8DFCF" stroke-width="${size * 0.012}"/>
  <g transform="translate(${offset}, ${offset + inner}) scale(${scale}, ${-scale})">
    ${data.strokes.map((d) => `<path d="${d}" fill="#3D3A34"/>`).join('\n    ')}
  </g>
</svg>`
}

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
]

for (const target of targets) {
  await sharp(Buffer.from(svg(target))).png().toFile(path.join(ICONS, target.file))
  console.log('wrote', target.file)
}

fs.writeFileSync(path.join(ROOT, 'public', 'favicon.svg'), svg({ size: 512 }))
console.log('wrote favicon.svg')
