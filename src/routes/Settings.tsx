import {
  ChevronRight,
  Download,
  ExternalLink,
  FileUp,
  Info,
  Smartphone,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { OfflinePack } from '../components/OfflinePack'
import { Badge, Button, Card, Segmented, Toggle } from '../components/ui'
import {
  clearLocalData,
  exportCollections,
  importCollections,
} from '../lib/db'
import { useInstallPrompt } from '../lib/hooks'
import { useSettings } from '../store/settings'
import type { GridStyle, Language, PracticeMode, Script, Theme } from '../types'

const REPO_URL = 'https://github.com/thanhvd1403/strokepad'

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
        {title}
      </h2>
      <Card className="divide-y divide-line/60 px-4 py-1">{children}</Card>
    </section>
  )
}

export function Settings() {
  const { t } = useTranslation()
  const language = useSettings((state) => state.language)
  const setLanguage = useSettings((state) => state.setLanguage)
  const script = useSettings((state) => state.script)
  const setScript = useSettings((state) => state.setScript)
  const theme = useSettings((state) => state.theme)
  const setTheme = useSettings((state) => state.setTheme)
  const mode = useSettings((state) => state.mode)
  const setMode = useSettings((state) => state.setMode)
  const grid = useSettings((state) => state.grid)
  const setGrid = useSettings((state) => state.setGrid)
  const hints = useSettings((state) => state.hints)
  const setHints = useSettings((state) => state.setHints)
  const sound = useSettings((state) => state.sound)
  const setSound = useSettings((state) => state.setSound)
  const { canInstall, prompt } = useInstallPrompt()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleImport = async (file: File | undefined) => {
    if (!file) return
    try {
      await importCollections(file)
      setMessage(t('settings.importDone'))
    } catch {
      setMessage(t('settings.importFailed'))
    }
  }

  return (
    <div className="animate-fade-up space-y-5">
      <header className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          {t('nav.settings')}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
          {t('settings.title')}
        </h1>
      </header>

      {message ? (
        <div className="animate-pop rounded-2xl border border-sage/30 bg-sage-soft px-4 py-2.5 text-xs font-medium text-sage">
          {message}
        </div>
      ) : null}

      <Section title={t('settings.language')}>
        <div className="py-3">
          <Segmented
            className="w-full"
            value={language}
            onChange={(value: Language) => setLanguage(value)}
            options={[
              { value: 'en', label: 'English' },
              { value: 'vi', label: 'Tiếng Việt' },
            ]}
          />
        </div>
      </Section>

      <Section title={t('settings.script')}>
        <div className="py-3">
          <Segmented
            className="w-full"
            value={script}
            onChange={(value: Script) => setScript(value)}
            options={[
              { value: 'simplified', label: t('settings.scriptSimplified') },
              { value: 'traditional', label: t('settings.scriptTraditional') },
            ]}
          />
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {t('settings.scriptHint')}
          </p>
        </div>
      </Section>

      <Section title={t('settings.theme')}>
        <div className="py-3">
          <Segmented
            className="w-full"
            value={theme}
            onChange={(value: Theme) => setTheme(value)}
            options={[
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
              { value: 'system', label: t('settings.themeSystem') },
            ]}
          />
        </div>
      </Section>

      <Section title={t('practice.title')}>
        <div className="py-3">
          <p className="mb-2 text-xs font-medium text-ink">{t('settings.defaultMode')}</p>
          <Segmented
            className="w-full"
            value={mode}
            onChange={(value: PracticeMode) => setMode(value)}
            options={[
              { value: 'guided', label: t('practice.guided') },
              { value: 'plain', label: t('practice.plain') },
            ]}
          />
        </div>
        <div className="py-3">
          <p className="mb-2 text-xs font-medium text-ink">{t('settings.grid')}</p>
          <Segmented
            className="w-full"
            value={grid}
            onChange={(value: GridStyle) => setGrid(value)}
            options={[
              { value: 'rice', label: t('practice.gridRice') },
              { value: 'field', label: t('practice.gridField') },
              { value: 'none', label: t('practice.gridNone') },
            ]}
          />
        </div>
        <Toggle checked={hints} onChange={setHints} label={t('settings.hints')} />
        <Toggle checked={sound} onChange={setSound} label={t('settings.sound')} />
      </Section>

      {canInstall ? (
        <Card className="flex items-center gap-3 p-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{t('settings.install')}</p>
            <p className="text-xs leading-relaxed text-muted">{t('settings.installHint')}</p>
          </div>
          <Button size="sm" variant="soft" onClick={() => void prompt()}>
            {t('settings.install')}
          </Button>
        </Card>
      ) : null}

      <Section title={t('settings.offline')}>
        <OfflinePack />
      </Section>

      <Section title={t('settings.data')}>
        <button
          type="button"
          onClick={() => void exportCollections()}
          className="flex w-full items-center gap-3 py-3 text-left"
        >
          <Download className="h-4 w-4 text-muted" />
          <span className="flex-1 text-sm font-medium text-ink">{t('settings.export')}</span>
          <ChevronRight className="h-4 w-4 text-muted/60" />
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center gap-3 py-3 text-left"
        >
          <FileUp className="h-4 w-4 text-muted" />
          <span className="flex-1 text-sm font-medium text-ink">{t('settings.import')}</span>
          <ChevronRight className="h-4 w-4 text-muted/60" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            void handleImport(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(t('settings.clearDataConfirm'))) return
            void clearLocalData().then(() => window.location.reload())
          }}
          className="flex w-full items-center gap-3 py-3 text-left text-danger"
        >
          <Trash2 className="h-4 w-4" />
          <span className="flex-1 text-sm font-medium">{t('settings.clearData')}</span>
        </button>
      </Section>

      <Section title={t('settings.about')}>
        <Link to="/licenses" className="flex items-center gap-3 py-3">
          <Sparkles className="h-4 w-4 text-muted" />
          <span className="flex-1 text-sm font-medium text-ink">{t('settings.licenses')}</span>
          <ChevronRight className="h-4 w-4 text-muted/60" />
        </Link>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 py-3"
        >
          <GithubMark className="h-4 w-4 text-muted" />
          <span className="flex-1 text-sm font-medium text-ink">
            {t('settings.contribute')}
          </span>
          <ExternalLink className="h-4 w-4 text-muted/60" />
        </a>
        <div className="flex items-center gap-3 py-3">
          <Info className="h-4 w-4 text-muted" />
          <span className="flex-1 text-sm font-medium text-ink">{t('settings.version')}</span>
          <Badge tone="neutral">
            <span style={{ textTransform: 'none' }}>{__BUILD_STAMP__}</span>
          </Badge>
        </div>
      </Section>

      <Card className="p-4">
        <p className="text-xs leading-relaxed text-muted">{t('settings.aboutText')}</p>
      </Card>
    </div>
  )
}
