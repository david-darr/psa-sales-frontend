import { salesText } from '../lib/salesWorkspace'
import { useState } from 'react'
import Modal from './Modal'
import { ErrorNotice } from './WorkspaceUI'
import api from '../lib/api'

export default function AssignmentDialog({ ids, filters, team, onClose, onSaved }) {
  const [target, setTarget] = useState('')
  const [review, setReview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const act = async (commit) => {
    setBusy(true); setError('')
    try {
      if (commit) {
        const result = await api.post(`/api/crm/schools/assignment-reviews/${review.id}/commit`, {})
        onSaved(result)
      } else {
        const selection = ids ? { ids } : { filters }
        setReview(await api.post('/api/crm/schools/assignment-preview', { ...selection, user_id: target === 'unassigned' ? null : Number(target) }))
      }
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <Modal title={salesText("Review school assignment")} onClose={() => !busy && onClose()} footer={<>
    <button className="modern-btn-primary is-neutral" disabled={busy} onClick={() => review ? setReview(null) : onClose()}>{review ? 'Change selection' : 'Cancel'}</button>
    <button className="modern-btn-primary" disabled={busy || !target} onClick={() => act(!!review)}>{busy ? 'Working...' : review ? 'Confirm assignment' : salesText("Preview matching schools")}</button>
  </>}>
    <ErrorNotice error={error} />
    {!review ? <>
      <p>{ids ? `${ids.length} selected schools` : salesText("All schools matching the current filters, including other pages.")}</p>
      {!ids && <dl>{Object.entries(filters).filter(([,value]) => value).map(([key,value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>}
      <label className="workspace-field">New owner<select className="ui-input" value={target} disabled={busy} onChange={(event) => setTarget(event.target.value)}><option value="">Choose an owner</option><option value="unassigned">Unassigned pool</option>{team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
    </> : <>
      <p><strong>{review.total}{salesText(" schools match; ")}{review.changed} will change owner to {review.target_name}.</strong></p>
      <p>Queued outreach will be cancelled and must be reviewed again by the new owner. An email already sending blocks the change. Closing credit and commission history stay unchanged.</p>
      <p>{salesText("Open tasks move to a new rep. When schools are released to the pool, tasks retain their current assignee until a rep claims them.")}</p>
      <h4>Current owners</h4><ul>{Object.entries(review.owners).map(([name,count]) => <li key={name}>{name}: {count}</li>)}</ul>
      <h4>Counties</h4><ul>{Object.entries(review.counties).map(([name,count]) => <li key={name}>{name}: {count}</li>)}</ul>
      <h4>Sample ({review.sample.length} of {review.total})</h4><ul>{review.sample.map((school) => <li key={school.id}>{school.school_name} | {school.owner_name} | {school.county || 'County not recorded'}</li>)}</ul>
      <p>{salesText("The review expires in 15 minutes. A changed owner or matching school list requires a new preview.")}</p>
    </>}
  </Modal>
}
