import { useLiveQuery } from 'dexie-react-hooks'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { db, isFavoriteCollection } from '../lib/db'
import { Button, Sheet } from './ui'

export function CollectionNameSheet({
  title,
  description,
  initialName = '',
  submitLabel,
  excludeId,
  onClose,
  onSubmit,
}: {
  title: string
  description?: string
  initialName?: string
  submitLabel: string
  excludeId?: number
  onClose: () => void
  onSubmit: (name: string) => Promise<void> | void
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const collections = useLiveQuery(() => db.collections.toArray(), []) ?? []

  const favoriteLabel = t('collections.favorite').trim().toLocaleLowerCase()
  const nameTaken = (value: string) => {
    const normalized = value.trim().toLocaleLowerCase()
    return collections.some((collection) => {
      if (collection.id === excludeId) return false
      if (collection.name.trim().toLocaleLowerCase() === normalized) return true
      return (
        isFavoriteCollection(collection) && favoriteLabel === normalized
      )
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(t('collections.nameRequired'))
      return
    }
    if (nameTaken(trimmed)) {
      setError(t('collections.nameTaken'))
      return
    }
    try {
      await onSubmit(trimmed)
    } catch {
      setError(t('errors.generic'))
    }
  }

  return (
    <Sheet open onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {description ? (
          <p className="text-xs leading-relaxed text-muted">{description}</p>
        ) : null}
        <input
          autoFocus
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
          placeholder={t('collections.namePlaceholder')}
          aria-label={t('collections.nameLabel')}
          maxLength={40}
          className="h-11 w-full rounded-2xl border border-line bg-surface-2 px-3 text-sm font-medium text-ink outline-none transition placeholder:text-muted/70 focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
        />
        {error ? <p className="text-xs text-danger">{error}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            {submitLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
