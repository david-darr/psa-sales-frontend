import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppLayout from './components/AppLayout'
import Icon from './components/Icon'
import Modal from './components/Modal'
import TaskDialog from './components/TaskDialog'
import { Panel, Empty, ErrorNotice } from './components/WorkspaceUI'
import { STAGES, dateLabel, dueLabel, useResource } from './lib/crm'
import api from './lib/api'
import './styles/portfolio.css'

function EditSchool({ school, onClose, onSave }) {
  const [draft, setDraft] = useState({
    ...school,
    additional: (school.additional_emails || []).join(', '),
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fields = [
    ['school_name', 'School name'],
    ['contact_name', 'Contact name'],
    ['email', 'Primary email'],
    ['phone', 'Phone'],
    ['address', 'Address'],
  ]
  const change = (key, value) => setDraft((old) => ({ ...old, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const values = Object.fromEntries([
      ...fields.map(([key]) => [key, draft[key] || '']),
      ['school_type', draft.school_type],
      ['notes', draft.notes || ''],
      [
        'additional_emails',
        draft.additional
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      ],
    ])
    const changed = Object.fromEntries(
      Object.entries(values).filter(
        ([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(school[key] ?? ''),
      ),
    )
    try {
      if (Object.keys(changed).length)
        await api.patch('/api/sales-schools/' + school.id, changed)
      onSave()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal
      title="Edit school details"
      onClose={onClose}
      footer={
        <>
          <button
            className="modern-btn-primary is-neutral"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="modern-btn-primary"
            form="edit-school-form"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </>
      }
    >
      <ErrorNotice error={error} />
      <form id="edit-school-form" onSubmit={submit} className="workspace-form">
        <div className="workspace-form-grid">
          {fields.map(([key, label]) => (
            <label className="workspace-field" key={key}>
              {label}
              <input
                className="ui-input"
                type={key === 'email' ? 'email' : 'text'}
                value={draft[key] || ''}
                required={['school_name', 'email'].includes(key)}
                onChange={(e) => change(key, e.target.value)}
              />
            </label>
          ))}
          <label className="workspace-field">
            Type
            <select
              className="ui-select"
              value={draft.school_type}
              onChange={(e) => change('school_type', e.target.value)}
            >
              <option value="preschool">Preschool</option>
              <option value="elementary">Elementary</option>
              <option value="private">Private school</option>
            </select>
          </label>
        </div>
        <label className="workspace-field">
          Additional emails
          <input
            className="ui-input"
            value={draft.additional}
            onChange={(e) => change('additional', e.target.value)}
            placeholder="Separate addresses with commas"
          />
        </label>
        <label className="workspace-field">
          Relationship notes
          <textarea
            className="ui-input"
            rows={4}
            value={draft.notes || ''}
            onChange={(e) => change('notes', e.target.value)}
          />
        </label>
      </form>
    </Modal>
  )
}
export default function SchoolWorkspace() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data, error, loading, reload } = useResource(
    '/api/sales-schools/' + id,
  )
  const taskData = useResource('/api/crm/tasks?school_id=' + id + '&limit=6')
  const { data: team } = useResource(user.admin ? '/api/crm/team' : null)
  const school = data?.school
  const [edit, setEdit] = useState(false)
  const [newTask, setNewTask] = useState(false)
  const [action, setAction] = useState(null)
  const [activity, setActivity] = useState({ kind: 'note', detail: '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const navigate = useNavigate()
  const canDelete = Boolean(school && (user.admin || school.user_id === user.id))
  const deleteSchool = async () => {
    if (
      !window.confirm(
        `Delete ${school.school_name}? Its notes and activity are removed for everyone. Sent emails and tasks are kept without the school link. This cannot be undone.`,
      )
    )
      return
    setBusy(true)
    setActionError('')
    try {
      await api.post('/api/crm/schools/delete', { ids: [school.id] })
      navigate('/schools', { replace: true })
    } catch (err) {
      setActionError(err.message)
      setBusy(false)
    }
  }
  const refresh = () => {
    reload()
    taskData.reload()
  }
  const save = async (changes) => {
    setBusy(true)
    setActionError('')
    setNotice('')
    try {
      await api.patch('/api/sales-schools/' + id, changes)
      refresh()
      setNotice('School updated.')
      setAction(null)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const log = async (event) => {
    event.preventDefault()
    setBusy(true)
    setActionError('')
    try {
      await api.post('/api/sales-schools/' + id + '/activity', activity)
      setActivity((old) => ({ ...old, detail: '' }))
      reload()
      setNotice('Activity added.')
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const completeTask = async (task) => {
    setBusy(true)
    setActionError('')
    try {
      await api.patch('/api/crm/tasks/' + task.id, {
        status: 'completed',
        version: task.version,
      })
      taskData.reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <AppLayout
      title={school?.school_name || 'School workspace'}
      subtitle={school?.address || 'One place for the whole relationship.'}
      actions={
        <>
          <Link to="/schools" className="modern-btn-primary is-neutral">
            All schools
          </Link>
          {school && (
            <button
              className="modern-btn-primary"
              onClick={() => setEdit(true)}
            >
              Edit school
            </button>
          )}
          {canDelete && (
            <button
              className="modern-btn-primary is-danger"
              onClick={deleteSchool}
              disabled={busy}
            >
              Delete
            </button>
          )}
        </>
      }
    >
      <ErrorNotice error={error || actionError || taskData.error} />
      {notice && (
        <div
          className="ui-alert tone-success"
          role="status"
          style={{ marginBottom: 18 }}
        >
          {notice}
        </div>
      )}
      {!school ? (
        <Empty
          title={loading ? 'Loading school...' : 'School unavailable'}
          text="You can access schools assigned to you, or all schools as an administrator."
          icon="school"
        />
      ) : (
        <>
          <div
            className="workspace-toolbar"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 9,
              marginBottom: 22,
            }}
          >
            <span className="workspace-label" style={{ margin: 0 }}>
              Stage
            </span>
            <select
              className="workspace-select"
              value={school.status}
              disabled={busy}
              aria-label="School stage"
              onChange={(e) => save({ status: e.target.value })}
            >
              {STAGES.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
            <span className="workspace-label" style={{ margin: '0 0 0 12px' }}>
              Owner
            </span>
            {user.admin ? (
              <select
                className="workspace-select"
                aria-label="School owner"
                value={school.user_id}
                disabled={busy}
                onChange={(e) => save({ user_id: Number(e.target.value) })}
              >
                {(team || [{ id: school.user_id, name: school.user_name }]).map(
                  (person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ),
                )}
              </select>
            ) : (
              <span style={{ fontSize: '.75rem' }}>{school.user_name}</span>
            )}
            {school.closed_at && (
              <span className="workspace-closed-note">
                Closed {dateLabel(school.closed_at)}
                {school.closed_by_name ? ` by ${school.closed_by_name}` : ''}
              </span>
            )}
            <Link
              className="modern-btn-primary is-neutral is-small"
              style={{ marginLeft: 'auto' }}
              to={'/emails?school_ids=' + id}
            >
              <Icon name="mail" size={14} />
              Open outreach
            </Link>
          </div>
          <div className="workspace-grid workspace-school-grid">
            <div style={{ display: 'grid', gap: 21, alignContent: 'start' }}>
              <Panel title="Contact details">
                <div className="workspace-form">
                  {[
                    ['Primary contact', school.contact_name],
                    ['Email', school.email],
                    ['Phone', school.phone],
                    ['School type', school.school_type],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="workspace-label">{label}</span>
                      {label === 'Email' ? (
                        <a
                          style={{
                            fontSize: '.77rem',
                            overflowWrap: 'anywhere',
                          }}
                          href={'mailto:' + value}
                        >
                          {value}
                        </a>
                      ) : label === 'Phone' && value ? (
                        <a style={{ fontSize: '.77rem' }} href={'tel:' + value}>
                          {value}
                        </a>
                      ) : (
                        <span
                          style={{
                            fontSize: '.77rem',
                            textTransform: 'capitalize',
                          }}
                        >
                          {value || 'Not recorded'}
                        </span>
                      )}
                    </div>
                  ))}
                  {!!school.additional_emails?.length && (
                    <div>
                      <span className="workspace-label">Other contacts</span>
                      {school.additional_emails.map((email) => (
                        <div key={email}>
                          <a
                            style={{
                              fontSize: '.73rem',
                              overflowWrap: 'anywhere',
                            }}
                            href={'mailto:' + email}
                          >
                            {email}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <span className="workspace-label">Relationship notes</span>
                    <p style={{ fontSize: '.76rem', whiteSpace: 'pre-wrap' }}>
                      {school.notes ||
                        'Add context your team should know when you edit this school.'}
                    </p>
                  </div>
                </div>
              </Panel>
              <Panel title="Next action">
                <p style={{ fontSize: '.8rem', color: 'var(--color-text)' }}>
                  {school.next_action || 'What’s the next step?'}
                </p>
                <p
                  className="workspace-subtle"
                  style={{ margin: '8px 0 16px' }}
                >
                  {dueLabel(school.next_action_at)}
                </p>
                <div className="workspace-actions">
                  <button
                    className="modern-btn-primary is-neutral is-small"
                    onClick={() =>
                      setAction({
                        text: school.next_action || '',
                        date: school.next_action_at?.slice(0, 10) || '',
                      })
                    }
                  >
                    Set next action
                  </button>
                  {school.next_action && (
                    <button
                      className="ui-link-button"
                      style={{ fontSize: '.7rem' }}
                      disabled={busy}
                      onClick={() =>
                        save({ next_action: '', next_action_at: null })
                      }
                    >
                      Clear action
                    </button>
                  )}
                </div>
              </Panel>
              <Panel title="School tasks" to={'/tasks?school=' + id}>
                <ul className="workspace-list">
                  {taskData.data?.items?.map((task) => (
                    <li className="workspace-list-item" key={task.id}>
                      <button
                        className="workspace-check"
                        disabled={busy}
                        onClick={() => completeTask(task)}
                        aria-label={'Complete ' + task.title}
                      />
                      <div className="grow">
                        <strong>{task.title}</strong>
                        <small>{dueLabel(task.due_at)}</small>
                      </div>
                    </li>
                  ))}
                </ul>
                {!taskData.data?.total && (
                  <p className="workspace-subtle">
                    No open tasks for this school.
                  </p>
                )}
                <button
                  className="ui-link-button"
                  style={{ fontSize: '.72rem', marginTop: 15 }}
                  onClick={() => setNewTask(true)}
                >
                  + Add a task
                </button>
              </Panel>
            </div>
            <Panel
              title="Relationship timeline"
              description="The emails, notes, and conversations that move things forward."
            >
              <form
                onSubmit={log}
                className="workspace-form"
                style={{
                  paddingBottom: 23,
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <textarea
                  className="ui-input"
                  aria-label="Activity note"
                  placeholder="Log a call, capture a meeting, or leave a note..."
                  rows={3}
                  required
                  maxLength={2000}
                  value={activity.detail}
                  onChange={(e) =>
                    setActivity((old) => ({ ...old, detail: e.target.value }))
                  }
                />
                <div
                  className="workspace-inline"
                  style={{ justifyContent: 'space-between' }}
                >
                  <select
                    className="workspace-select"
                    aria-label="Activity type"
                    value={activity.kind}
                    onChange={(e) =>
                      setActivity((old) => ({ ...old, kind: e.target.value }))
                    }
                  >
                    <option value="note">Note</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                  </select>
                  <button
                    className="modern-btn-primary is-small"
                    disabled={busy || !activity.detail.trim()}
                  >
                    {busy ? 'Saving...' : 'Log activity'}
                  </button>
                </div>
              </form>
              <ul className="workspace-list" style={{ marginTop: 23 }}>
                {data.timeline?.map((item, index) => (
                  <li
                    className="workspace-list-item"
                    style={{ alignItems: 'flex-start', paddingBlock: 17 }}
                    key={index}
                  >
                    <span className="workspace-activity-dot">
                      <Icon
                        name={
                          item.kind === 'call'
                            ? 'phone'
                            : item.kind === 'meeting'
                              ? 'calendar'
                              : item.kind === 'outreach' ||
                                  item.kind === 'received'
                                ? 'mail'
                                : 'check'
                        }
                        size={15}
                      />
                    </span>
                    <div className="grow">
                      <strong style={{ textTransform: 'capitalize' }}>
                        {item.kind.replace('_', ' ')}
                        {item.actor ? ' · ' + item.actor : ''}
                      </strong>
                      {item.detail?.length > 600 ? (
                        <details style={{ fontSize: '.76rem', marginTop: 6 }}>
                          <summary>Read full message</summary>
                          <p style={{ whiteSpace: 'pre-wrap' }}>
                            {item.detail}
                          </p>
                        </details>
                      ) : (
                        <p
                          style={{
                            fontSize: '.76rem',
                            whiteSpace: 'pre-wrap',
                            marginTop: 5,
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {item.detail || item.subject || 'No message text'}
                        </p>
                      )}
                    </div>
                    <span className="workspace-date">{dateLabel(item.at)}</span>
                  </li>
                ))}
              </ul>
              {!data.timeline?.length && (
                <Empty
                  title="Start the conversation"
                  text="Your activity and email history will appear here."
                  icon="clock"
                />
              )}
            </Panel>
          </div>
        </>
      )}
      {edit && school && (
        <EditSchool
          school={school}
          onClose={() => setEdit(false)}
          onSave={reload}
        />
      )}
      {newTask && school && (
        <TaskDialog
          school={school}
          onClose={() => setNewTask(false)}
          onSaved={taskData.reload}
        />
      )}
      {action && (
        <Modal
          title="Set the next action"
          onClose={() => setAction(null)}
          footer={
            <button
              form="next-action"
              className="modern-btn-primary"
              disabled={busy}
            >
              Save next action
            </button>
          }
        >
          <form
            id="next-action"
            className="workspace-form"
            onSubmit={(e) => {
              e.preventDefault()
              save({
                next_action: action.text,
                next_action_at: action.date ? action.date + 'T00:00:00' : null,
              })
            }}
          >
            <label className="workspace-field">
              Next step
              <input
                autoFocus
                className="ui-input"
                required
                value={action.text}
                onChange={(e) =>
                  setAction((old) => ({ ...old, text: e.target.value }))
                }
              />
            </label>
            <label className="workspace-field">
              Due date
              <input
                type="date"
                className="ui-input"
                value={action.date}
                onChange={(e) =>
                  setAction((old) => ({ ...old, date: e.target.value }))
                }
              />
            </label>
          </form>
        </Modal>
      )}
    </AppLayout>
  )
}
