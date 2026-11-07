// Copy the pinyin-input-method-engine DAG dictionaries into public/data so
// they can be served as static files and cached by the service worker.
//
// The files are large (about 21 MB together), so they are not committed to Git
// and are ignored by .gitignore. Cloudflare Pages regenerates them during the
// build via the prebuild script.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(root, 'node_modules/pinyin-input-method-engine/dict')
const target = path.join(root, 'public/data/pinyin')
const files = ['dag_char.json', 'dag_phrase.json']

fs.mkdirSync(target, { recursive: true })
for (const file of files) {
  const from = path.join(source, file)
  if (!fs.existsSync(from)) {
    throw new Error(
      `Missing ${from}. Run npm install before building the pinyin dictionaries.`,
    )
  }
  fs.copyFileSync(from, path.join(target, file))
}
console.log(`Copied ${files.join(', ')} to public/data/pinyin`)
