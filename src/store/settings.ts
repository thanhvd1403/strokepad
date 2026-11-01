import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import i18n from '../i18n'
import type { GridStyle, Language, PracticeMode, Theme } from '../types'

interface SettingsState {
  language: Language
  theme: Theme
  mode: PracticeMode
  grid: GridStyle
  showOutline: boolean
  showNumbers: boolean
  hints: boolean
  autoAdvance: boolean
  sound: boolean
  leniency: number
  hintAfter: number
  setLanguage: (language: Language) => void
  setTheme: (theme: Theme) => void
  setMode: (mode: PracticeMode) => void
  setGrid: (grid: GridStyle) => void
  setShowOutline: (value: boolean) => void
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
      theme: 'system',
      mode: 'guided',
      grid: 'rice',
      showOutline: true,
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
      setTheme: (theme) => set({ theme }),
      setMode: (mode) => set({ mode }),
      setGrid: (grid) => set({ grid }),
      setShowOutline: (showOutline) => set({ showOutline }),
      setShowNumbers: (showNumbers) => set({ showNumbers }),
      setHints: (hints) => set({ hints }),
      setAutoAdvance: (autoAdvance) => set({ autoAdvance }),
      setSound: (sound) => set({ sound }),
      setLeniency: (leniency) => set({ leniency }),
      setHintAfter: (hintAfter) => set({ hintAfter }),
    }),
    {
      name: 'hanzi-settings',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
