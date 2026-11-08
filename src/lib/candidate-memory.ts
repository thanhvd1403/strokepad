import { normalizePinyinInput } from './pinyin-text'

const STORAGE_KEY = 'hanzi-candidate-memory'
const MAX_ENTRIES = 200

export type CandidateMemory = Record<string, string>

export function readCandidateMemory(): CandidateMemory {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}')
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => {
        return typeof entry[1] === 'string'
      }),
    )
  } catch {
    return {}
  }
}

export function writeCandidateMemory(memory: CandidateMemory) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
  } catch {
    // Storage can be unavailable in private modes; memory still works this session.
  }
}

export function rememberCandidate(
  memory: CandidateMemory,
  chunk: string,
  text: string,
): CandidateMemory {
  const key = normalizePinyinInput(chunk)
  if (!key || !text) return memory

  const next = Object.fromEntries(
    Object.entries({ ...memory, [key]: text }).slice(-MAX_ENTRIES),
  )
  writeCandidateMemory(next)
  return next
}
