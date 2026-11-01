import { Check } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'

export function CharacterStrip({
  characters,
  currentIndex,
  completed,
  onSelect,
}: {
  characters: string[]
  currentIndex: number
  completed: Set<number>
  onSelect: (index: number) => void
}) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    })
  }, [currentIndex])

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-2">
      {characters.map((char, index) => {
        const active = index === currentIndex
        const done = completed.has(index)
        return (
          <button
            key={`${char}-${index}`}
            ref={active ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(index)}
            aria-current={active ? 'step' : undefined}
            aria-label={`${char}${done ? ' ✓' : ''}`}
            className={clsx(
              'relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border text-2xl font-medium transition active:scale-95',
              'hanzi',
              active
                ? 'border-accent bg-accent-soft text-ink shadow-sm'
                : done
                  ? 'border-sage/40 bg-sage-soft/70 text-ink'
                  : 'border-line bg-surface text-muted hover:border-accent/40 hover:text-ink',
            )}
          >
            {char}
            <span
              className={clsx(
                'absolute -bottom-1 -right-1 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full border px-1 text-[9px] font-bold',
                done
                  ? 'border-sage bg-sage text-white dark:text-[#1e1e2e]'
                  : active
                    ? 'border-accent bg-accent text-white dark:text-[#1e1e2e]'
                    : 'border-line bg-surface text-muted',
              )}
            >
              {done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : index + 1}
            </span>
          </button>
        )
      })}
    </div>
  )
}
