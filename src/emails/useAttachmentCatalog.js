import { useEffect, useState } from 'react'
import api from '../lib/api'

export function useAttachmentCatalog() {
  const [state, setState] = useState({ items: [], available: [], loading: true, error: '' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    api.get('/api/outreach/template-assets')
      .then((data) => active && setState({ items: data.saved || [], available: data.items || [], loading: false, error: '' }))
      .catch((error) => active && setState((current) => ({ ...current, loading: false, error: error.message })))
    return () => { active = false }
  }, [revision])
  return { ...state, reload: () => setRevision((n) => n + 1) }
}

export async function downloadCatalogPdf(asset) {
  const blob = await api.get(`/api/outreach/template-assets/${asset.id}`, { responseType: 'blob' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = asset.name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
