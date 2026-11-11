import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'

export default function CampaignCreate({ onCreated }) {
  const { user } = useAuth()
  const [draft, setDraft] = useState({ name: '', reason: '', daily_limit: 150 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!user?.admin) return null
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try { onCreated(await api.post('/api/outreach/campaigns', draft)); setDraft({ name: '', reason: '', daily_limit: 150 }) }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <details><summary className="ou-muted">Admin: create a distinct campaign</summary>
    <form onSubmit={save}>
      <p className="ou-muted">A new campaign can allow another intro to a previously contacted mailbox. Record why this is appropriate. Suppression and the recent-contact cooldown still apply.</p>
      <label className="ou-field"><span className="ou-label">Campaign name</span><input className="ou-input" required maxLength={150} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
      <label className="ou-field"><span className="ou-label">Reason for a distinct campaign</span><textarea className="ou-textarea" required minLength={10} maxLength={1000} value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} /></label>
      <label className="ou-field"><span className="ou-label">Per-rep campaign daily cap</span><input className="ou-input" type="number" required min={1} value={draft.daily_limit} onChange={(e) => setDraft({ ...draft, daily_limit: Number(e.target.value) })} /></label>
      {error && <p className="ou-error" role="alert">{error}</p>}
      <button className="ou-btn ou-btn-ghost" disabled={busy}>{busy ? 'Creating...' : 'Create campaign'}</button>
    </form>
  </details>
}
