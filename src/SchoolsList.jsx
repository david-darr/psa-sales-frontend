import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import Icon from './components/Icon'
import SchoolDialog from './components/SchoolDialog'
import {
  Empty,
  ErrorNotice,
  Pagination,
  StageBadge,
} from './components/WorkspaceUI'
import {
  STAGES,
  dueLabel,
  isOverdue,
  useDebounced,
  useResource,
} from './lib/crm'
import api from './lib/api'

const VIEWS = [
  ['workspace', 'All schools'],
  ['mine', 'My schools'],
  ['overdue', 'Overdue actions'],
  ['none', 'No next action'],
  ['directory', 'Reference directory'],
]
export default function SchoolsList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') || 'workspace'
  const query = params.get('q') || ''
  const term = useDebounced(query)
  const page = Number(params.get('page')) || 1
  const directory = view === 'directory'
  const [selected, setSelected] = useState([])
  const [bulkStage, setBulkStage] = useState('')
  const [bulkOwner, setBulkOwner] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [initialSchool, setInitialSchool] = useState(null)
  const filters = new URLSearchParams({ q: term, limit: 25, page })
  if (!directory) {
    filters.set('scope', !user.admin || view === 'mine' ? 'mine' : 'team')
    for (const key of ['stage', 'type', 'owner', 'sort'])
      if (params.get(key)) filters.set(key, params.get(key))
    if (['overdue', 'none'].includes(view)) filters.set('due', view)
  }
  const { data, loading, error, reload } = useResource(
    '/api/crm/' + (directory ? 'directory' : 'schools') + '?' + filters,
  )
  const { data: team } = useResource(user.admin ? '/api/crm/team' : null)
  const rows = data?.items || []
  const change = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace: key === 'q' })
    setSelected([])
    setNotice('')
    setActionError('')
  }
  const toggle = (id) =>
    setSelected((old) =>
      old.includes(id) ? old.filter((item) => item !== id) : [...old, id],
    )
  const updateSelected = async () => {
    setBusy(true)
    setActionError('')
    setNotice('')
    try {
      const result = await api.post('/api/crm/schools/bulk', {
        ids: selected,
        ...(bulkStage ? { status: bulkStage } : {}),
        ...(bulkOwner ? { user_id: Number(bulkOwner) } : {}),
      })
      setNotice(result.updated + ' schools updated.')
      setSelected([])
      setBulkStage('')
      setBulkOwner('')
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const selectedRows = rows.filter((row) => selected.includes(row.id))
  const canDeleteSelected =
    selected.length > 0 &&
    (user.admin || selectedRows.every((row) => row.user_id === user.id))
  const deleteSelected = async () => {
    const count = selected.length
    if (
      !window.confirm(
        `Delete ${count} ${count === 1 ? 'school' : 'schools'}? Their notes and activity are removed for everyone. Sent emails and tasks are kept without the school link. This cannot be undone.`,
      )
    )
      return
    setBusy(true)
    setActionError('')
    setNotice('')
    try {
      const result = await api.post('/api/crm/schools/delete', { ids: selected })
      setNotice(`${result.deleted} ${result.deleted === 1 ? 'school' : 'schools'} deleted.`)
      setSelected([])
      reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const exportPage = () => {
    const cell = (value) => {
      let text = String(value ?? '')
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text
      return '"' + text.replaceAll('"', '""') + '"'
    }
    const csv = [
      ['School', 'Email', 'Contact', 'Address', 'Owner', 'Stage'],
      ...rows.map((row) => [
        row.school_name || row.name,
        row.email,
        row.contact_name || row.contact,
        row.address,
        row.user_name || row.owner_name,
        row.status || '',
      ]),
    ]
      .map((row) => row.map(cell).join(','))
      .join('\r\n')
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'psa-schools-page-' + page + '.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }
  const closeDialog = () => {
    change('new', '')
    setInitialSchool(null)
  }
  return (
    <AppLayout
      title="Schools"
      subtitle="One relationship record. A clear owner. The whole story."
      actions={
        <>
          <Link
            to="/emails?tab=add"
            className="modern-btn-primary is-neutral"
          >
            <Icon name="download" size={14} />
            Import schools
          </Link>
          <button
            className="modern-btn-primary"
            onClick={() => change('new', '1')}
          >
            <Icon name="plus" size={14} />
            Add school
          </button>
        </>
      }
    >
      <ErrorNotice error={error || actionError} />
      {notice && (
        <div
          className="ui-alert tone-success"
          role="status"
          style={{ marginBottom: 16 }}
        >
          {notice}
        </div>
      )}
      <div className="workspace-tabs" aria-label="School views">
        {VIEWS.map(([key, label]) => (
          <button
            key={key}
            className={view === key ? 'is-active' : ''}
            onClick={() => {
              const next = new URLSearchParams()
              next.set('view', key)
              setParams(next)
              setSelected([])
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="workspace-panel" aria-busy={loading}>
        <div className="workspace-toolbar">
          <label className="workspace-toolbar-search">
            <Icon name="search" size={15} />
            <input
              type="search"
              value={query}
              onChange={(e) => change('q', e.target.value)}
              placeholder="Search schools, contacts, or addresses"
              aria-label="Search schools"
            />
          </label>
          {!directory && (
            <>
              <select
                className="workspace-select"
                aria-label="Filter stage"
                value={params.get('stage') || ''}
                onChange={(e) => change('stage', e.target.value)}
              >
                <option value="">All stages</option>
                {STAGES.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
              <select
                className="workspace-select"
                aria-label="Filter type"
                value={params.get('type') || ''}
                onChange={(e) => change('type', e.target.value)}
              >
                <option value="">All types</option>
                <option value="preschool">Preschool</option>
                <option value="elementary">Elementary</option>
                <option value="private">Private</option>
              </select>
              {user.admin && (
                <select
                  className="workspace-select"
                  aria-label="Filter owner"
                  value={params.get('owner') || ''}
                  onChange={(e) => change('owner', e.target.value)}
                >
                  <option value="">All owners</option>
                  {(team || []).map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
          <div className="workspace-toolbar-tail">
            {loading
              ? 'Updating...'
              : (data?.total || 0).toLocaleString() + ' schools'}
            <button
              className="modern-btn-primary is-neutral is-small"
              onClick={exportPage}
              disabled={!rows.length || loading}
            >
              <Icon name="download" size={13} />
              Export page
            </button>
            <button
              className="ui-link-button"
              onClick={reload}
              disabled={loading}
              aria-label="Refresh schools"
            >
              <Icon name="refresh" size={14} />
            </button>
          </div>
        </div>
        {!!selected.length && (
          <div className="workspace-bulk">
            <strong>{selected.length} selected</strong>
            <select
              className="workspace-select"
              aria-label="New stage for selected schools"
              value={bulkStage}
              onChange={(e) => setBulkStage(e.target.value)}
            >
              <option value="">Change stage...</option>
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
            {user.admin && (
              <select
                className="workspace-select"
                aria-label="New owner for selected schools"
                value={bulkOwner}
                onChange={(e) => setBulkOwner(e.target.value)}
              >
                <option value="">Assign owner...</option>
                {(team || []).map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            )}
            <button
              className="modern-btn-primary is-small"
              onClick={updateSelected}
              disabled={busy || loading || (!bulkStage && !bulkOwner)}
            >
              {busy ? 'Updating...' : 'Apply changes'}
            </button>
            {canDeleteSelected && (
              <button
                className="modern-btn-primary is-small is-danger"
                onClick={deleteSelected}
                disabled={busy || loading}
              >
                Delete
              </button>
            )}
            <button
              className="ui-link-button"
              onClick={() => setSelected([])}
              disabled={busy}
            >
              Clear
            </button>
          </div>
        )}
        {rows.length ? (
          <div className="workspace-table-wrap">
            <table className="workspace-table">
              <thead>
                <tr>
                  <th>
                    {!directory && (
                      <input
                        type="checkbox"
                        aria-label="Select this page"
                        checked={
                          rows.length > 0 &&
                          rows.every((row) => selected.includes(row.id))
                        }
                        onChange={(e) =>
                          setSelected(
                            e.target.checked ? rows.map((row) => row.id) : [],
                          )
                        }
                        disabled={loading || busy}
                      />
                    )}
                  </th>
                  <th>School</th>
                  <th>Primary contact</th>
                  <th>{directory ? 'Assignment' : 'Stage'}</th>
                  <th>Owner</th>
                  <th>{directory ? 'Action' : 'Next action'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((school) => (
                  <tr key={school.id}>
                    <td>
                      {!directory && (
                        <input
                          type="checkbox"
                          aria-label={'Select ' + school.school_name}
                          checked={selected.includes(school.id)}
                          onChange={() => toggle(school.id)}
                          disabled={loading || busy}
                        />
                      )}
                    </td>
                    <td>
                      {directory ? (
                        <div className="record-name">
                          <span className="record-mark">
                            <Icon name="school" size={16} />
                          </span>
                          <div>
                            {school.name}
                            <small>
                              {school.address || 'Address not recorded'}
                            </small>
                          </div>
                        </div>
                      ) : (
                        <Link
                          className="record-name"
                          to={'/schools/' + school.id}
                        >
                          <span className="record-mark">
                            <Icon name="school" size={16} />
                          </span>
                          <div>
                            {school.school_name}
                            <small>
                              {school.address || 'Address not recorded'}
                            </small>
                          </div>
                        </Link>
                      )}
                    </td>
                    <td>
                      {school.contact_name ||
                        school.contact ||
                        'No contact name'}
                      <small>{school.email}</small>
                    </td>
                    <td>
                      {directory ? (
                        <span className="workspace-subtle">
                          {school.assigned ? 'Assigned' : 'Available'}
                        </span>
                      ) : (
                        <StageBadge stage={school.status} />
                      )}
                    </td>
                    <td>
                      <span className="workspace-subtle">
                        {school.user_name || school.owner_name || 'Unassigned'}
                      </span>
                    </td>
                    <td>
                      {directory ? (
                        school.sales_school_id ? (
                          <Link
                            className="ui-link-button"
                            to={'/schools/' + school.sales_school_id}
                          >
                            Open workspace
                          </Link>
                        ) : school.assigned ? (
                          <span className="workspace-subtle">
                            Assigned to teammate
                          </span>
                        ) : (
                          <button
                            className="modern-btn-primary is-neutral is-small"
                            onClick={() => {
                              setInitialSchool(school)
                              change('new', '1')
                            }}
                          >
                            Add to outreach
                          </button>
                        )
                      ) : (
                        <div style={{ maxWidth: 190 }}>
                          {school.next_action || (
                            <span className="workspace-subtle">
                              No next action
                            </span>
                          )}
                          {school.next_action_at && (
                            <small
                              className={
                                isOverdue(school.next_action_at)
                                  ? 'workspace-date is-overdue'
                                  : ''
                              }
                            >
                              {dueLabel(school.next_action_at)}
                            </small>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={
              loading
                ? 'Loading schools...'
                : query
                  ? 'No matching schools'
                  : 'Your next partnership starts here'
            }
            text={
              query
                ? 'Try another name, contact, or address.'
                : 'Add a school or browse the reference directory.'
            }
            icon="school"
          />
        )}
        <Pagination
          page={page}
          limit={25}
          total={data?.total || 0}
          onPage={(value) => change('page', String(value))}
          disabled={loading}
        />
      </div>
      {params.get('new') === '1' && (
        <SchoolDialog
          initial={initialSchool || {}}
          onClose={closeDialog}
          onSaved={(created) => navigate('/schools/' + created.id)}
        />
      )}
    </AppLayout>
  )
}
