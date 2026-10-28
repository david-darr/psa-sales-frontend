import { useState } from 'react'
import Modal from './Modal'
import api from '../lib/api'
import { ErrorNotice } from './WorkspaceUI'

export default function SchoolDialog({ onClose, onSaved, initial = {} }) {
  const [draft, setDraft] = useState({
    school_name: initial.name || '',
    email: initial.email || '',
    contact_name: initial.contact || '',
    address: initial.address || '',
    phone: initial.phone || '',
    school_type: 'preschool',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const change = (key, value) => setDraft((old) => ({ ...old, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const created = await api.post('/api/add-school', {
        ...draft,
        additional_emails: [],
      })
      onClose()
      onSaved(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal
      title="Add a school"
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
            form="new-school-form"
            className="modern-btn-primary"
            type="submit"
            disabled={saving}
          >
            {saving ? 'Adding...' : 'Add school'}
          </button>
        </>
      }
    >
      <ErrorNotice error={error} />
      <form id="new-school-form" className="workspace-form" onSubmit={submit}>
        <label className="workspace-field">
          School name
          <input
            autoFocus
            className="ui-input"
            required
            maxLength={240}
            value={draft.school_name}
            onChange={(e) => change('school_name', e.target.value)}
            placeholder="School or organization name"
          />
        </label>
        <label className="workspace-field">
          Primary email
          <input
            className="ui-input"
            required
            type="email"
            value={draft.email}
            onChange={(e) => change('email', e.target.value)}
            placeholder="director@school.org"
          />
        </label>
        <div className="workspace-form-grid">
          <label className="workspace-field">
            Contact name
            <input
              className="ui-input"
              value={draft.contact_name}
              onChange={(e) => change('contact_name', e.target.value)}
              placeholder="Director or administrator"
            />
          </label>
          <label className="workspace-field">
            School type
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
        <details>
          <summary className="workspace-subtle" style={{ cursor: 'pointer' }}>
            Address and phone
          </summary>
          <div className="workspace-form" style={{ marginTop: 15 }}>
            <label className="workspace-field">
              Address
              <input
                className="ui-input"
                value={draft.address}
                onChange={(e) => change('address', e.target.value)}
              />
            </label>
            <label className="workspace-field">
              Phone
              <input
                className="ui-input"
                type="tel"
                value={draft.phone}
                onChange={(e) => change('phone', e.target.value)}
              />
            </label>
          </div>
        </details>
        <p className="workspace-subtle">
          You’ll own this school. PSA checks for existing team assignments
          before adding it.
        </p>
      </form>
    </Modal>
  )
}
