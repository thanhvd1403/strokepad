import { useTranslation } from 'react-i18next'
import { clsx } from 'clsx'

const LEVELS = [1, 2, 3, 4, 5, 6, 7]

export function HskFilter({
  selected,
  onChange,
}: {
  selected: number[]
  onChange: (levels: number[]) => void
}) {
  const { t } = useTranslation()
  const all = selected.length === 0

  const toggle = (level: number) => {
    if (selected.includes(level)) {
      onChange(selected.filter((item) => item !== level))
    } else {
      onChange([...selected, level].sort((a, b) => a - b))
    }
  }

  const chipClass = (active: boolean) =>
    clsx(
      'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
      active
        ? 'border-accent bg-accent text-white shadow-sm dark:text-[#1e1e2e]'
        : 'border-line bg-surface text-muted hover:border-accent/40 hover:text-ink',
    )

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1">
      <button type="button" onClick={() => onChange([])} className={chipClass(all)}>
        {t('search.all')}
      </button>
      {LEVELS.map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => toggle(level)}
          className={chipClass(selected.includes(level))}
        >
          {level === 7 ? 'HSK 7–9' : `HSK ${level}`}
        </button>
      ))}
    </div>
  )
}
