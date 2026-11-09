import { useEffect, useState } from 'react'
import api from '../../lib/api'
import PreviewPane from './PreviewPane'

export default function RetryReview({ batchId, include, onApprove, onClose, busy }) {
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const [ack, setAck] = useState(false)
  useEffect(() => {
    let active = true
    api.post(`/api/outreach/batches/${batchId}/retry-preview`, { include_unconfirmed: include })
      .then((data) => active && setReview(data)).catch((err) => active && setError(err.message))
    return () => { active = false }
  }, [batchId, include])
  return <section className="ou-card ou-card-body" aria-label="Review remaining messages">
    <h3 className="ou-card-title">Review remaining messages</h3>
    {error && <p role="alert" className="ou-error">{error}</p>}
    <PreviewPane previews={review?.previews || []} loading={!review && !error} />
    {include && <label className="ou-field"><input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} /> I checked Sent mail and want to resend the unconfirmed messages. They may already have arrived.</label>}
    <button type="button" className="ou-btn ou-btn-solid" disabled={busy || !review?.previews.length || (include && !ack)}
      onClick={() => onApprove({ preview_token: review.preview_token, include_unconfirmed: include })}>Approve these messages</button>{' '}
    <button type="button" className="ou-btn ou-btn-ghost" onClick={onClose}>Close review</button>
  </section>
}
