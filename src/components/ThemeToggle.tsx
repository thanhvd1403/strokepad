import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useMediaQuery } from '../lib/hooks'
import { useSettings } from '../store/settings'
import { IconButton } from './ui'

export function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useSettings((state) => state.theme)
  const setTheme = useSettings((state) => state.setTheme)
  const systemDark = useMediaQuery('(prefers-color-scheme: dark)')
  const isDark = theme === 'dark' || (theme === 'system' && systemDark)

  return (
    <IconButton
      label={isDark ? t('settings.themeLight') : t('settings.themeDark')}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </IconButton>
  )
}
