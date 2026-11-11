import { useState } from 'react'
import Card from '../components/Card'
import ContactImport from '../components/ContactImport'
import { EMPTY_SCHOOL, SCHOOL_TYPES } from './constants'

/**
 * Manual school entry and CSV import, as two mutually exclusive panels.
 */
export default function AddSchoolsCard({ onAddSchool }) {
  const [mode, setMode] = useState(null) // null | 'manual' | 'csv'
  const [draft, setDraft] = useState(EMPTY_SCHOOL)
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (e) => setDraft((d) => ({ ...d, [field]: e.target.value }))

  const setAdditionalEmail = (index, value) =>
    setDraft((d) => ({
      ...d,
      additional_emails: d.additional_emails.map((e, i) => (i === index ? value : e)),
    }))

  const addEmailField = () =>
    setDraft((d) => ({ ...d, additional_emails: [...d.additional_emails, ''] }))

  const removeEmailField = (index) =>
    setDraft((d) => ({
      ...d,
      additional_emails: d.additional_emails.filter((_, i) => i !== index),
    }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    const ok = await onAddSchool(draft)
    setSubmitting(false)
    if (ok) {
      setDraft(EMPTY_SCHOOL)
      setMode(null)
    }
  }

  return (
    <Card title="Add Schools" icon="🏫" tone="success" style={{ marginBottom: 'var(--space-6)' }}>
      <div className="ui-btn-row" style={{ marginBottom: 'var(--space-5)' }}>
        <button
          className={`modern-btn-primary ${mode === 'manual' ? 'is-danger' : 'is-success'}`}
          onClick={() => setMode(mode === 'manual' ? null : 'manual')}
        >
          {mode === 'manual' ? 'Cancel Manual Entry' : 'Add Single School'}
        </button>
        <button
          className={`modern-btn-primary ${mode === 'csv' ? 'is-danger' : ''}`}
          onClick={() => setMode(mode === 'csv' ? null : 'csv')}
        >
          {mode === 'csv' ? 'Cancel CSV Upload' : 'Upload CSV File'}
        </button>
      </div>

      {mode === 'manual' && (
        <form onSubmit={handleSubmit}>
          <div className="ui-btn-row" style={{ marginBottom: 'var(--space-4)' }}>
            <input
              className="ui-input"
              placeholder="School Name *"
              value={draft.school_name}
              onChange={update('school_name')}
              required
              aria-label="School name"
            />
            <input
              className="ui-input"
              placeholder="Contact Name"
              value={draft.contact_name}
              onChange={update('contact_name')}
              aria-label="Contact name"
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label className="ui-field-label" htmlFor="school-primary-email">
              Primary Email *
            </label>
            <input
              id="school-primary-email"
              type="email"
              className="ui-input"
              placeholder="director@example.com"
              value={draft.email}
              onChange={update('email')}
              required
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <div className="ui-compose-row">
              <span className="ui-field-label" style={{ marginBottom: 0 }}>
                Additional Emails (Optional)
              </span>
              <button type="button" className="modern-btn-primary is-small" onClick={addEmailField}>
                + Add Email
              </button>
            </div>

            {draft.additional_emails.map((email, index) => (
              <div
                key={index}
                style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}
              >
                <input
                  type="email"
                  className="ui-input"
                  placeholder={`Additional Email ${index + 1}`}
                  value={email}
                  onChange={(e) => setAdditionalEmail(index, e.target.value)}
                  aria-label={`Additional email ${index + 1}`}
                />
                <button
                  type="button"
                  className="modern-btn-primary is-danger is-small"
                  onClick={() => removeEmailField(index)}
                  aria-label={`Remove additional email ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="ui-btn-row" style={{ marginBottom: 'var(--space-4)' }}>
            <input
              className="ui-input"
              placeholder="Phone"
              value={draft.phone}
              onChange={update('phone')}
              aria-label="Phone"
            />
            <input
              className="ui-input"
              placeholder="Address"
              value={draft.address}
              onChange={update('address')}
              aria-label="Address"
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label className="ui-field-label" htmlFor="school-type">
              School Type
            </label>
            <select
              id="school-type"
              className="ui-select"
              value={draft.school_type}
              onChange={update('school_type')}
              required
            >
              {SCHOOL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <label className="workspace-subtle"><input type="checkbox" checked={draft.shared_contact_confirmed || false} onChange={(e) => setDraft((old) => ({ ...old, shared_contact_confirmed: e.target.checked }))} /> Distinct school sharing a mailbox. Keep profiles separate; still check name and address.</label>
          <button
            type="submit"
            className="modern-btn-primary ui-block"
            disabled={submitting}
          >
            {submitting ? 'Adding...' : 'Add School'}
          </button>
        </form>
      )}

      {mode === 'csv' && <ContactImport />}
    </Card>
  )
}
