import { useState } from 'react'
import api from '../lib/api'
import Modal from './Modal'
import { ErrorNotice } from './WorkspaceUI'

export default function ContactReport({ contact, onClose, onSaved }) {
  const [kind, setKind] = useState('optout')
  const [detail, setDetail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await api.post(`/api/contacts/${contact.contact_id}/report`, { kind, detail }); onSaved(); onClose() }
    catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <Modal title="Report a contact signal" onClose={onClose}
    footer={<><button className="modern-btn-primary is-neutral" onClick={onClose} disabled={busy}>Cancel</button><button className="modern-btn-primary" form="contact-report" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Suppress and pause outreach'}</button></>}>
    <form className="workspace-form" id="contact-report" onSubmit={submit}>
      <ErrorNotice error={error} />
      <p>{contact.email}</p>
      <label className="workspace-field">What happened?<select className="ui-input" value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="optout">They asked us to stop contacting them</option><option value="complaint">They reported a complaint</option><option value="review">Unclear response; stop for review</option>
      </select></label>
      <label className="workspace-field">Source and details<textarea className="ui-textarea" minLength={10} maxLength={1000} required value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Summarize what they said and where you received it." /></label>
      <p className="workspace-subtle">This suppresses the mailbox across its linked schools and pauses affected batches. A message already being sent may still finish. Only an admin can clear suppression after reviewing the source.</p>
    </form>
  </Modal>
}
