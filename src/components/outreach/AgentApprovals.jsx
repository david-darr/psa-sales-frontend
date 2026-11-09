import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'

const when = (value) => new Date(value).toLocaleString()
export default function AgentApprovals() {
  const [page, setPage] = useState(1)
  const [list, setList] = useState({ items: [], total: 0 })
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get('draft') || '')
  const [draft, setDraft] = useState(null)
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const result = await api.get(`/api/agent-outreach-drafts?page=${page}`)
    setList(result)
    if (selected) setDraft(await api.get(`/api/agent-outreach-drafts/${selected}`))
    else if (result.items.length) setSelected(result.items[0].id)
  }, [page, selected])
  useEffect(() => { load().catch((err) => setError(err.message)) }, [load])
  useEffect(() => { setAck(false) }, [draft?.id, draft?.revision])
  const act = async (action) => {
    setBusy(true); setError(''); setAck(false)
    try { await api.post(`/api/agent-outreach-drafts/${draft.id}/${action}`, { revision: draft.revision }); await load() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  const expired = draft && Date.parse(draft.expires_at) <= Date.now()
  const previews = draft?.preview?.previews || []
  return <div className="ou-page">
    <div className="ou-callout tone-neutral">Your agent can prepare work. Only you can approve a specific batch from your mailbox. Approval expires after 15 minutes; sending still follows quotas, inbox checks and stop rules.</div>
    {error && <p className="ou-callout tone-danger" role="alert">{error}</p>}
    <section className="ou-card ou-card-body"><h3 className="ou-card-title">Agent requests</h3>
      <div className="ou-toolbar"><button className="ou-btn ou-btn-ghost" disabled={busy} onClick={() => load().catch((err) => setError(err.message))}>Refresh requests</button><span>{list.total} requests</span><button className="ou-btn ou-btn-ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><button className="ou-btn ou-btn-ghost" disabled={page * 25 >= list.total} onClick={() => setPage(page + 1)}>Next</button></div>
      {!list.items.length && <p className="ou-muted">No requests yet. Give your assistant preparation permission in Settings, then ask it to prepare outreach. Existing keys gain no new permissions.</p>}
      <div className="ou-toolbar">{list.items.map((item) => <button className={`ou-btn ${selected === item.id ? 'ou-btn-solid' : 'ou-btn-ghost'}`} key={item.id} onClick={() => { setDraft(null); setSelected(item.id) }}>{item.key_name} · {item.status} · {when(item.created_at)}</button>)}</div>
    </section>
    {draft && <section className="ou-card ou-card-body"><h3 className="ou-card-title">Review {draft.key_name}&apos;s batch</h3>
      <p>Status: {draft.status}{expired ? ' · Approval window expired' : ` · Expires ${when(draft.expires_at)}`} · Revision {draft.revision}</p>
      <p className="ou-muted">{previews.filter((r) => r.eligible).length} eligible / {previews.length} resolved contacts · Campaign: {draft.preview?.campaign?.name || 'Standard outreach'}</p>
      {!draft.key_active && <p className="ou-callout tone-warning">The preparing key is expired or revoked. It cannot execute this request.</p>}
      {draft.key_active && !draft.can_execute && <p className="ou-callout tone-warning">This key can prepare only. To execute, create a key with both preparation and approved-send permissions and prepare a new request.</p>}
      {previews.map((row) => <details key={row.contact_id || row.email} className="ou-card ou-card-body"><summary>{row.email} · {row.school_name} · {row.eligible ? 'Eligible' : 'Will be skipped'}</summary>
        <div className="ou-mail"><div className="ou-mail-head"><strong>{row.subject}</strong></div><div className="ou-mail-body" style={{ whiteSpace: 'pre-wrap' }}>{row.body_text || row.body}</div></div>
        <p className="ou-muted">PDFs: {(row.attachments || []).join(', ') || 'None'}</p>
        {!!row.blockers?.length && <p className="ou-callout tone-warning">{row.blockers.join(', ')}</p>}
      </details>)}
      {draft.batch_id && <p className="ou-callout tone-neutral">Queued batch #{draft.batch_id}. The separate worker handles dispatch; revocation blocks remaining messages at the next send check. A message already in SMTP may finish.</p>}
      {!!draft.events?.length && <details className="ou-card ou-card-body"><summary>Recent request audit</summary><ul>{draft.events.map((event, i) => <li key={i}>{when(event.created_at)} · {event.event} · Key #{event.key_id}{event.batch_id ? ` · Batch #${event.batch_id}` : ''}{event.approval_id ? ` · Approval ${event.approval_id}` : ''}</li>)}</ul></details>}
      {!draft.batch_id && draft.status !== 'revoked' && <>
        <button className="ou-btn ou-btn-ghost" disabled={busy || !draft.key_active} onClick={() => act('refresh')}>Refresh recipients and message review</button>
        {draft.status === 'awaiting' && <><label className="ou-field"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I reviewed the recipients, exact messages and PDFs, and authorize this key to queue this batch from my mailbox.</label>
          <button className="ou-btn ou-btn-solid" disabled={busy || !ack || expired || !draft.key_active || !draft.can_execute || !previews.some((r) => r.eligible)} onClick={() => act('approve')}>Approve this batch for my agent</button></>}
        {draft.status === 'approved' && <p className="ou-callout tone-neutral">Approved. Your agent must execute this draft before expiry. This page does not send it or enroll recipients in a sequence.</p>}
      </>}
      {draft.status !== 'revoked' && <button className="ou-btn ou-btn-danger" disabled={busy} onClick={() => act('revoke')}>Revoke this request</button>}
    </section>}
  </div>
}
