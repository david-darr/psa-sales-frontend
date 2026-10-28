import { relativeTime } from '../../emails/constants'
import { Dot } from './bits'

/** Schools that answered, newest reply first. */
export default function InboxTab({ emails, onOpen, onCheckReplies, syncing, mailConnected }) {
  const threads = [...emails].sort((a, b) =>
    String(b.reply_at || b.sent_at).localeCompare(String(a.reply_at || a.sent_at)),
  )
  return (
    <div className="ou-card">
      <div className="ou-card-head">
        <h3 className="ou-card-title">Replies</h3>
        <button
          type="button"
          className="ou-btn ou-btn-ghost ou-btn-sm"
          onClick={onCheckReplies}
          disabled={syncing || !mailConnected}
        >
          {syncing ? 'Checking...' : 'Check for replies'}
        </button>
      </div>
      {!threads.length && (
        <div className="ou-empty">
          <strong>No replies yet.</strong>
          When a school answers one of your emails, the conversation shows up here.
        </div>
      )}
      {threads.map((email) => (
        <button
          key={email.id}
          type="button"
          className={`ou-thread${email.reply_unread ? ' is-unread' : ''}`}
          onClick={() => onOpen(email)}
        >
          <Dot tone={email.reply_unread ? 'live' : 'neutral'} />
          <div className="ou-thread-main">
            <div className="ou-thread-name">{email.school_name}</div>
            <div className="ou-thread-snippet">
              {email.reply_snippet || 'Open the conversation to read their reply.'}
            </div>
          </div>
          <span className="ou-thread-time">{relativeTime(email.reply_at || email.sent_at)}</span>
        </button>
      ))}
    </div>
  )
}
