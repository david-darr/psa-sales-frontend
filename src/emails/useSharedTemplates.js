import { useEffect, useState } from 'react'
import api from '../lib/api'

export function useSharedTemplates(includeArchived = false) {
  const [state, setState] = useState({ items: [], loading: true, error: '' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let alive = true
    api.get(`/api/outreach/templates${includeArchived ? '?include_archived=1' : ''}`)
      .then((data) => alive && setState({ items: data.items, loading: false, error: '' }))
      .catch((error) => alive && setState({ items: [], loading: false, error: error.message }))
    return () => { alive = false }
  }, [includeArchived, revision])
  return { ...state, reload: () => setRevision((value) => value + 1) }
}
