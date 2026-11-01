# Hanzi Practice

A calm, offline-first mobile web app for learning Chinese characters by writing
them. Search by Chinese or pinyin, practice stroke by stroke, and keep the
characters you love close.

Built as a PWA with React, TypeScript, and Vite. It can be installed to a phone's
home screen and used offline after the first visit.

## Features

- **Search by Chinese or pinyin** — `nihao`, `nh`, `ni hao`, or `你好`.
- **HSK 3.0 aware ranking** — exact matches first, then HSK level and general
  word frequency. Filter results to HSK 1–9.
- **Character strip** — a word or sentence is split into characters; tap any
  character to practise it.
- **Guided mode** — a centred outline, optional stroke numbers, hints, and
  stroke-by-stroke validation. Wrong strokes are rejected and can be retried.
- **Plain mode** — no outline, with lenient position matching so off-centre
  writing still counts.
- **Stroke-order animation** — watch the character drawn stroke by stroke, on
  the same grid used for practice.
- **Favorites** — save characters, words, and sentences.
- **English and Vietnamese** — UI and dictionary meanings, with a language
  toggle.
- **Light and dark themes** — cream pastel light theme, Catppuccin Mocha dark
  theme.
- **Offline** — app shell, dictionary, and stroke data are cached; favorites are
  stored locally in IndexedDB.
- **Export / import favorites** — JSON backup for moving between devices.

## Getting started

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

### Production build

```bash
npm run build
npm run preview
```

The build output is in `dist/`. Deploy it to any static host. The app uses
`BrowserRouter`, so configure an SPA fallback to `index.html` (Cloudflare Pages
needs a `_redirects` file with `/* /index.html 200`; Vercel needs a rewrite).

## Data pipeline

The app ships with generated JSON in `public/data/`. To rebuild it:

```bash
npm run data          # download sources + build data
```

or separately:

```bash
npm run data:fetch    # download raw dictionaries into data/sources/
npm run data:build    # generate public/data/entries.json + strokes/
```

`npm run data:build` requires `hanzi-writer-data` (installed by npm) and the raw
sources in `data/sources/`. The build script checks for them and tells you what
is missing.

### Sources

| Data | Source | License |
| --- | --- | --- |
| Stroke outlines and medians | [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) via [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) | Arphic Public License |
| English definitions | [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict) | CC BY-SA 4.0 |
| Vietnamese definitions | [CVDICT](https://github.com/ph0ngp/CVDICT) | CC BY-SA 4.0 |
| HSK 3.0 words and characters | [elkmovie/hsk30](https://github.com/elkmovie/hsk30), [ivankra/hsk30](https://github.com/ivankra/hsk30) | MIT |
| Word frequency | [FrequencyWords zh_cn_50k](https://github.com/hermitdave/FrequencyWords) | CC BY-SA 4.0 |

The processed dictionary (`public/data/entries.json`) is a derivative of
CC-CEDICT and CVDICT and is distributed under CC BY-SA 4.0. The repacked stroke
JSON in `public/data/strokes` is distributed under the Arphic Public License.
See [`LICENSE-DATA`](./LICENSE-DATA) and the in-app **Settings → Licenses &
data sources** page.

The application code is MIT licensed. See [`LICENSE`](./LICENSE).

## How stroke checking works

The app uses the stroke medians from Make Me a Hanzi. Each character is
centred and scaled using the bounds of its actual SVG outlines, so the guided
shadow sits neatly inside the grid.

For every pointer stroke:

1. The user stroke and the expected median are resampled to 24 points.
2. Shape is compared after centring and normalising both strokes.
3. Direction is compared from start to end.
4. Position is compared to the expected stroke. Guided mode uses a tighter
   tolerance; plain mode estimates a translation offset from the strokes
   already accepted, so a drawing that is small or shifted still matches.
5. A weighted score decides whether the stroke is accepted. The leniency slider
   in practice settings adjusts the threshold.

The matcher is intentionally forgiving for short strokes (dots and 提) and
stricter about shape and direction for long strokes. A “Mark correct” escape
hatch appears after repeated misses.

## Project structure

```
src/
├─ components/      UI, practice canvas, grid, character strip, etc.
├─ lib/             search, stroke matching, IndexedDB, hooks
├─ routes/          Home, Practice, Favorites, Settings, Licenses
├─ store/           persisted settings (Zustand)
├─ i18n.ts          English + Vietnamese strings
└─ types.ts
scripts/
├─ fetch-data.mjs   download raw dictionaries
├─ build-data.mjs   build entries.json + stroke JSON
├─ make-icons.mjs   generate PWA icons
└─ search-test.ts   inspect search ranking
public/
├─ data/            generated dictionary and strokes
├─ icons/           PWA icons
└─ licenses/        Arphic PL and data license text
```

## Design

- **Light theme:** cream pastel (`#fbf6ec` base, terracotta accent).
- **Dark theme:** Catppuccin Mocha (`#1e1e2e` Base, `#313244` Surface0,
  `#cdd6f4` Text, `#f5c2e7` Pink accent).
- Typography uses system fonts for fast loading; Chinese uses the system
  CJK font stack.
- The practice screen is intentionally quiet: grid, character, controls, and a
  compact meaning card.

## Roadmap

- Traditional Chinese toggle.
- Audio pronunciation.
- Mastery tracking and spaced repetition.
- Share Target API (share Chinese text from another app into the practice
  screen).
- Printable practice worksheets.
- Optional Capacitor wrapper for app-store distribution.

## Notes

- The dictionary is fetched once and cached by the service worker. On a slow
  first visit the search screen shows a loading state.
- The app has no backend and no accounts. Favorites live in IndexedDB on the
  device; use export/import to move them.
- CVDICT is largely machine-translated from CC-CEDICT. Some Vietnamese
  definitions may be imperfect.
- HSK lists are OCR-derived from the official 2021 standard; a small number of
  entries may need correction.
