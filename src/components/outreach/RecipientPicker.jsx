import { useEffect, useState } from 'react'
import { STAGES, stageColor, stageLabel, useDebounced } from '../../lib/crm'
import { loadAllRecipients } from '../../emails/outreachApi'
import { useRecipients } from '../../emails/useOutreach'
import { plural, relativeTime } from '../../emails/constants'
import { BlockerChips } from './bits'

const PER_PAGE = 25

/**
 * Searchable, selectable recipient table. Selection is a Map keyed by school id
 * so it survives paging and filter changes.
 */
export default function RecipientPicker({ kind, selected, onSelect, rev }) {
  const [q, setQ] = useState('')
  const [stage, setStage] = useState('')
  const [page, setPage] = useState(1)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [bulkNote, setBulkNote] = useState('')
  const term = useDebounced(q, 300)
  const { items, total, loading, error } = useRecipients({
    kind,
    q: term,
    stage,
    page,
    perPage: PER_PAGE,
    rev,
  })

  useEffect(() => setPage(1), [term, stage, kind])

  const pages = Math.max(1, Math.ceil(total / PER_PAGE))
  const pageEligible = items.filter((row) => row.eligible)
  const allOnPage =
    pageEligible.length > 0 && pageEligible.every((row) => selected.has(row.school_id))

  const toggle = (row) => {
    const next = new Map(selected)
    if (next.has(row.school_id)) next.delete(row.school_id)
    else next.set(row.school_id, row)
    onSelect(next)
  }

  const togglePage = () => {
    const next = new Map(selected)
    pageEligible.forEach((row) => {
      if (allOnPage) next.delete(row.school_id)
      else next.set(row.school_id, row)
    })
    onSelect(next)
  }

  const selectAllEligible = async () => {
    setBulkBusy(true)
    setBulkNote('')
    try {
      const { items: all, total: count, truncated } = await loadAllRecipients(
        { kind, q: term, stage, scope: 'mine' },
        { cap: 500 },
      )
      const next = new Map(selected)
      all.filter((row) => row.eligible).forEach((row) => next.set(row.school_id, row))
      onSelect(next)
      setBulkNote(
        truncated
          ? `Selected the first 500 of ${count.toLocaleString()} matches.`
          : `Selected every eligible match (${next.size.toLocaleString()} total).`,
      )
    } catch (err) {
      setBulkNote(err.message || 'Could not load every match.')
    } finally {
      setBulkBusy(false)
    }
  }

  return (
    <div className="ou-card">
      <div className="ou-toolbar">
        <input
          className="ou-input"
          type="search"
          placeholder="Search school, contact or email"
          aria-label="Search recipients"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <select
          className="ou-select"
          aria-label="Filter by stage"
          value={stage}
          onChange={(event) => setStage(event.target.value)}
        >
          <option value="">All stages</option>
          {STAGES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <div className="ou-toolbar-tail">
          {selected.size > 0 && (
            <button type="button" className="ou-btn ou-btn-ghost ou-btn-sm" onClick={() => onSelect(new Map())}>
              Clear {selected.size}
            </button>
          )}
          <button
            type="button"
            className="ou-btn ou-btn-ghost ou-btn-sm"
            onClick={selectAllEligible}
            disabled={bulkBusy || !total}
          >
            {bulkBusy ? 'Selecting...' : 'Select all eligible'}
          </button>
        </div>
      </div>
      {bulkNote && (
        <div className="ou-toolbar" role="status">
          <span className="ou-muted">{bulkNote}</span>
        </div>
      )}

      {error && <div className="ou-error">{error}</div>}

      <div className="ou-table-wrap">
        <table className="ou-table">
          <thead>
            <tr>
              <th className="ou-check-cell">
                <input
                  type="checkbox"
                  className="ou-check"
                  aria-label="Select every eligible school on this page"
                  checked={allOnPage}
                  onChange={togglePage}
                  disabled={!pageEligible.length}
                />
              </th>
              <th>School</th>
              <th className="ou-hide-sm">Contact</th>
              <th className="ou-hide-sm">Stage</th>
              <th className="ou-hide-sm">Last email</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const isOn = selected.has(row.school_id)
              return (
                <tr
                  key={row.school_id}
                  className={`${isOn ? 'is-selected' : ''}${row.eligible ? '' : ' is-blocked'}`}
                >
                  <td className="ou-check-cell">
                    <input
                      type="checkbox"
                      className="ou-check"
                      aria-label={`Select ${row.school_name}`}
                      checked={isOn}
                      disabled={!row.eligible}
                      onChange={() => toggle(row)}
                    />
                  </td>
                  <td>
                    <span className="ou-strong">{row.school_name}</span>
                    <span className="ou-sub">{row.email || 'No email on file'}</span>
                  </td>
                  <td className="ou-hide-sm">{row.contact_name || <span className="ou-muted">None</span>}</td>
                  <td className="ou-hide-sm">
                    <span className="ou-chip">
                      <span className="ou-dot" style={{ background: stageColor(row.status) }} />
                      {stageLabel(row.status)}
                    </span>
                  </td>
                  <td className="ou-hide-sm ou-mono">
                    {row.last_contacted_at ? relativeTime(row.last_contacted_at) : 'Never'}
                  </td>
                  <td>
                    <BlockerChips blockers={row.blockers} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!loading && !items.length && !error && (
        <div className="ou-empty">
          <strong>
            {kind === 'followup' ? 'No follow-ups are due.' : 'No schools match.'}
          </strong>
          {kind === 'followup'
            ? 'Schools show up here a week after you email them, until they reply.'
            : 'Try a different search or stage, or find new schools to add.'}
        </div>
      )}
      {loading && !items.length && <div className="ou-empty">Loading recipients...</div>}

      <div className="ou-pager">
        <span>
          {plural(total, 'school')}
          {selected.size > 0 && ` · ${selected.size.toLocaleString()} selected`}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="ou-btn ou-btn-ghost ou-btn-sm"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span className="ou-mono">
            {page} / {pages}
          </span>
          <button
            type="button"
            className="ou-btn ou-btn-ghost ou-btn-sm"
            onClick={() => setPage((value) => Math.min(pages, value + 1))}
            disabled={page >= pages}
          >
            Next
          </button>
        </span>
      </div>
    </div>
  )
}
