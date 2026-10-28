import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounced } from '../lib/crm'
import { BATCH_ACTIVE, toServerTemplate } from './constants'
import { outreachApi } from './outreachApi'

/** Daily limit and mailbox state. `reload` after anything that sends. */
export function useLimits() {
  const [state, setState] = useState({ limits: null, error: '' })
  const reload = useCallback(async () => {
    try {
      const limits = await outreachApi.limits()
      setState({ limits, error: '' })
    } catch (err) {
      setState((current) => ({
        limits: current.limits,
        error: err.message || 'Could not load your sending limit.',
      }))
    }
  }, [])
  useEffect(() => {
    reload()
  }, [reload])
  return { ...state, reload }
}

/** One page of recipients for the table. */
export function useRecipients({ kind, q, stage, page, perPage = 50, rev }) {
  const [state, setState] = useState({
    items: [],
    total: 0,
    loading: true,
    error: '',
  })
  useEffect(() => {
    let alive = true
    setState((current) => ({ ...current, loading: true, error: '' }))
    outreachApi
      .recipients({ kind, q, stage, scope: 'mine', page, per_page: perPage })
      .then((data) => {
        if (!alive) return
        const items = data.items || []
        setState({ items, total: data.total ?? items.length, loading: false, error: '' })
      })
      .catch((err) => {
        if (!alive) return
        setState((current) => ({
          ...current,
          items: [],
          loading: false,
          error: err.message || 'Could not load recipients.',
        }))
      })
    return () => {
      alive = false
    }
  }, [kind, q, stage, page, perPage, rev])
  return state
}

const PREVIEW_CAP = 100

/**
 * Rendered previews for the selected schools. Subject and body edits are
 * debounced so typing does not hammer the endpoint.
 */
export function usePreviews({ ids, kind, custom, subject, body, attachments, enabled }) {
  const [state, setState] = useState({
    previews: [],
    token: null,
    loading: false,
    error: '',
    truncated: false,
  })
  const request = JSON.stringify({
    ids: ids.slice(0, PREVIEW_CAP),
    total: ids.length,
    kind,
    subject: custom ? subject : null,
    body: custom ? body : null,
    attachments,
  })
  const settled = useDebounced(request, 450)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const req = JSON.parse(settled)
    if (!req.ids.length) return
    let alive = true
    setState((current) => ({ ...current, loading: true, error: '' }))
    const payload = { school_ids: req.ids, kind: req.kind }
    if (req.subject !== null) payload.subject = toServerTemplate(req.subject)
    if (req.body !== null) payload.body = toServerTemplate(req.body)
    if (req.attachments) payload.attachments = true
    outreachApi
      .preview(payload)
      .then((data) => {
        if (!alive) return
        setState({
          previews: data.previews || [],
          token: data.preview_token || null,
          loading: false,
          error: '',
          truncated: req.total > PREVIEW_CAP,
        })
      })
      .catch((err) => {
        if (!alive) return
        setState((current) => ({
          ...current,
          loading: false,
          error: err.message || 'Could not build the preview.',
        }))
      })
    return () => {
      alive = false
    }
  }, [settled, enabled, retry])

  const stale = request !== settled
  return {
    ...state,
    loading: state.loading || (enabled && stale),
    reload: () => setRetry((n) => n + 1),
  }
}

/**
 * Poll one batch about every 1.5s while it is queued or sending, and expose
 * cancel/retry. Polling stops on any other status and resumes after an action.
 */
export function useBatchPoll(batchId, onSettled) {
  const [batch, setBatch] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [run, setRun] = useState(0)
  const settledRef = useRef(onSettled)
  useEffect(() => {
    settledRef.current = onSettled
  })

  useEffect(() => {
    if (!batchId) return
    let alive = true
    let timer
    let failures = 0
    const tick = async () => {
      try {
        const next = await outreachApi.batch(batchId)
        if (!alive) return
        failures = 0
        setError('')
        setBatch(next)
        if (BATCH_ACTIVE.includes(next.status)) timer = setTimeout(tick, 1500)
        else settledRef.current?.(next)
      } catch (err) {
        if (!alive) return
        failures += 1
        setError(err.message || 'Lost contact with the server.')
        if (failures < 5) timer = setTimeout(tick, 3000)
      }
    }
    tick()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [batchId, run])

  const act = useCallback(
    async (action) => {
      setBusy(true)
      try {
        const next = await action(batchId)
        setBatch(next)
        setError('')
        setRun((n) => n + 1)
      } catch (err) {
        setError(err.message || 'That did not work. Try again.')
      } finally {
        setBusy(false)
      }
    },
    [batchId],
  )

  return {
    batch: batch && batch.id === batchId ? batch : null,
    error,
    busy,
    cancel: () => act(outreachApi.cancelBatch),
    retry: () => act(outreachApi.retryBatch),
  }
}

/** Recent batches, used to resume tracking and for the History tab. */
export function useBatchList(limit = 10, rev = 0) {
  const [state, setState] = useState({ items: [], loading: true, error: '' })
  useEffect(() => {
    let alive = true
    outreachApi
      .batches(limit)
      .then((data) => {
        if (alive) setState({ items: data.items || [], loading: false, error: '' })
      })
      .catch((err) => {
        if (alive)
          setState({
            items: [],
            loading: false,
            error: err.message || 'Could not load recent batches.',
          })
      })
    return () => {
      alive = false
    }
  }, [limit, rev])
  return state
}
