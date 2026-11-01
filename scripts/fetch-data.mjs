import fs from 'node:fs'
import path from 'node:path'

const SOURCES = [
  {
    file: 'cedict.txt.gz',
    url: 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz',
  },
  {
    file: 'CVDICT.u8',
    url: 'https://raw.githubusercontent.com/ph0ngp/CVDICT/main/CVDICT.u8',
  },
  {
    file: 'hsk30.csv',
    url: 'https://raw.githubusercontent.com/ivankra/hsk30/master/hsk30.csv',
  },
  {
    file: 'hsk30-chars.csv',
    url: 'https://raw.githubusercontent.com/ivankra/hsk30/master/hsk30-chars.csv',
  },
  {
    file: 'zh_cn_50k.txt',
    url: 'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/zh_cn/zh_cn_50k.txt',
  },
]

const directory = path.join(process.cwd(), 'data', 'sources')
fs.mkdirSync(directory, { recursive: true })

for (const source of SOURCES) {
  const destination = path.join(directory, source.file)
  if (fs.existsSync(destination) && fs.statSync(destination).size > 0) {
    console.log(`✓ ${source.file}`)
    continue
  }

  console.log(`↓ ${source.file}`)
  const response = await fetch(source.url)
  if (!response.ok) {
    throw new Error(`Failed to download ${source.url}: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(destination, buffer)
  console.log(`  ${(buffer.length / 1024 / 1024).toFixed(1)} MB`)
}

console.log('\nSources ready. Run `npm run data:build` next.')
