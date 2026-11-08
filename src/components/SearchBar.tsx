import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'
import type { RefObject } from 'react'

export function SearchBar({
  value,
  composed = '',
  onChange,
  onSubmit,
  onSpace,
  onNavigate,
  onEscape,
  onDeleteComposed,
  onClear,
  canNavigate = false,
  autoFocus = false,
  className,
  inputRef,
}: {
  value: string
  composed?: string
  onChange: (value: string) => void
  onSubmit?: () => void
  onSpace?: () => void
  onNavigate?: (delta: number) => void
  onEscape?: () => void
  onDeleteComposed?: () => void
  onClear?: () => void
  canNavigate?: boolean
  autoFocus?: boolean
  className?: string
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const { t } = useTranslation()

  const clear = () => {
    if (value) {
      onChange('')
      return
    }
    onClear?.()
  }

  return (
    <form
      className={clsx('relative', className)}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.()
      }}
    >
      <div className="flex min-h-14 w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-3xl border border-line bg-surface px-4 py-2.5 text-base shadow-[var(--shadow)] transition focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/10">
        <Search className="h-5 w-5 shrink-0 text-muted" />
        {composed ? (
          <span className="hanzi min-w-0 break-all text-base font-medium leading-relaxed text-ink">
            {composed}
          </span>
        ) : null}
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSubmit?.()
              return
            }
            if (event.key === ' ' && onSpace) {
              event.preventDefault()
              onSpace()
              return
            }
            if (event.key === 'Escape' && onEscape) {
              event.preventDefault()
              onEscape()
              return
            }
            if (
              event.key === 'Backspace' &&
              !value &&
              composed &&
              onDeleteComposed
            ) {
              event.preventDefault()
              onDeleteComposed()
              return
            }
            if (
              canNavigate &&
              onNavigate &&
              (event.key === 'ArrowDown' || event.key === 'ArrowUp')
            ) {
              event.preventDefault()
              onNavigate(event.key === 'ArrowDown' ? 1 : -1)
            }
          }}
          placeholder={
            composed ? t('search.composePlaceholder') : t('search.placeholder')
          }
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          inputMode="search"
          aria-label={t('search.searchBy')}
          className={clsx(
            'min-w-[4.5rem] flex-1 bg-transparent text-base font-medium text-ink outline-none placeholder:text-muted/70',
            value && 'underline decoration-accent/40 decoration-dotted underline-offset-4',
          )}
        />
        {value || composed ? (
          <button
            type="button"
            aria-label={t('common.clear')}
            onClick={clear}
            className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </form>
  )
}
