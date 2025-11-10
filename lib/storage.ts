import { type ShareRequest, type RequestRecord } from "./record-types"

const KEY_PREFIX = "utilitx:request:"
const STAGED_KEY = "utilitx:staged:records"

export function saveRequest(data: ShareRequest) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY_PREFIX + data.id, JSON.stringify(data))
  } catch (e) {
    console.error("Failed to save request", e)
  }
}

export function loadRequest(id: string): ShareRequest | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(KEY_PREFIX + id)
    if (!raw) return null
    return JSON.parse(raw) as ShareRequest
  } catch (e) {
    console.error("Failed to load request", e)
    return null
  }
}

export function saveStagedRecords(records: RequestRecord[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STAGED_KEY, JSON.stringify(records))
  } catch (e) {
    console.error("Failed to save staged records", e)
  }
}

export function loadStagedRecords(): RequestRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = sessionStorage.getItem(STAGED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as RequestRecord[]
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error("Failed to load staged records", e)
    return []
  }
}

export function clearStagedRecords() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STAGED_KEY)
  } catch (e) {
    console.error("Failed to clear staged records", e)
  }
}
