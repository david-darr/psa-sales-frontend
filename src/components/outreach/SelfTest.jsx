import { useState } from 'react'
import api from '../../lib/api'
import { toServerTemplate } from '../../emails/constants'

export default function SelfTest({ kind, schoolId, message, editing, onChanged }) {
  const [review, setReview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [batch, setBatch] = useState(null)
  const payload = { kind, school_ids: [schoolId], attachment_ids: message.attachment_ids || [] }
  if (message.template_id) { payload.template_id = message.template_id; payload.template_revision = message.template_revision }
  if (editing) { payload.subject = toServerTemplate(message.subject); payload.body = toServerTemplate(message.body) }
  const key = JSON.stringify(payload)
  const current = review?.key === key ? review : null
  const act = async (send) => {
    setBusy(true); setError('')
    try {
      const result = await api.post(send ? '/api/outreach/test-send' : '/api/outreach/test-preview',
        { ...payload, ...(send ? { preview_token: current.preview_token } : {}) })
      if (send) { setBatch(result.batch_id); setReview(null); onChanged?.() }
      else { setReview({ ...result, key }); setBatch(null) }
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <div className="ou-card ou-card-body" style={{ marginTop: 'var(--space-4)' }}>
    <h3 className="ou-card-title">Send a test to myself</h3>
    <p className="ou-muted">Uses this school as an example. The server sends only to your signed-in mailbox, counts one email against your allowance, and leaves the school history unchanged.</p>
    {current && <div className="ou-mail"><div className="ou-mail-head"><span>To {current.email}</span><strong>{current.subject}</strong></div>
      <div className="ou-mail-body" style={{ whiteSpace: 'pre-wrap' }}>{current.body_text}</div>
      <p className="ou-muted">{current.attachments.join(', ') || 'No attachments'}</p></div>}
    {error && <p role="alert" className="ou-error">{error}</p>}
    {batch && <p role="status">Test queued as batch #{batch}. Check History for the result.</p>}
    <button type="button" className="ou-btn ou-btn-ghost" disabled={busy} onClick={() => act(false)}>Preview test</button>{' '}
    {current && <button type="button" className="ou-btn ou-btn-solid" disabled={busy} onClick={() => act(true)}>{busy ? 'Queuing…' : 'Send this test to my mailbox'}</button>}
  </div>
}
