import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { useIsMobile } from '../hooks/useBreakpoint'
import { MAX_EMAILS_PER_BATCH, schoolType } from './constants'

/**
 * Pick schools, then send either the stock template or a custom email.
 *
 * The table's columns are fixed here. The previous markup had a <thead> and
 * <tbody> maintained as two independent lists that had drifted apart: the
 * column headed "Date Sent" rendered a contact-status sentence (schools have
 * no sent date), and the column headed "Actions" rendered `user_name` a second
 * time while the only actual action - the Custom Email button - sat inside the
 * "Status" column.
 */
export default function SchoolsCard({
  schools,
  counts,
  isAdmin,
  loading,
  filterSchools,
  countOutgoing,
  selectedIds,
  onSelectionChange,
  onDeleteSelected,
  onSendTemplate,
  onComposeSingle,
  onComposeBulk,
}) {
  const isMobile = useIsMobile()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('default')
  const [sendToAllEmails, setSendToAllEmails] = useState(false)

  const visible = useMemo(() => filterSchools(filter, sort), [filterSchools, filter, sort])

  // Changing the filter hides rows, so keep the selection to what is on screen
  // rather than silently acting on rows the user can no longer see.
  useEffect(() => {
    onSelectionChange([])
  }, [filter, onSelectionChange])

  const toggle = (id) =>
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    )

  const allVisibleSelected = visible.length > 0 && selectedIds.length === visible.length
  const toggleAll = () => onSelectionChange(allVisibleSelected ? [] : visible.map((s) => s.id))

  const outgoing = countOutgoing(selectedIds, sendToAllEmails)
  const batches = Math.ceil(outgoing / MAX_EMAILS_PER_BATCH) || 0

  return (
    <Card
      title={`Select Schools to Email (${selectedIds.length} selected)`}
      icon="📧"
      style={{ marginBottom: 'var(--space-6)' }}
    >
      <div className="ui-toolbar">
        <div className="ui-toolbar-group">
          <label className="ui-field-label" htmlFor="school-filter" style={{ marginBottom: 0 }}>
            Filter:
          </label>
          <select
            id="school-filter"
            className="ui-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">📋 All Schools ({counts.all})</option>
            <option value="pending">⏳ Pending ({counts.pending})</option>
            <option value="contacted">✅ Contacted ({counts.contacted})</option>
          </select>

          <label className="ui-field-label" htmlFor="school-sort" style={{ marginBottom: 0 }}>
            Sort:
          </label>
          <select
            id="school-sort"
            className="ui-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="default">📋 Default Order</option>
            <option value="type">🔤 By Type (All)</option>
            <option value="preschool">👶 Preschool First</option>
            <option value="elementary">📚 Elementary First</option>
            <option value="private">🏫 Private First</option>
          </select>
        </div>

        <div className="ui-toolbar-group">
          <button
            className={`modern-btn-primary is-small ${allVisibleSelected ? 'is-danger' : ''}`}
            onClick={toggleAll}
            disabled={visible.length === 0}
          >
            {allVisibleSelected ? 'Deselect All' : 'Select All'}
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

      <div className="ui-summary-bar tone-primary">
        <span>
          Showing <strong style={{ color: 'var(--color-primary)' }}>{visible.length}</strong>{' '}
          schools
          {filter !== 'all' && <span> (filtered from {counts.all} total)</span>}
        </span>
        <span>
          ⏳ {counts.pending} pending • ✅ {counts.contacted} contacted
        </span>
      </div>

      {schools.length === 0 ? (
        <EmptyState
          icon="🏫"
          title="No Schools Yet"
          message="Add schools above to start sending email campaigns."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No Schools Match This Filter"
          message="Try a different filter option."
          action={
            <button className="modern-btn-primary" onClick={() => setFilter('all')}>
              Show All Schools
            </button>
          }
        />
      ) : (
        <div className="ui-table-frame" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="ui-table-scroll" style={{ maxHeight: '400px' }}>
            <table className="ui-table is-dense">
              <thead>
                <tr>
                  <th className="ui-select-col" scope="col">
                    Select
                  </th>
                  <th scope="col">School</th>
                  <th scope="col">Type</th>
                  <th scope="col">Contact</th>
                  {!isMobile && <th scope="col">Email</th>}
                  <th scope="col">Status</th>
                  {isAdmin && !isMobile && <th scope="col">Added By</th>}
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((school) => {
                  const type = schoolType(school.school_type)
                  const extra = school.additional_emails?.length || 0
                  return (
                    <tr key={school.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(school.id)}
                          onChange={() => toggle(school.id)}
                          aria-label={`Select ${school.school_name}`}
                        />
                      </td>
                      <td>
                        <div className="ui-cell-strong">{school.school_name}</div>
                        {isMobile && (
                          <div className="ui-sub">
                            <div>📧 {school.email}</div>
                            {extra > 0 && (
                              <div className="ui-sub-dim">
                                +{extra} more email{extra === 1 ? '' : 's'}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <Badge tone={type.tone} compact>
                          {type.display}
                        </Badge>
                      </td>
                      <td>{school.contact_name || '—'}</td>
                      {!isMobile && (
                        <td>
                          <div>{school.email}</div>
                          {extra > 0 && (
                            <div className="ui-sub-dim">
                              +{extra} additional email{extra === 1 ? '' : 's'}
                            </div>
                          )}
                        </td>
                      )}
                      <td>
                        <Badge tone={school.status === 'contacted' ? 'success' : 'neutral'} compact>
                          {school.status === 'contacted' ? '✅ Contacted' : '⏳ Pending'}
                        </Badge>
                      </td>
                      {isAdmin && !isMobile && <td>{school.user_name || 'Unknown'}</td>}
                      <td>
                        <button
                          className="modern-btn-primary is-info is-small"
                          onClick={() => onComposeSingle(school)}
                        >
                          ✉️ Custom Email
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedIds.length > 0 && (
        <>
          <div className="ui-info-tile tone-primary" style={{ marginBottom: 'var(--space-4)' }}>
            <label className="ui-check">
              <input
                type="checkbox"
                checked={sendToAllEmails}
                onChange={(e) => setSendToAllEmails(e.target.checked)}
              />
              📧 Send to all email addresses (including additional emails)
            </label>
            <div className="ui-info-body" style={{ marginTop: 'var(--space-2)' }}>
              When checked, each school receives the email at its primary and additional
              addresses. Applies to the template send only.
            </div>
          </div>

          <div className="ui-info-tile tone-primary" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="ui-info-title">📊 Sending Preview</div>
            <div className="ui-info-body">
              <div>
                • Selected schools: <strong>{selectedIds.length}</strong>
              </div>
              <div>
                • Addresses to send to: <strong>{outgoing}</strong>
              </div>
              <div>
                • Batches: <strong>{batches}</strong>
              </div>
              {outgoing > 50 && (
                <div style={{ color: 'var(--color-warning)', marginTop: 'var(--space-2)' }}>
                  ⚠️ Large batch. Consider sending in smaller groups for easier recovery if
                  something fails partway.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="ui-btn-row">
        <button
          className="modern-btn-primary"
          onClick={() => onSendTemplate({ selectedIds, sendToAllEmails })}
          disabled={selectedIds.length === 0 || loading}
        >
          {loading
            ? '📧 Sending...'
            : `📧 Template Email to ${selectedIds.length} School${selectedIds.length === 1 ? '' : 's'}`}
        </button>
        <button
          className="modern-btn-primary is-info"
          onClick={() => onComposeBulk(selectedIds)}
          disabled={selectedIds.length === 0 || loading}
        >
          ✉️ Custom Email to {selectedIds.length} School{selectedIds.length === 1 ? '' : 's'}
        </button>
      </div>
    </Card>
  )
}
