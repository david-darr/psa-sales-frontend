import { useCallback, useRef, useState } from 'react'
import api from '../../lib/api'

const INITIAL = {
  status: 'idle', // idle | loading | done | error
  schools: [],
  location: null,
  radius: null,
  nextToken: null,
  error: '',
  loadingMore: false,
  moreError: '',
  searchId: 0,
}

function merge(existing, incoming) {
  const seen = new Set(existing.map((s) => s.place_id))
  const fresh = incoming.filter((s) => s.place_id && !seen.has(s.place_id))
  return [...existing, ...fresh]
}

function dedupe(list) {
  return merge([], list)
}

/**
 * Owns the result set for /api/find-schools: first page, "load more" via
 * next_page_token (merged and de-duplicated by place_id) and in-place patches
 * so saving a lead never needs a refetch.
 */
export default function useFinderSearch() {
  const [state, setState] = useState(INITIAL)
  const ctl = useRef({ body: null, token: null, abort: null, seq: 0, more: false })

  const search = useCallback(async (body) => {
    const c = ctl.current
    c.abort?.abort()
    const abort = new AbortController()
    c.abort = abort
    c.seq += 1
    const seq = c.seq
    c.body = body
    c.token = null
    c.more = false
    setState((s) => ({
      ...INITIAL,
      status: 'loading',
      searchId: s.searchId,
      location: s.location,
    }))
    try {
      const data = await api.post('/api/find-schools', body, {
        signal: abort.signal,
      })
      if (seq !== c.seq) return false
      c.token = data?.next_page_token || null
      setState((s) => ({
        ...INITIAL,
        status: 'done',
        schools: dedupe(data?.schools || []),
        location: data?.location || null,
        radius: data?.radius_km ?? body.radius_km,
        nextToken: c.token,
        searchId: s.searchId + 1,
      }))
      return true
    } catch (err) {
      if (abort.signal.aborted || seq !== c.seq) return false
      setState((s) => ({
        ...INITIAL,
        status: 'error',
        error: err?.message || 'Could not search for schools.',
        searchId: s.searchId,
      }))
      return false
    }
  }, [])

  const loadMore = useCallback(async () => {
    const c = ctl.current
    if (!c.token || c.more || !c.body) return
    c.more = true
    const seq = c.seq
    setState((s) => ({ ...s, loadingMore: true, moreError: '' }))
    try {
      const data = await api.post(
        '/api/find-schools',
        { ...c.body, page_token: c.token },
        { signal: c.abort?.signal },
      )
      if (seq !== c.seq) return
      c.token = data?.next_page_token || null
      setState((s) => ({
        ...s,
        loadingMore: false,
        schools: merge(s.schools, data?.schools || []),
        nextToken: c.token,
      }))
    } catch (err) {
      if (seq !== c.seq) return
      setState((s) => ({
        ...s,
        loadingMore: false,
        moreError: err?.message || 'Could not load more schools.',
      }))
    } finally {
      if (seq === c.seq) c.more = false
    }
  }, [])

  /** patches: { [place_id]: partial school } merged in place. */
  const patchSchools = useCallback((patches) => {
    setState((s) => ({
      ...s,
      schools: s.schools.map((school) =>
        patches[school.place_id]
          ? { ...school, ...patches[school.place_id] }
          : school,
      ),
    }))
  }, [])

  return { ...state, search, loadMore, patchSchools }
}
