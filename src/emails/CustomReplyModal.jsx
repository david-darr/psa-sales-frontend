import { useRef, useState } from 'react'
import Modal from '../components/Modal'
import { UI_PREVIEW } from '../lib/previewMode'
import MarkupToolbar from './MarkupToolbar'
import api from '../lib/api'

/** Review a reply to the server-selected original contact before queueing it. */
export default function CustomReplyModal({ draft, onChange, onSubmit, onClose, sending }) {
  const messageRef = useRef(null)
  const [error, setError] = useState('')
  const [review, setReview] = useState(null)
  const [reviewing, setReviewing] = useState(false)
  const contentKey = JSON.stringify([draft.email_id, draft.subject, draft.message])
  const current = review?.key === contentKey ? review : null

  const set = (field) => (e) => onChange({ ...draft, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!draft.message.trim()) {
      setError('Please write a reply message.')
      return
    }
    setError('')
    if (current) { onSubmit(current.preview_token); return }
    setReviewing(true)
    try {
      const result = await api.post('/api/outreach/reply-preview', { email_id: draft.email_id, subject: draft.subject, message: draft.message })
      setReview({ ...result, key: contentKey })
    } catch (err) { setError(err.message) } finally { setReviewing(false) }
  }

  return (
    <Modal title={`Reply — ${draft.school_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} id="custom-reply-form">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <span className="ui-compose-label">To:</span>
          <div className="ui-readonly-field">{draft.school_email}</div>
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label className="ui-compose-label" htmlFor="custom-reply-subject">
            Subject:
          </label>
          <input
            id="custom-reply-subject"
            type="text"
            className="ui-input"
            value={draft.subject}
            onChange={set('subject')}
            placeholder="Re: PSA Programs"
            required
          />
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div className="ui-compose-row">
            <label className="ui-compose-label" htmlFor="custom-reply-message">
              Message:
            </label>
            <MarkupToolbar
              textareaRef={messageRef}
              onChange={(message) => onChange({ ...draft, message })}
            />
          </div>
          <textarea
            id="custom-reply-message"
            ref={messageRef}
            className="ui-textarea"
            value={draft.message}
            onChange={set('message')}
            placeholder="Write your reply here..."
            rows={10}
            required
          />
          <div className="ui-compose-hint">
            Wrap text in <code>**double asterisks**</code> for bold, or{' '}
            <code>++double plus signs++</code> for larger text.
          </div>
        </div>

        {current && <div className="ou-mail"><div className="ou-mail-head"><span>Reply to {current.email}</span><strong>{current.subject}</strong></div>
          <div className="ou-mail-body" style={{ whiteSpace: 'pre-wrap' }}>{current.body_text}</div></div>}
        {error && (
          <div className="ui-alert tone-danger" role="alert">
            {error}
          </div>
        )}
      </form>

      <div className="ui-modal-footer" style={{ padding: 0, border: 'none' }}>
        <button
          type="submit"
          form="custom-reply-form"
          className="modern-btn-primary ui-grow"
          disabled={sending || reviewing || UI_PREVIEW}
        >
          {UI_PREVIEW ? 'Sending disabled in demo' : sending ? 'Queuing...' : reviewing ? 'Preparing review...' : current ? 'Approve and queue reply' : 'Review reply'}
        </button>
        <button type="button" className="modern-btn-primary is-neutral" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}
