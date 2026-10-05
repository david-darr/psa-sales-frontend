import { useRef, useState } from 'react'
import Modal from '../components/Modal'
import MarkupToolbar from './MarkupToolbar'
import { AVAILABLE_PDFS } from './constants'

/**
 * Freeform composer for one school or a bulk selection.
 *
 * @param {object} draft           Seeded by the page from the chosen school(s).
 * @param {(d: object) => void} onChange
 * @param {() => void} onSubmit
 * @param {() => void} onClose
 * @param {boolean} sending
 */
export default function CustomEmailModal({ draft, onChange, onSubmit, onClose, sending }) {
  const messageRef = useRef(null)
  const [error, setError] = useState('')

  const isBulk = !draft.school_id && draft.school_ids.length > 0
  const set = (field) => (e) => onChange({ ...draft, [field]: e.target.value })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!draft.subject.trim() || !draft.message.trim()) {
      setError('A subject and a message are both required.')
      return
    }
    setError('')
    onSubmit()
  }

  const togglePdf = (file) =>
    onChange({
      ...draft,
      pdf_files: draft.pdf_files.includes(file)
        ? draft.pdf_files.filter((f) => f !== file)
        : [...draft.pdf_files, file],
    })

  return (
    <Modal title={`Custom Email — ${draft.school_name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} id="custom-email-form">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <span className="ui-compose-label">To:</span>
          {isBulk ? (
            <div className="ui-readonly-field is-bulk">
               {draft.school_name} — primary email per school
            </div>
          ) : draft.all_emails.length > 1 ? (
            <select
              className="ui-select"
              value={draft.school_email}
              onChange={set('school_email')}
              aria-label="Recipient address"
            >
              {draft.all_emails.map((email) => (
                <option key={email} value={email}>
                  {email}
                </option>
              ))}
            </select>
          ) : (
            <div className="ui-readonly-field">{draft.school_email}</div>
          )}
        </div>

        <div style={{ marginBottom: 'var(--space-4)' }}>
          <label className="ui-compose-label" htmlFor="custom-email-subject">
            Subject:
          </label>
          <input
            id="custom-email-subject"
            type="text"
            className="ui-input"
            value={draft.subject}
            onChange={set('subject')}
            placeholder="Email subject..."
            required
          />
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <div className="ui-compose-row">
            <label className="ui-compose-label" htmlFor="custom-email-message">
              Message:
            </label>
            <MarkupToolbar
              textareaRef={messageRef}
              onChange={(message) => onChange({ ...draft, message })}
            />
          </div>
          <textarea
            id="custom-email-message"
            ref={messageRef}
            className="ui-textarea"
            value={draft.message}
            onChange={set('message')}
            placeholder="Write your message here..."
            rows={10}
            required
          />
          <div className="ui-compose-hint">
            Wrap text in <code>**double asterisks**</code> (or select it and click{' '}
            <strong>B</strong>) to send it bold, or <code>++double plus signs++</code> (or click{' '}
            <strong>A+</strong>) to send it larger.
            <br />
            Placeholders, replaced per school before sending: <code>[school_name]</code>{' '}
            <code>[contact_name]</code> <code>[user_name]</code> <code>[user_email]</code>
          </div>
        </div>

        <div style={{ marginBottom: 'var(--space-5)' }}>
          <span className="ui-compose-label">Attach PDFs (optional):</span>
          <div className="ui-check-list">
            {AVAILABLE_PDFS.map(({ file, label }) => (
              <label key={file} className="ui-check">
                <input
                  type="checkbox"
                  checked={draft.pdf_files.includes(file)}
                  onChange={() => togglePdf(file)}
                />
                 {label}
              </label>
            ))}
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
          form="custom-email-form"
          className="modern-btn-primary ui-grow"
          disabled={sending}
        >
          {sending ? 'Sending...' : 'Send Email'}
        </button>
        <button type="button" className="modern-btn-primary is-neutral" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}
