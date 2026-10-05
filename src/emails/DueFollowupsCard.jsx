import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'
import { serverDateLabel } from './constants'
import { UI_PREVIEW } from '../lib/previewMode'

const REVIEW_LIMIT = 20

export default function DueFollowupsCard({ dueEmails, mailConnected, loading, onPreview, onSend }) {
  const [selectedIds, setSelectedIds] = useState([])
  const [previews, setPreviews] = useState(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [preparing, setPreparing] = useState(false)
  const [sending, setSending] = useState(false)

  const selected = dueEmails.filter((email) => selectedIds.includes(email.id))
  const visible = dueEmails.slice(0, REVIEW_LIMIT)
  const allVisibleSelected = visible.length > 0 && visible.every((email) => selectedIds.includes(email.id))

  const toggle = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  const review = async () => {
    if (selected.length === 0) return
    setPreparing(true)
    const result = await onPreview(selected.map((email) => email.id))
    setPreparing(false)
    if (result?.length === selected.length) {
      setActiveIndex(0)
      setPreviews(result)
    }
  }

  const send = async () => {
    if (!previews?.length || sending) return
    setSending(true)
    await onSend(previews.map((item) => item.email_id))
    setSending(false)
    setPreviews(null)
    setSelectedIds([])
  }

  const active = previews?.[activeIndex]

  return (
    <>
      <Card title={`Due follow-ups (${dueEmails.length})`} icon="clock" tone="warning">
        <p className="followup-intro">
          Review unanswered emails from your account that were sent at least 7 days ago.
          A reply or an earlier follow-up removes an email from this queue.
        </p>
        {!mailConnected && (
          <div className="ui-alert tone-warning" role="status">
            Connect your work email in <Link to="/account">Account</Link> before sending follow-ups.
          </div>
        )}

        {dueEmails.length === 0 ? (
          <EmptyState
            icon="check"
            title="No follow-ups due"
            message="When an unanswered email reaches seven days, it will appear here."
          />
        ) : (
          <>
            <div className="ui-toolbar">
              <div className="ui-toolbar-group">
                <button
                  type="button"
                  className="modern-btn-primary is-neutral is-small"
                  onClick={() => setSelectedIds(allVisibleSelected ? [] : visible.map((email) => email.id))}
                  disabled={loading || preparing}
                >
                  {allVisibleSelected ? 'Clear selection' : `Select first ${visible.length}`}
                </button>
                <span className="followup-count">{selected.length} selected</span>
              </div>
              <button
                type="button"
                className="modern-btn-primary is-small"
                onClick={review}
                disabled={selected.length === 0 || loading || preparing}
              >
                {preparing ? 'Loading messages...' : `Review selected (${selected.length})`}
              </button>
            </div>

            {dueEmails.length > REVIEW_LIMIT && (
              <p className="followup-limit">Review up to {REVIEW_LIMIT} recipients at a time.</p>
            )}

            <div className="ui-table-frame">
              <div className="ui-table-scroll followup-table-scroll">
                <table className="ui-table is-dense">
                  <thead>
                    <tr>
                      <th scope="col">Select</th>
                      <th scope="col">School and recipient</th>
                      <th scope="col">Sent by</th>
                      <th scope="col">Original email</th>
                      <th scope="col">Due since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueEmails.map((email) => (
                      <tr key={email.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(email.id)}
                            disabled={loading || preparing || (
                              selected.length >= REVIEW_LIMIT && !selectedIds.includes(email.id)
                            )}
                            onChange={() => toggle(email.id)}
                            aria-label={`Select follow-up to ${email.school_name}`}
                          />
                        </td>
                        <td>
                          <div className="ui-cell-strong">{email.school_name}</div>
                          <div className="ui-sub">{email.school_email}</div>
                        </td>
                        <td>{email.user_name || 'You'}</td>
                        <td>{serverDateLabel(email.sent_at)}</td>
                        <td>{serverDateLabel(email.followup_due_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </Card>

      {previews && (
        <Modal
          title={`Review follow-ups (${previews.length})`}
          size="lg"
          onClose={() => { if (!sending) setPreviews(null) }}
          footer={
            <>
              <button
                type="button"
                className="modern-btn-primary"
                onClick={send}
                disabled={sending || !mailConnected || UI_PREVIEW}
              >
                {UI_PREVIEW ? 'Sending disabled in preview' : sending ? 'Sending...' : `Send ${previews.length} follow-up${previews.length === 1 ? '' : 's'}`}
              </button>
              <button
                type="button"
                className="modern-btn-primary is-neutral"
                onClick={() => setPreviews(null)}
                disabled={sending}
              >
                Cancel
              </button>
            </>
          }
        >
          <p className="followup-intro">Each recipient gets the message shown below. Select a recipient to review their version.</p>
          <div className="followup-preview-tabs" role="tablist" aria-label="Recipients">
            {previews.map((item, index) => (
              <button
                type="button"
                role="tab"
                aria-selected={index === activeIndex}
                key={item.email_id}
                className={index === activeIndex ? 'is-active' : ''}
                onClick={() => setActiveIndex(index)}
              >
                {item.school_name}
              </button>
            ))}
          </div>
          {active && (
            <div role="tabpanel" className="followup-preview">
              <div><strong>To:</strong> {active.to_email}</div>
              <div><strong>Subject:</strong> {active.subject}</div>
              <pre>{active.body}</pre>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}
