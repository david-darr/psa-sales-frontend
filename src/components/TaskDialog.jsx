import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { localToday, useDebounced, useResource } from '../lib/crm'
import api from '../lib/api'
import Modal from './Modal'
import { ErrorNotice } from './WorkspaceUI'

export default function TaskDialog({ onClose, onSaved, school }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(localToday())
  const [priority, setPriority] = useState('normal')
  const [owner, setOwner] = useState(school?.user_id || user.id)
  const [selectedSchool, setSelectedSchool] = useState(school || null)
  const [search, setSearch] = useState('')
  const term = useDebounced(search)
  const { data: matches } = useResource(
    !school && term.trim()
      ? `/api/crm/schools?q=${encodeURIComponent(term)}&limit=8`
      : null,
  )
  const { data: team } = useResource(user.admin ? '/api/crm/team' : null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post('/api/crm/tasks', {
        title,
        due_at: date ? `${date}T00:00:00` : null,
        priority,
        school_id: selectedSchool?.id || null,
        user_id: Number(owner),
      })
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal
      title="Create a task"
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
            form="new-task-form"
            type="submit"
            disabled={saving || !title.trim()}
          >
            {saving ? 'Creating...' : 'Create task'}
          </button>
        </>
      }
    >
      <ErrorNotice error={error} />
      <form id="new-task-form" onSubmit={submit} className="workspace-form">
        <label className="workspace-field">
          What needs to happen?
          <input
            autoFocus
            className="ui-input"
            value={title}
            maxLength={240}
            required
            placeholder="e.g. Call the director about spring programs"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="workspace-form-grid">
          <label className="workspace-field">
            Due date
            <input
              type="date"
              className="ui-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="workspace-field">
            Priority
            <select
              className="ui-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="high">High priority</option>
            </select>
          </label>
        </div>
        <div className="workspace-field">
          School (optional)
          {selectedSchool ? (
            <div className="workspace-inline">
              <strong>{selectedSchool.school_name}</strong>
              {!school && (
                <button
                  type="button"
                  className="ui-link-button"
                  onClick={() => {
                    setSelectedSchool(null)
                    setSearch('')
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <>
              <input
                className="ui-input"
                value={search}
                placeholder="Search a school to link this task"
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Find school for task"
              />
              {matches?.items?.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="modern-btn-primary is-neutral"
                  onClick={() => {
                    setSelectedSchool(item)
                    setOwner(item.user_id)
                  }}
                >
                  {item.school_name} · {item.user_name}
                </button>
              ))}
            </>
          )}
        </div>
        {user.admin && (
          <label className="workspace-field">
            Assigned to
            <select
              className="ui-select"
              value={owner}
              disabled={Boolean(selectedSchool)}
              onChange={(e) => setOwner(Number(e.target.value))}
            >
              {(team || [{ id: user.id, name: user.name }]).map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            {selectedSchool && (
              <small className="workspace-subtle">
                School tasks stay with the school’s owner.
              </small>
            )}
          </label>
        )}
      </form>
    </Modal>
  )
}
