import { useMemo } from 'react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { useIsMobile } from '../hooks/useBreakpoint'

/**
 * Schools that have replied, with the follow-through actions: read the thread,
 * copy the address, write a reply, or undo the responded flag.
 *
 * This used to read from the *filtered* email list, so selecting "Pending" in
 * the Email History card above emptied this card as a side effect. It now
 * always reflects every responded email.
 */
export default function RespondedCard({
  sentEmails,
  isAdmin,
  onViewReply,
  onCompose,
  onUnmark,
  onCopyEmail,
}) {
  const isMobile = useIsMobile()
  const responded = useMemo(() => sentEmails.filter((e) => e.responded), [sentEmails])

  return (
    <Card
      title={`Responded Emails (${responded.length} response${responded.length === 1 ? '' : 's'} received)`}
      icon="✅"
      tone="success"
    >
      <div className="ui-toolbar-hint" style={{ marginBottom: 'var(--space-4)' }}>
        Schools that have responded to your email campaigns
      </div>

      {responded.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No Responses Yet"
          message="When schools reply to your emails, they'll appear here for easy follow-up."
        />
      ) : (
        <div className="ui-table-frame">
          <div className="ui-table-scroll" style={{ maxHeight: '400px' }}>
            <table className="ui-table is-dense is-responded">
              <thead>
                <tr>
                  <th scope="col">School</th>
                  {!isMobile && <th scope="col">Email</th>}
                  <th scope="col">Original Email Date</th>
                  {isAdmin && !isMobile && <th scope="col">Sent By</th>}
                  <th scope="col">Response Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {responded.map((email) => (
                  <tr key={email.id}>
                    <td>
                      <div className="ui-cell-strong">{email.school_name}</div>
                      {isMobile && <div className="ui-sub">📧 {email.school_email}</div>}
                    </td>
                    {!isMobile && <td>{email.school_email}</td>}
                    <td>
                      {email.sent_at_formatted || new Date(email.sent_at).toLocaleDateString()}
                    </td>
                    {isAdmin && !isMobile && <td>{email.user_name || 'Unknown'}</td>}
                    <td>
                      <Badge tone="success" compact>
                        ✅ Responded
                      </Badge>
                    </td>
                    <td>
                      <div className="ui-cell-actions">
                        <button
                          className="modern-btn-primary is-small"
                          onClick={() => onCopyEmail(email)}
                        >
                          📋 Copy Email
                        </button>

                        {/* Only offer the thread view when the backend says
                            there is stored reply content to show. */}
                        {email.has_reply_content && (
                          <button
                            className="modern-btn-primary is-success is-small"
                            onClick={() => onViewReply(email)}
                          >
                            👁️ View Reply
                          </button>
                        )}

                        <button
                          className="modern-btn-primary is-info is-small"
                          onClick={() => onCompose(email)}
                        >
                          ✍️ Reply
                        </button>

                        <button
                          className="modern-btn-primary is-neutral is-small"
                          onClick={() => onUnmark(email)}
                        >
                          ↩️ Unmark
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}
