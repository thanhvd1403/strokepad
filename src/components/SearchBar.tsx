import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'

export function SearchBar({
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  className,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  autoFocus?: boolean
  className?: string
}) {
  const { t } = useTranslation()

  return (
    <form
      className={clsx('relative', className)}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.()
      }}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('search.placeholder')}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="search"
        inputMode="search"
        aria-label={t('search.searchBy')}
        className="h-14 w-full rounded-3xl border border-line bg-surface pl-12 pr-12 text-base font-medium text-ink shadow-[var(--shadow)] outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
      />
      {value ? (
        <button
          type="button"
          aria-label={t('common.clear')}
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </form>
  )
}
