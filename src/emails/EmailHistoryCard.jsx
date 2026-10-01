import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { useIsMobile } from '../hooks/useBreakpoint'
import { emailState, followupUrgency, timeAgo } from './constants'

/** Date sent plus a relative-age badge. */
function SentCell({ email }) {
  const age = timeAgo(email.days_ago || 0)
  return (
    <div className="ui-cell-stack">
      <div className="ui-cell-strong">
        {email.sent_at_formatted || new Date(email.sent_at).toLocaleDateString()}
      </div>
      <Badge tone={age.tone} compact>
        {age.icon} {age.text}
      </Badge>
    </div>
  )
}

export default function EmailHistoryCard({
  sentEmails,
  counts,
  isAdmin,
  loading,
  filterEmails,
  selectedIds,
  onSelectionChange,
  onDeleteSelected,
  onMassFollowup,
  onCheckReplies,
}) {
  const isMobile = useIsMobile()
  const [filter, setFilter] = useState('all')

  const visible = useMemo(() => filterEmails(filter), [filterEmails, filter])

  // Same reasoning as the schools table: never leave rows selected that the
  // current filter has hidden.
  useEffect(() => {
    onSelectionChange([])
  }, [filter, onSelectionChange])

  const toggle = (id) =>
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    )

  const allVisibleSelected = visible.length > 0 && selectedIds.length === visible.length
  const toggleAll = () => onSelectionChange(allVisibleSelected ? [] : visible.map((e) => e.id))

  return (
    <Card
      title={`Email History (${counts.all} sent)`}
      icon="📋"
      tone="warning"
      style={{ marginBottom: 'var(--space-6)' }}
    >
      <div className="ui-toolbar">
        <div className="ui-toolbar-group">
          <label className="ui-field-label" htmlFor="email-filter" style={{ marginBottom: 0 }}>
            Filter emails:
          </label>
          <select
            id="email-filter"
            className="ui-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">📋 All Emails ({counts.all})</option>
            <option value="pending">⏳ Pending ({counts.pending})</option>
            <option value="followup">📧 Follow-up Sent ({counts.followup})</option>
            <option value="responded">✅ Responded ({counts.responded})</option>
          </select>
        </div>

        <div className="ui-toolbar-group">
          {counts.followupEligible > 0 && (
            <button
              className="modern-btn-primary is-warning is-small"
              onClick={onMassFollowup}
              disabled={loading}
            >
              {loading
                ? '📧 Sending...'
                : `📧 Send My Follow-ups (${counts.followupEligible})`}
            </button>
          )}
          <button
            className={`modern-btn-primary is-small ${allVisibleSelected ? 'is-danger' : 'is-neutral'}`}
            onClick={toggleAll}
            disabled={visible.length === 0}
          >
            {allVisibleSelected ? 'Deselect All' : 'Select All'}
          </button>
          <button
            className="modern-btn-primary is-small"
            onClick={onCheckReplies}
            disabled={loading}
          >
            {loading ? '🔄 Checking...' : '🔄 Check Replies'}
          </button>
          {selectedIds.length > 0 && (
            <button
              className="modern-btn-primary is-danger is-small"
              onClick={onDeleteSelected}
              disabled={loading}
            >
              {loading ? '🗑️ Deleting...' : `🗑️ Delete ${selectedIds.length}`}
            </button>
          )}
        </div>
      </div>

      <div className="ui-summary-bar tone-warning">
        <span>
          Showing <strong style={{ color: 'var(--color-warning)' }}>{visible.length}</strong> emails
          {filter !== 'all' && <span> (filtered from {counts.all} total)</span>}
        </span>
        <span>
          ⏳ {counts.pending} pending • 📧 {counts.followup} follow-up sent • ✅{' '}
          {counts.responded} responded
        </span>

        {(counts.urgent > 0 || counts.due > 0) && (
          <div className="ui-summary-bar-note">
            {counts.urgent > 0 && (
              <span style={{ color: 'var(--color-danger)' }}>
                🚨 {counts.urgent} urgent follow-up{counts.urgent === 1 ? '' : 's'} (14+ days)
              </span>
            )}
            {counts.due > 0 && (
              <span style={{ color: 'var(--color-warning)' }}>
                ⚠️ {counts.due} follow-up{counts.due === 1 ? '' : 's'} due (7+ days)
              </span>
            )}
          </div>
        )}
      </div>

      {sentEmails.length === 0 ? (
        <EmptyState
          icon="📧"
          title="No Emails Sent Yet"
          message="Select some schools above and send your first campaign."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No Emails Match This Filter"
          message="Try a different filter option."
          action={
            <button className="modern-btn-primary" onClick={() => setFilter('all')}>
              Show All Emails
            </button>
          }
        />
      ) : (
        <div className="ui-table-frame">
          <div className="ui-table-scroll" style={{ maxHeight: '500px' }}>
            <table className="ui-table is-dense">
              <thead>
                <tr>
                  <th className="ui-select-col" scope="col">
                    Select
                  </th>
                  <th scope="col">School</th>
                  {!isMobile && <th scope="col">Email</th>}
                  <th scope="col">Date Sent</th>
                  {isAdmin && !isMobile && <th scope="col">Sent By</th>}
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((email) => {
                  const state = emailState(email)
                  const urgency = followupUrgency(email)
                  return (
                    <tr key={email.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(email.id)}
                          onChange={() => toggle(email.id)}
                          aria-label={`Select email to ${email.school_name}`}
                        />
                      </td>
                      <td>
                        <div className="ui-cell-strong">{email.school_name}</div>
                        {isMobile && <div className="ui-sub">📧 {email.school_email}</div>}
                      </td>
                      {!isMobile && <td>{email.school_email}</td>}
                      <td>
                        <SentCell email={email} />
                      </td>
                      {isAdmin && !isMobile && <td>{email.user_name || 'Unknown'}</td>}
                      <td>
                        <div className="ui-cell-stack">
                          <Badge tone={state.tone} compact>
                            {state.label}
                          </Badge>
                          {urgency && (
                            <Badge tone={urgency.tone} compact>
                              {urgency.text}
                            </Badge>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}
