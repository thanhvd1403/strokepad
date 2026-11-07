import { clsx } from 'clsx'
import { X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={clsx(
        'rounded-3xl border border-line bg-surface shadow-[var(--shadow)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

type ButtonVariant = 'primary' | 'soft' | 'ghost' | 'outline' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white shadow-sm hover:brightness-105 active:scale-[0.98] dark:text-[#1e1e2e]',
  soft: 'bg-accent-soft text-ink hover:brightness-[1.02] active:scale-[0.98]',
  ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-ink',
  outline: 'border border-line bg-transparent text-ink hover:bg-surface-2',
  danger: 'bg-danger-soft text-danger hover:brightness-[1.02] active:scale-[0.98]',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-xl px-3 text-xs font-semibold',
  md: 'h-11 rounded-2xl px-4 text-sm font-semibold',
  lg: 'h-[3.25rem] rounded-2xl px-6 text-base font-semibold',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center justify-center gap-2 transition disabled:pointer-events-none disabled:opacity-45',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  )
}

export function IconButton({
  className,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'inline-grid h-10 w-10 place-items-center rounded-2xl text-muted transition hover:bg-surface-2 hover:text-ink active:scale-95',
        className,
      )}
      {...props}
    />
  )
}

type BadgeTone = 'neutral' | 'accent' | 'sage' | 'butter' | 'lavender' | 'danger'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent-soft text-accent',
  sage: 'bg-sage-soft text-sage',
  butter: 'bg-butter-soft text-butter',
  lavender: 'bg-lavender-soft text-lavender',
  danger: 'bg-danger-soft text-danger',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      className={clsx(
        'inline-flex rounded-2xl border border-line bg-surface-2 p-1',
        className,
      )}
      role="tablist"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
          className={clsx(
            'flex-1 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition',
            value === option.value
              ? 'bg-surface text-ink shadow-sm'
              : 'text-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-6 w-11 shrink-0 rounded-full border transition',
          checked
            ? 'border-accent bg-accent'
            : 'border-line bg-surface-2',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 h-[1.125rem] w-[1.125rem] rounded-full bg-white shadow-sm transition-all',
            checked ? 'left-[calc(100%-1.25rem)]' : 'left-0.5',
          )}
        />
      </button>
    </label>
  )
}

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-fade-up relative z-10 max-h-[88dvh] w-full overflow-y-auto rounded-t-[2rem] border border-line bg-surface p-5 pb-safe shadow-2xl sm:max-w-lg sm:rounded-[2rem]"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      {icon ? (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-muted">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        {description ? (
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
