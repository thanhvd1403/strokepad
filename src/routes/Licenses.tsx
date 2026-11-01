import { ExternalLink, FileText, Scale } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Card } from '../components/ui'

function SourceCard({
  title,
  license,
  body,
  links,
}: {
  title: string
  license: string
  body: string
  links?: { label: string; href: string }[]
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{body}</p>
        </div>
        <Badge tone="neutral" className="shrink-0">
          {license}
        </Badge>
      </div>
      {links?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted transition hover:text-ink"
            >
              {link.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      ) : null}
    </Card>
  )
}

export function Licenses() {
  const { t } = useTranslation()

  return (
    <div className="animate-fade-up space-y-4">
      <header className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          {t('settings.about')}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
          {t('licenses.title')}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">{t('licenses.intro')}</p>
      </header>

      <SourceCard
        title={t('licenses.strokes')}
        license="Arphic PL"
        body={t('licenses.strokesBody')}
        links={[
          { label: 'Make Me a Hanzi', href: 'https://github.com/skishore/makemeahanzi' },
          { label: 'hanzi-writer-data', href: 'https://github.com/chanind/hanzi-writer-data' },
          { label: t('licenses.viewLicense'), href: '/licenses/ARPHICPL.TXT' },
        ]}
      />

      <SourceCard
        title={t('licenses.dictionaryEn')}
        license="CC BY-SA 4.0"
        body={t('licenses.dictionaryEnBody')}
        links={[
          { label: 'CC-CEDICT', href: 'https://www.mdbg.net/chinese/dictionary?page=cedict' },
          {
            label: t('licenses.dataLicense'),
            href: 'https://creativecommons.org/licenses/by-sa/4.0/',
          },
        ]}
      />

      <SourceCard
        title={t('licenses.dictionaryVi')}
        license="CC BY-SA 4.0"
        body={t('licenses.dictionaryViBody')}
        links={[
          { label: 'CVDICT', href: 'https://github.com/ph0ngp/CVDICT' },
          {
            label: t('licenses.dataLicense'),
            href: 'https://creativecommons.org/licenses/by-sa/4.0/',
          },
        ]}
      />

      <SourceCard
        title={t('licenses.hsk')}
        license="MIT"
        body={t('licenses.hskBody')}
        links={[
          { label: 'elkmovie/hsk30', href: 'https://github.com/elkmovie/hsk30' },
          { label: 'ivankra/hsk30', href: 'https://github.com/ivankra/hsk30' },
        ]}
      />

      <SourceCard
        title={t('licenses.frequency')}
        license="CC BY-SA 4.0"
        body={t('licenses.frequencyBody')}
        links={[
          {
            label: 'FrequencyWords',
            href: 'https://github.com/hermitdave/FrequencyWords',
          },
        ]}
      />

      <SourceCard
        title={t('licenses.code')}
        license="MIT"
        body={t('licenses.codeBody')}
        links={[
          { label: 'Hanzi Writer', href: 'https://github.com/chanind/hanzi-writer' },
          { label: 'pinyin-pro', href: 'https://github.com/zh-lx/pinyin-pro' },
        ]}
      />

      <Card className="flex items-start gap-3 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lavender-soft text-lavender">
          <Scale className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{t('licenses.appLicense')}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {t('licenses.appLicenseBody')}
          </p>
        </div>
      </Card>

      <Card className="flex items-start gap-3 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{t('licenses.arphic')}</p>
          <a
            href="/licenses/ARPHICPL.TXT"
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
          >
            {t('licenses.viewLicense')}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Card>

      <Card className="flex items-start gap-3 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{t('licenses.dataLicense')}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {t('licenses.dataLicenseBody')}
          </p>
          <a
            href="/licenses/DATA-LICENSE.txt"
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
          >
            {t('licenses.viewDataLicense')}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Card>
    </div>
  )
}
