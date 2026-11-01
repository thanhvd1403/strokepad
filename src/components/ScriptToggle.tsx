import { useTranslation } from 'react-i18next'
import { useSettings } from '../store/settings'
import { IconButton } from './ui'

export function ScriptToggle() {
  const { t } = useTranslation()
  const script = useSettings((state) => state.script)
  const setScript = useSettings((state) => state.setScript)
  const traditional = script === 'traditional'

  return (
    <IconButton
      label={
        traditional
          ? t('settings.switchToSimplified')
          : t('settings.switchToTraditional')
      }
      onClick={() => setScript(traditional ? 'simplified' : 'traditional')}
    >
      <span className="hanzi text-lg font-semibold leading-none">
        {traditional ? '繁' : '简'}
      </span>
    </IconButton>
  )
}
