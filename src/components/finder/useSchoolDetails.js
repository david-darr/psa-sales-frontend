import { useEffect, useState } from 'react'
import api from '../../lib/api'

const MAX_BATCH = 20
const DEBOUNCE_MS = 250

// Survives navigation inside the session so revisiting a search is instant.
const cache = new Map()

function createEngine(notify) {
  const pending = new Set()
  const inflight = new Set()
  const failed = new Set()
  let timer = 0
  let disposed = false

  async function flush() {
    timer = 0
    const ids = [...pending].slice(0, MAX_BATCH)
    ids.forEach((id) => {
      pending.delete(id)
      inflight.add(id)
    })
    if (!ids.length) return
    try {
      const data = await api.post('/api/find-schools/details', {
        place_ids: ids,
      })
      ids.forEach((id) => cache.set(id, data?.details?.[id] || {}))
    } catch {
      ids.forEach((id) => failed.add(id))
    } finally {
      ids.forEach((id) => inflight.delete(id))
      if (!disposed) {
        notify()
        if (pending.size) schedule()
      }
    }
  }

  function schedule() {
    if (!timer) timer = setTimeout(flush, DEBOUNCE_MS)
  }

  return {
    request(id) {
      if (!id || cache.has(id) || inflight.has(id) || failed.has(id)) return
      pending.add(id)
      schedule()
    },
    get(id) {
      if (cache.has(id)) return cache.get(id)
      if (failed.has(id)) return {}
      return undefined
    },
    revive() {
      disposed = false
    },
    dispose() {
      disposed = true
      clearTimeout(timer)
      timer = 0
    },
  }
}

/**
 * Lazy place details (phone, website, hours) for rows as they scroll into
 * view. Requests are debounced and sent in batches of at most 20.
 */
export default function useSchoolDetails() {
  const [, setTick] = useState(0)
  const [engine] = useState(() => createEngine(() => setTick((n) => n + 1)))
  useEffect(() => {
    engine.revive()
    return () => engine.dispose()
  }, [engine])
  return engine
}
