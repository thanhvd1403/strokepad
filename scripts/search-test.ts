import fs from 'node:fs'
import { searchEntries } from '../src/lib/search'
import type { EntryData } from '../src/types'

const data = JSON.parse(fs.readFileSync('public/data/entries.json', 'utf8')) as EntryData
const queries = ['de', 'shi', 'nihao', 'kafei', 'xiexie', 'wo', 'zhongguo', 'xuexi', 'pengyou', 'duibuqi']

for (const query of queries) {
  const results = searchEntries(data.entries, query, [])
  console.log(
    query.padEnd(9),
    results
      .slice(0, 6)
      .map((entry) => `${entry.simp}(${entry.pinyin}, HSK${entry.hsk}, #${entry.freq})`)
      .join('  |  '),
  )
}
