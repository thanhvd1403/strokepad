# Strokepad

A calm, offline-first mobile web app for learning Chinese characters by writing
them. Search by Chinese or pinyin, practice stroke by stroke, and keep the
characters you love close.

Built as a PWA with React, TypeScript, and Vite. Install it to a phone's home
screen and use it offline after the first visit.

## Features

- **Search by Chinese or pinyin** — `nihao`, `nh`, `ni hao`, or `你好`.
- **Practice your own text** — type any Chinese sentence, punctuation and
  spaces included, and practise every character in order.
- **Pinyin sentence fallback** — as you type pinyin, matching characters and
  words appear immediately. If nothing matches, sentence suggestions from the
  MIT pinyin-input-method-engine DAG model appear at the bottom for you to
  choose. The model is cached for offline use after the first suggestion.
- **HSK 3.0 aware ranking** — exact matches first, then HSK level and general
  word frequency. Filter results to HSK 1–9.
- **Character strip** — a word or sentence is split into characters; tap any
  character to practise it.
- **Guided mode** — a centred outline, optional stroke numbers, hints, and
  stroke-by-stroke validation. Wrong strokes are rejected and can be retried.
- **Plain mode** — no outline, with lenient position matching so off-centre
  writing still counts.
- **Blend into outline** — an optional mode where a correct stroke replaces
  your ink with the character's shadow outline, so the character builds up line
  by line in stroke order. In Plain mode the guide shadow is hidden, so only
  accepted strokes appear.
- **Completion flash** — one smooth green fade across the character and the grid
  border when all strokes are correct. No popup.
- **Stroke-order animation** — watch the character drawn stroke by stroke, on
  the same grid used for practice.
- **Favorites** — save characters, words, and sentences.
- **Simplified and traditional Chinese** — switch the whole app between
  simplified and traditional characters from the header or settings. Search
  works in either form, and traditional characters load their own stroke data.
- **English and Vietnamese** — UI and dictionary meanings, with a language
  toggle.
- **Light and dark themes** — cream pastel light theme, Catppuccin Mocha dark
  theme.
- **Offline** — the app shell and dictionary are cached automatically, strokes
  are cached as you practice, and **Settings → Offline** can download the full
  bundled stroke pack. Favorites are stored locally in IndexedDB.
- **Prompted updates** — the app checks for a new version on launch and when it
  becomes visible again. A small banner offers **Reload** or **Later**, so an
  update never interrupts a stroke.
- **Export / import favorites** — JSON backup for moving between devices.
- **Polyphonic readings** — tone-distinguished entries keep their own pinyin and
  definitions, for example 得 `dé` / `de` / `děi`, 过 `guò` / `guo`, and
  只 `zhǐ` / `zhī`.

## Practice options

Open the gear icon on the practice screen to adjust:

| Option | What it does |
| --- | --- |
| Guided / Plain | Switch between tracing the shadow and writing freely. |
| Script | Switch between simplified and traditional characters. |
| Grid | Rice grid (米字格), field grid (田字格), or no grid. |
| Blend into outline | Correct strokes fill the shadow instead of showing your ink. |
| Outline | Show or hide the faint character shadow. |
| Stroke numbers | Show the start point and number of each stroke. |
| Hints | Show the next stroke as a dashed guide after misses. |
| Leniency | Make stroke grading stricter or more forgiving. |
| Hint after misses | Choose when the next-stroke hint appears. |
| Auto advance | Move to the next character after a short completion flash. |
| Sound & vibration | Haptic feedback on correct and incorrect strokes. |

After four misses on the same stroke, a **Mark correct** button appears as an
escape hatch.

## Tech stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4
- React Router 7
- Zustand (settings) + Dexie (favorites in IndexedDB)
- [Hanzi Writer](https://github.com/chanind/hanzi-writer) for stroke-order animation
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro) for pinyin conversion and matching
- [svg-path-bounds](https://github.com/hughsk/svg-path-bounds) for centring glyphs
- i18next / react-i18next
- vite-plugin-pwa + Workbox for offline support
- oxlint for linting

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

The build output is in `dist/`. Deploy it to any static host.

- **Cloudflare Pages:** `public/_redirects` already contains `/* /index.html 200`.
  `public/_headers` sets long-lived caching for hashed assets and data files.
  The free plan has unlimited static requests and bandwidth.
- **Netlify:** the same `public/_redirects` file works.
- **Vercel:** add a rewrite of all routes to `/index.html`.

## PWA and offline

The app is installable from the browser and works offline through a service
worker.

- **App shell** — HTML, JS, CSS, icons, and the manifest are precached.
- **Dictionary** — `entries.json` is fetched once with a version query and
  cached with `CacheFirst`. Bump `DATA_VERSION` in `src/lib/data.ts` when the
  dictionary data changes.
- **Strokes** — stroke JSON is cached on demand with `CacheFirst`, so only
  characters you open are downloaded.
- **Pinyin suggestions** — the pinyin-input-method-engine DAG dictionaries
  (about 21 MB raw, 2.5 MB Brotli) are fetched after the app shell is idle and
  cached with `CacheFirst`. Bump `PINYIN_DATA_VERSION` in
  `src/lib/pinyin-suggest.ts` when the engine data changes.
- **Full offline pack** — **Settings → Offline → Download all** fetches every
  bundled stroke file (about 15 MB) into Cache Storage. Already-downloaded
  characters are skipped, and the download can be cancelled.
- **Updates** — a new service worker is detected on launch, on `pageshow`, and
  when the app returns to the foreground while online. A non-blocking banner
  offers **Reload** or **Later**. The old version keeps working offline until
  you accept the update.

The service worker cache names live in `src/lib/offline.ts` and
`vite.config.ts`; keep them in sync. If you rebuild stroke data, bump the stroke
cache version or purge the cache, because stroke URLs do not include a content
hash.

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
is missing. Raw sources are gitignored; the generated data under `public/data/`
is committed so deployments work without re-downloading the dictionaries.

Current output:

- **13,118 dictionary entries** (3,000 characters + 10,118 words)
- **4,194 stroke JSON files**, covering both simplified and traditional forms,
  plus CDN fallback for characters outside the bundled set
- Traditional variants in the HSK lists are resolved to a drawable form, and
  each entry stores separate simplified and traditional stroke totals
- `public/data/SOURCE.json` records the source URLs and SHA-256 hashes

### Sources

| Data | Source | License |
| --- | --- | --- |
| Stroke outlines and medians | [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) via [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data) | Arphic Public License |
| English definitions | [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cedict) | CC BY-SA 4.0 |
| Vietnamese definitions | [CVDICT](https://github.com/ph0ngp/CVDICT) | CC BY-SA 4.0 |
| HSK 3.0 words and characters | [elkmovie/hsk30](https://github.com/elkmovie/hsk30), [ivankra/hsk30](https://github.com/ivankra/hsk30) | MIT |
| Word frequency | [FrequencyWords zh_cn_50k](https://github.com/hermitdave/FrequencyWords) | CC BY-SA 4.0 |
| Pinyin sentence suggestions | [pinyin-input-method-engine](https://gitee.com/tiger-with-wings-org/pinyin-input-method-engine), based on [Pinyin2Hanzi](https://github.com/letiantian/Pinyin2Hanzi) | MIT |

The DAG dictionaries from pinyin-input-method-engine are copied to
`public/data/pinyin/` by `scripts/copy-pinyin-dict.mjs` during dev and build.
That directory is gitignored; the source package is installed from npm.

The processed dictionary (`public/data/entries.json`) is a derivative of
CC-CEDICT and CVDICT and is distributed under CC BY-SA 4.0. The repacked stroke
JSON in `public/data/strokes` is distributed under the Arphic Public License.
See [`LICENSE-DATA`](./LICENSE-DATA) and the in-app **Settings → Licenses &
data sources** page.

The application code is MIT licensed. See [`LICENSE`](./LICENSE).

## How stroke checking works

The app uses the stroke medians from Make Me a Hanzi. Each character is centred
and scaled using the bounds of its actual SVG outlines, so the guided shadow
sits neatly inside the grid.

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
stricter about shape and direction for long strokes.

## Project structure

```
src/
├─ components/      UI, practice canvas, grid, offline pack, pinyin suggestions
├─ lib/             search, script conversion, stroke matching, pinyin suggestions, offline cache
├─ routes/          Home, Practice, Favorites, Settings, Licenses
├─ store/           persisted settings (Zustand)
├─ i18n.ts          English + Vietnamese strings
└─ types.ts
scripts/
├─ fetch-data.mjs   download raw dictionaries
├─ build-data.mjs   build entries.json + stroke JSON
├─ copy-pinyin-dict.mjs  copy the pinyin engine DAG dictionaries
├─ make-icons.mjs   generate PWA icons
└─ search-test.ts   inspect search ranking
public/
├─ data/            generated dictionary, pinyin model, and strokes
├─ icons/           PWA icons
├─ licenses/        Arphic PL, data, and pinyin engine license text
├─ _headers         Cloudflare Pages cache headers
└─ _redirects       Cloudflare/Netlify SPA fallback
```

## Design

- **Light theme:** cream pastel (`#fbf6ec` base, terracotta accent).
- **Dark theme:** Catppuccin Mocha (`#1e1e2e` Base, `#313244` Surface0,
  `#45475a` Surface1, `#cdd6f4` Text, `#a6adc8` Subtext0, `#f5c2e7` Pink
  accent). The soft accent backgrounds are the official accents blended 18%
  over Base.
- Typography uses system fonts for fast loading; Chinese uses the system CJK
  font stack.
- The practice screen is intentionally quiet: grid, character, controls, and a
  compact meaning card.
- The completion flash is a single 900ms fade: 180ms in, 270ms hold, 450ms out.
  It fades the accepted strokes and the grid border to green without a glow.

## Testing

There is no automated test suite yet. Manual checks cover:

- Search by Chinese, full pinyin, initials, and spaced pinyin.
- HSK filter changes the result set.
- Guided mode accepts all strokes of a character and rejects wrong strokes.
- Plain mode accepts an off-centre stroke.
- Blend-into-outline mode leaves no ink on the canvas and reveals the shadow.
- Completion flash has no popup and fades the grid border and strokes.
- Favorites add/remove and persist across reloads.
- English/Vietnamese, simplified/traditional, and light/dark toggles.
- Traditional search and practice: 说/說 both resolve, 說 draws with 14 strokes,
  and a sentence like 我的头发 converts to 我的頭髮.
- Favorites saved in traditional mode reopen in traditional and stay canonical
  in storage.
- Production PWA registers a service worker and caches the dictionary and
  strokes.
- A new build shows the **Update available** banner; **Reload** activates the
  new service worker without losing favorites or the offline pack.
- **Settings → Offline → Download all** reaches 4,194 cached stroke files,
  stores `entries.json?v=2`, and survives an app update.
- A Chinese sentence with punctuation shows the **Practice your own text** card;
  the character count ignores punctuation, and Enter starts practice.
- A pinyin query shows matching characters and words first. If there are no
  dictionary matches, up to five sentence suggestions from the DAG model appear
  at the bottom; tapping one or pressing Enter practises the best sentence.
- A pinyin query with a dictionary match (for example `nihao` → 你好) starts
  practice on Enter with that character or word, not a generated sentence.

Lighthouse on the production preview: **1.0 Accessibility, 1.0 Best Practices,
1.0 SEO**.

## Roadmap

- Audio pronunciation.
- Mastery tracking and spaced repetition.
- Share Target API (share Chinese text from another app into the practice
  screen).
- Printable practice worksheets.
- Optional Capacitor wrapper for app-store distribution.
- Automated tests for the stroke matcher and data pipeline.

## Notes

- The dictionary is fetched once from `entries.json?v=<DATA_VERSION>` and then
  served from cache. On a slow first visit the search screen shows a loading
  state. The file is about 3.7 MB uncompressed; hosting it with gzip/brotli is
  recommended. Bump `DATA_VERSION` when the dictionary changes.
- The full offline pack is about 15 MB and 4,194 requests. It is optional and
  only downloads characters that are not already cached.
- Pinyin sentence suggestions use the MIT pinyin-input-method-engine. Its DAG
  dictionaries are copied to `public/data/pinyin` during dev/build, loaded on
  demand (about 2.5 MB Brotli), and cached; individual sentences are not stored.
  The engine's top paths get a light character-frequency tie-break from the app
  dictionary so a rare phrase does not outrank a more common reading.
- Settings shows the build date and short commit (for example
  `2026-11-07 (abcdef01)`), injected by `vite.config.ts`.
- The app has no backend and no accounts. Favorites live in IndexedDB on the
  device; use export/import to move them.
- CVDICT is largely machine-translated from CC-CEDICT. Some Vietnamese
  definitions may be imperfect.
- HSK lists are OCR-derived from the official 2021 standard; a small number of
  entries may need correction.
- iOS PWA limitations: storage may be evicted, and haptics are not available.
  A Capacitor wrapper is the path to full native distribution later.
