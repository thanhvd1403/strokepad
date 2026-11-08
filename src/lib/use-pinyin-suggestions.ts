import { useEffect, useState } from 'react'
import type { Entry } from '../types'
import { isPinyinQuery, suggestPinyin } from './pinyin-suggest'

export type PinyinSuggestionStatus = 'idle' | 'loading' | 'done' | 'error'

/**
 * Sentence suggestions for the active pinyin chunk. Runs even when the
 * dictionary has entries: the extra suggestions fill gaps such as words that
 * are in the engine model but not in the bundled word list.
 */
export function usePinyinSuggestions(
  query: string,
  entries: Entry[],
  enabled: boolean,
) {
  const active = enabled && isPinyinQuery(query)
  const [status, setStatus] = useState<PinyinSuggestionStatus>('idle')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!active) {
      // oxlint-disable-next-line react/set-state-in-effect -- resetting an async result
      setStatus('idle')
      // oxlint-disable-next-line react/set-state-in-effect -- resetting an async result
      setSuggestions([])
      return
    }

    let cancelled = false
    // oxlint-disable-next-line react/set-state-in-effect -- resetting an async result
    setStatus('loading')
    // oxlint-disable-next-line react/set-state-in-effect -- resetting an async result
    setSuggestions([])

    const timer = window.setTimeout(() => {
      void suggestPinyin(query, entries)
        .then((list) => {
          if (cancelled) return
          setSuggestions(list)
          setStatus('done')
        })
        .catch(() => {
          if (cancelled) return
          setSuggestions([])
          setStatus('error')
        })
    }, 80)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [active, entries, query, retryToken])

  return {
    active,
    status,
    suggestions,
    retry: () => setRetryToken((value) => value + 1),
  }
}
