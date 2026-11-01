import { Languages } from 'lucide-react'
import { useSettings } from '../store/settings'
import { IconButton } from './ui'

export function LanguageToggle() {
  const language = useSettings((state) => state.language)
  const setLanguage = useSettings((state) => state.setLanguage)

  return (
    <IconButton
      label={`${language.toUpperCase()} — ${
        language === 'en' ? 'Chuyển sang tiếng Việt' : 'Switch to English'
      }`}
      onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
      className="relative"
    >
      <Languages className="h-5 w-5" />
      <span className="absolute -bottom-0.5 right-0.5 rounded-md bg-surface px-1 text-[9px] font-bold uppercase text-muted">
        {language}
      </span>
    </IconButton>
  )
}
