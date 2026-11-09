import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/api'
import Modal from '../Modal'
import { blockerMeta } from '../../emails/constants'

const statusText = (value) => ({ awaiting: 'Needs your review', approved: 'Approved, waiting for AI', queued: 'Waiting to send', revoked: 'Stopped' }[value] || value)
const when = (value) => new Date(value).toLocaleString()
export default function AgentApprovals() {
  const [page, setPage] = useState(1)
  const [list, setList] = useState({ items: [], total: 0 })
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get('draft') || '')
  const [draft, setDraft] = useState(null)
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [stopConfirm, setStopConfirm] = useState(false)
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
    <div className="ou-callout tone-neutral">AI prepares the emails; you decide whether they can be sent. Open a request, check its recipients and messages, then approve or decline it. The review must be completed within 15 minutes.</div>
    {error && <p className="ou-callout tone-danger" role="alert">{error}</p>}
    <section className="ou-card ou-card-body"><h3 className="ou-card-title">Requests from AI</h3>
      <div className="ou-toolbar"><button className="ou-btn ou-btn-ghost" disabled={busy} onClick={() => load().catch((err) => setError(err.message))}>Refresh requests</button><span>{list.total} requests</span><button className="ou-btn ou-btn-ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><button className="ou-btn ou-btn-ghost" disabled={page * 25 >= list.total} onClick={() => setPage(page + 1)}>Next</button></div>
      {!list.items.length && <p className="ou-muted">No requests yet. Ask your connected AI assistant to prepare outreach, then return here to review it. Connect AI from Account settings if you have not set it up.</p>}
      <div className="ou-toolbar">{list.items.map((item) => <button className={`ou-btn ${selected === item.id ? 'ou-btn-solid' : 'ou-btn-ghost'}`} key={item.id} onClick={() => { setDraft(null); setSelected(item.id) }}>{item.key_name} · {statusText(item.status)} · {when(item.created_at)}</button>)}</div>
    </section>
    {draft && <section className="ou-card ou-card-body"><h3 className="ou-card-title">Review these emails</h3>
      <p>Status: {statusText(draft.status)}{expired ? ' · Approval window expired' : ` · Expires ${when(draft.expires_at)}`} · Revision {draft.revision}</p>
      <p className="ou-muted">{previews.filter((r) => r.eligible).length} eligible / {previews.length} resolved contacts · Campaign: {draft.preview?.campaign?.name || 'Standard outreach'}</p>
      {!draft.key_active && <p className="ou-callout tone-warning">This AI connection is no longer active. Reconnect it and ask AI to prepare a new request.</p>}
      {draft.key_active && !draft.can_execute && <p className="ou-callout tone-warning">This connection can draft emails but cannot queue them. Update its sending permission in Account settings, then prepare a new request.</p>}
      {previews.map((row) => <details key={row.contact_id || row.email} className="ou-card ou-card-body"><summary>{row.email} · {row.school_name} · {row.eligible ? 'Eligible' : 'Will be skipped'}</summary>
        <div className="ou-mail"><div className="ou-mail-head"><strong>{row.subject}</strong></div><div className="ou-mail-body" style={{ whiteSpace: 'pre-wrap' }}>{row.body_text || row.body}</div></div>
        <p className="ou-muted">PDFs: {(row.attachments || []).join(', ') || 'None'}</p>
        {!!row.blockers?.length && <p className="ou-callout tone-warning">{row.blockers.map((key) => blockerMeta(key).tip || blockerMeta(key).label).join(' ')}</p>}
      </details>)}
      {draft.batch_id && <p className="ou-callout tone-neutral">Send #{draft.batch_id} is queued. Track it in Sending progress. You can stop the remaining messages; an email already being sent may finish.</p>}
      {!!draft.events?.length && <details className="ou-card ou-card-body"><summary>Activity and connection details</summary><ul>{draft.events.map((event, i) => <li key={i}>{when(event.created_at)} · {event.event} · Key #{event.key_id}{event.batch_id ? ` · Batch #${event.batch_id}` : ''}{event.approval_id ? ` · Approval ${event.approval_id}` : ''}</li>)}</ul></details>}
      {!draft.batch_id && draft.status !== 'revoked' && <>
        <button className="ou-btn ou-btn-ghost" disabled={busy || !draft.key_active} onClick={() => act('refresh')}>Update this review</button>
        {draft.status === 'awaiting' && <><label className="ou-field"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I checked the recipients, messages and PDFs and approve this request for sending from my mailbox.</label>
          <button className="ou-btn ou-btn-solid" disabled={busy || !ack || expired || !draft.key_active || !draft.can_execute || !previews.some((r) => r.eligible)} onClick={() => act('approve')}>Approve for AI</button></>}
        {draft.status === 'approved' && <p className="ou-callout tone-neutral">Approved. Ask AI to queue this request before the displayed expiry time. This approval covers these emails only, not future follow-ups.</p>}
      </>}
      {draft.status !== 'revoked' && <button className="ou-btn ou-btn-danger" disabled={busy} onClick={() => setStopConfirm(true)}>Stop this request</button>}
    </section>}
    {stopConfirm && <Modal title="Stop this email request?" onClose={() => { if (!busy) setStopConfirm(false) }} footer={<><button className="ou-btn ou-btn-ghost" disabled={busy} onClick={() => setStopConfirm(false)}>Keep request</button><button className="ou-btn ou-btn-danger" disabled={busy} onClick={async () => { await act('revoke'); setStopConfirm(false) }}>Stop request</button></>}><p>This withdraws approval and stops the remaining emails in this request. An email already being sent may finish. Ask AI to prepare a new request if you want to try again.</p></Modal>}
  </div>
}
