import { clsx } from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { MouseEvent } from 'react'
import { getFavorite, toggleFavorite } from '../lib/db'
import type { FavoriteType } from '../types'

export function FavoriteButton({
  type,
  text,
  pinyin,
  meaning,
  size = 'md',
  className,
}: {
  type: FavoriteType
  text: string
  pinyin?: string
  meaning?: string
  size?: 'sm' | 'md'
  className?: string
}) {
  const { t } = useTranslation()
  const favorite = useLiveQuery(() => getFavorite(type, text), [type, text])
  const active = Boolean(favorite)

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    await toggleFavorite({ type, text, pinyin, meaning })
  }

  return (
    <button
      type="button"
      aria-label={active ? t('common.unfavorite') : t('common.favorite')}
      aria-pressed={active}
      onClick={handleClick}
      className={clsx(
        'grid shrink-0 place-items-center rounded-full transition active:scale-90',
        active ? 'text-butter' : 'text-muted hover:text-butter',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        className,
      )}
    >
      <Star
        className={clsx(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', active && 'fill-current')}
        strokeWidth={active ? 2.2 : 1.9}
      />
    </button>
  )
}
