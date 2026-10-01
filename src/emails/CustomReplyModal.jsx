import { useRef, useState } from 'react'
import Modal from '../components/Modal'
import MarkupToolbar from './MarkupToolbar'

/**
 * Reply to a school that has responded.
 *
 * This dialog did not previously exist. `showCustomReplyModal` was declared
 * and set to true from the reply-chain modal's "Send Custom Reply" button, but
 * no JSX ever read it - so that button closed the thread view and nothing
 * opened. `handleSendCustomReply` was likewise unreachable (eslint flagged
 * both as unused), which left the backend's /api/send-custom-reply endpoint
 * with no way to be called from the UI at all.
 */
export default function CustomReplyModal({ draft, onChange, onSubmit, onClose, sending }) {
  const messageRef = useRef(null)
  const [error, setError] = useState('')

  const set = (field) => (e) => onChange({ ...draft, [field]: e.target.value })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!draft.message.trim()) {
      setError('Please write a reply message.')
      return
    }
    setError('')
    onSubmit()
  }

  return (
    <Modal title={`✍️ Reply — ${draft.school_name}`} onClose={onClose}>
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
          className="modern-btn-primary is-success ui-grow"
          disabled={sending}
        >
          {sending ? '📧 Sending...' : '📧 Send Reply'}
        </button>
        <button type="button" className="modern-btn-primary is-neutral" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}
