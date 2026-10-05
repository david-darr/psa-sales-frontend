import Modal from '../components/Modal'

/**
 * Read the stored reply thread for one sent email.
 *
 * @param {object|null} chain    /api/email-reply-chain response, or {error}.
 * @param {boolean}     loading
 * @param {() => void}  onClose
 * @param {() => void}  onReply  Switches to the reply composer.
 */
export default function ReplyChainModal({ chain, loading, onClose, onReply }) {
  const hasChain = chain && !chain.error

  return (
    <Modal
      title=" Email Reply Chain"
      size="lg"
      onClose={onClose}
      footer={
        hasChain && (
          <>
            <button className="modern-btn-primary is-success" onClick={onReply}>
               Send Custom Reply
            </button>
            <button className="modern-btn-primary is-neutral" onClick={onClose}>
              Close
            </button>
          </>
        )
      }
    >
      {loading ? (
        <div className="ui-empty-state">Loading reply chain...</div>
      ) : chain?.error ? (
        <div className="ui-alert tone-danger" role="alert">
          <strong>Could not load the reply chain.</strong>
          <div style={{ marginTop: 'var(--space-2)' }}>{chain.error}</div>
        </div>
      ) : hasChain ? (
        <>
          <div className="ui-reply-meta">
            <div>
              <strong>School:</strong> {chain.school_name}
            </div>
            <div>
              <strong>Email:</strong> {chain.school_email}
            </div>
            <div>
              <strong>Total Replies:</strong> {chain.reply_count || 0}
            </div>
            <div>
              <strong>Last Reply:</strong>{' '}
              {chain.last_reply_date
                ? new Date(chain.last_reply_date).toLocaleDateString()
                : 'None'}
            </div>
          </div>

          {chain.replies?.length > 0 ? (
            <>
              <h4 style={{ marginBottom: 'var(--space-4)' }}>
                Conversation ({chain.replies.length}{' '}
                {chain.replies.length === 1 ? 'reply' : 'replies'})
              </h4>
              {chain.replies.map((reply, index) => (
                <div key={reply.id} className="ui-reply-card">
                  <div className="ui-reply-head">
                    <strong>Reply #{index + 1}</strong> •{' '}
                    {new Date(reply.reply_date).toLocaleString()}
                    {reply.reply_sender && <> • from {reply.reply_sender}</>}
                  </div>
                  <div className="ui-reply-body">
                    {reply.reply_content || 'No content available'}
                  </div>
                </div>
              ))}
            </>
          ) : (
            // Rows created before the email_replies table existed only have
            // the single reply_content column on sent_emails.
            <div className="ui-reply-body is-single">
              {chain.reply_content || 'No reply content available'}
            </div>
          )}
        </>
      ) : null}
    </Modal>
  )
}
