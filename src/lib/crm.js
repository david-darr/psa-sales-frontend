import { useCallback, useEffect, useState } from 'react'
import api from './api'

export const STAGES = [
  { id: 'pending', label: 'New lead', color: '#a1a1aa' },
  { id: 'contacted', label: 'Contacted', color: '#7aa2ff' },
  { id: 'replied', label: 'In conversation', color: '#b794f6' },
  { id: 'meeting', label: 'Meeting', color: '#f5b84a' },
  { id: 'partner', label: 'Active client', color: '#3ecf8e' },
  { id: 'former', label: 'Former client', color: '#8b8b94' },
  { id: 'not_interested', label: 'Closed', color: '#ff5d6c' },
]

export const stageLabel = (id) =>
  STAGES.find((stage) => stage.id === id)?.label || id
export const stageColor = (id) =>
  STAGES.find((stage) => stage.id === id)?.color || '#8b8b94'
export const initials = (name) =>
  (name || '')
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
export const dateObject = (value) =>
  value
    ? new Date(/(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`)
    : null
export const dateLabel = (value) =>
  dateObject(value)?.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  }) || 'No date'
// Tasks and next actions use a calendar date selected by the employee.
export const dueLabel = (value) =>
  value
    ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : 'No due date'
export const isOverdue = (value) =>
  Boolean(value && value.slice(0, 10) < localToday())
export const localToday = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// Last response per request path for this signed-in session. Revisiting a tab shows
// it straight away while a fresh copy loads in the background.
const resourceCache = new Map()
const CACHE_LIMIT = 80

export function clearResourceCache() {
  resourceCache.clear()
}

export function useResource(path) {
  const requestPath = path?.startsWith('/api/crm/')
    ? `${path}${path.includes('?') ? '&' : '?'}today=${localToday()}`
    : path
  const [data, setData] = useState(() =>
    requestPath ? (resourceCache.get(requestPath) ?? null) : null,
  )
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(
    Boolean(requestPath) && !resourceCache.has(requestPath),
  )
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    if (!requestPath) return
    const controller = new AbortController()
    let active = true
    const cached = resourceCache.has(requestPath)
    if (cached) setData(resourceCache.get(requestPath))
    // Only show a loading state when there is nothing to show yet.
    setLoading(!cached)
    setError('')
    api
      .get(requestPath, { signal: controller.signal })
      .then((value) => {
        resourceCache.delete(requestPath)
        resourceCache.set(requestPath, value)
        if (resourceCache.size > CACHE_LIMIT)
          resourceCache.delete(resourceCache.keys().next().value)
        if (active) setData(value)
      })
      .catch((err) => {
        if (active && err.name !== 'AbortError')
          setError(err.message || 'Could not load this view.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [requestPath, revision])
  return { data, error, loading, reload }
}

// Refetch on an interval while the tab is visible, and when it becomes visible again,
// so edits made in Taskbar or by teammates appear without a manual refresh.
export function useAutoRefresh(reload, intervalMs = 30000, paused = false) {
  useEffect(() => {
    if (paused) return
    const tick = () => {
      if (document.visibilityState === 'visible') reload()
    }
    const timer = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [reload, intervalMs, paused])
}
