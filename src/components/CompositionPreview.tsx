import { PenLine } from 'lucide-react'
import { pinyin } from 'pinyin-pro'
import { useTranslation } from 'react-i18next'
import { practiceCharacters } from '../lib/search'
import { CollectionButton } from './CollectionButton'
import { FavoriteButton } from './FavoriteButton'
import { Badge, Button, Card } from './ui'

export function CompositionPreview({
  text,
  onPractice,
}: {
  text: string
  onPractice: () => void
}) {
  const { t } = useTranslation()
  const count = practiceCharacters(text).length
  const reading = pinyin(text, { toneType: 'symbol' })

  return (
    <Card className="overflow-hidden p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge tone="lavender">
          <PenLine className="h-3 w-3" />
          {t('search.practiceYourText')}
        </Badge>
        <div className="flex items-center">
          <FavoriteButton
            type="sentence"
            text={text}
            pinyin={reading}
            meaning={text}
            size="sm"
          />
          <CollectionButton
            type="sentence"
            text={text}
            pinyin={reading}
            meaning={text}
            size="sm"
          />
        </div>
      </div>
      <p className="hanzi text-2xl font-medium leading-relaxed text-ink">{text}</p>
      <p className="mt-1 text-xs text-accent">{reading}</p>
      <p className="mt-1 text-[11px] text-muted">
        {t('search.textCharacters', { count })} · {t('search.practiceTextHint')}
      </p>
      <Button className="mt-3 w-full" variant="soft" onClick={onPractice}>
        <PenLine className="h-4 w-4" />
        {t('search.practiceText')}
      </Button>
      <p className="mt-2 text-center text-xs leading-relaxed text-muted">
        {t('search.previewEnter')}
      </p>
    </Card>
  )
}
