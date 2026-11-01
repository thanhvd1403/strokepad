import {
  ChevronRight,
  Download,
  FileUp,
  Info,
  Smartphone,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Segmented, Toggle } from '../components/ui'
import { clearLocalData, exportFavorites, importFavorites } from '../lib/db'
import { useInstallPrompt } from '../lib/hooks'
import { useSettings } from '../store/settings'
import type { GridStyle, Language, PracticeMode, Script, Theme } from '../types'

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
      await importFavorites(file)
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

      <Section title={t('settings.data')}>
        <button
          type="button"
          onClick={() => void exportFavorites()}
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
        <div className="flex items-center gap-3 py-3">
          <Info className="h-4 w-4 text-muted" />
          <span className="flex-1 text-sm font-medium text-ink">{t('settings.version')}</span>
          <Badge tone="neutral">v0.1.0</Badge>
        </div>
      </Section>

      <Card className="p-4">
        <p className="text-xs leading-relaxed text-muted">{t('settings.aboutText')}</p>
      </Card>
    </div>
  )
}
