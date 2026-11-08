import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import i18n from '../i18n'
import type { GhostMode, GridStyle, Language, Script, Theme } from '../types'

interface SettingsState {
  language: Language
  script: Script
  theme: Theme
  ghost: GhostMode
  grid: GridStyle
  blendOutline: boolean
  showNumbers: boolean
  hints: boolean
  autoAdvance: boolean
  sound: boolean
  leniency: number
  hintAfter: number
  setLanguage: (language: Language) => void
  setScript: (script: Script) => void
  setTheme: (theme: Theme) => void
  setGhost: (ghost: GhostMode) => void
  setGrid: (grid: GridStyle) => void
  setBlendOutline: (value: boolean) => void
  setShowNumbers: (value: boolean) => void
  setHints: (value: boolean) => void
  setAutoAdvance: (value: boolean) => void
  setSound: (value: boolean) => void
  setLeniency: (value: number) => void
  setHintAfter: (value: number) => void
}

const browserLanguage: Language =
  typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('vi')
    ? 'vi'
    : 'en'

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: browserLanguage,
      script: 'simplified',
      theme: 'system',
      ghost: 'full',
      grid: 'rice',
      blendOutline: false,
      showNumbers: false,
      hints: true,
      autoAdvance: false,
      sound: true,
      leniency: 1.2,
      hintAfter: 2,
      setLanguage: (language) => {
        window.localStorage.setItem('hanzi-language', language)
        void i18n.changeLanguage(language)
        set({ language })
      },
      setScript: (script) => set({ script }),
      setTheme: (theme) => set({ theme }),
      setGhost: (ghost) => set({ ghost }),
      setGrid: (grid) => set({ grid }),
      setBlendOutline: (blendOutline) => set({ blendOutline }),
      setShowNumbers: (showNumbers) => set({ showNumbers }),
      setHints: (hints) => set({ hints }),
      setAutoAdvance: (autoAdvance) => set({ autoAdvance }),
      setSound: (sound) => set({ sound }),
      setLeniency: (leniency) => set({ leniency }),
      setHintAfter: (hintAfter) => set({ hintAfter }),
    }),
    {
      // Historical key, kept so existing settings survive the Strokepad
      // rename.
      name: 'hanzi-settings',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState, version) => {
        // v1 stored a guided/plain mode plus a separate outline toggle. The
        // guided/plain choice now lives in the three ghost modes.
        if (version >= 2) return persistedState as SettingsState
        const old = persistedState as Partial<SettingsState> & {
          mode?: 'guided' | 'plain'
          showOutline?: boolean
        }
        const { mode, showOutline, ...rest } = old
        return {
          ...rest,
          ghost: mode === 'plain' || showOutline === false ? 'off' : 'full',
        } as SettingsState
      },
    },
  ),
)
