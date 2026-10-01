import { useState } from 'react'
import Card from '../components/Card'
import { EMPTY_SCHOOL, SCHOOL_TYPES, downloadCsvTemplate } from './constants'

/**
 * Manual school entry and CSV import, as two mutually exclusive panels.
 */
export default function AddSchoolsCard({ onAddSchool, onUploadCsv }) {
  const [mode, setMode] = useState(null) // null | 'manual' | 'csv'
  const [draft, setDraft] = useState(EMPTY_SCHOOL)
  const [submitting, setSubmitting] = useState(false)

  const [csvFile, setCsvFile] = useState(null)
  const [csvUploading, setCsvUploading] = useState(false)
  const [csvResult, setCsvResult] = useState(null)
  const [csvError, setCsvError] = useState('')

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

  const handleCsvChange = (e) => {
    const file = e.target.files?.[0]
    setCsvError('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Please choose a .csv file.')
      setCsvFile(null)
      return
    }
    setCsvFile(file)
  }

  const handleCsvSubmit = async (e) => {
    e.preventDefault()
    if (!csvFile) return
    setCsvUploading(true)
    const result = await onUploadCsv(csvFile)
    setCsvUploading(false)
    if (result) {
      // Results stay visible after a successful import so the added/skipped
      // counts and any per-row errors can actually be read.
      setCsvResult(result)
      setCsvFile(null)
    }
  }

  return (
    <Card title="Add Schools" icon="🏫" tone="success" style={{ marginBottom: 'var(--space-6)' }}>
      <div className="ui-btn-row" style={{ marginBottom: 'var(--space-5)' }}>
        <button
          className={`modern-btn-primary ${mode === 'manual' ? 'is-danger' : 'is-success'}`}
          onClick={() => setMode(mode === 'manual' ? null : 'manual')}
        >
          {mode === 'manual' ? '❌ Cancel Manual Entry' : '➕ Add Single School'}
        </button>
        <button
          className={`modern-btn-primary ${mode === 'csv' ? 'is-danger' : ''}`}
          onClick={() => setMode(mode === 'csv' ? null : 'csv')}
        >
          {mode === 'csv' ? '❌ Cancel CSV Upload' : '📄 Upload CSV File'}
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
                  ✕
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

          <button
            type="submit"
            className="modern-btn-primary is-success ui-block"
            disabled={submitting}
          >
            {submitting ? 'Adding...' : '✅ Add School'}
          </button>
        </form>
      )}

      {mode === 'csv' && (
        <div>
          <div className="ui-info-tile tone-primary" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="ui-info-title">📋 CSV Format Requirements</div>
            <div className="ui-info-body">
              <p>
                <strong>Required columns:</strong> school_name, email
              </p>
              <p>
                <strong>Optional columns:</strong> contact_name, phone, address, school_type
              </p>
              <p>
                <strong>School types:</strong>{' '}
                {SCHOOL_TYPES.map((t) => `"${t.value}"`).join(', ')} (defaults to preschool)
              </p>
              <p>
                <strong>Multiple emails:</strong> use a separate row per address, repeating the
                school name. Rows sharing a name are merged into one school.
              </p>
              <p style={{ color: 'var(--color-text-muted)' }}>
                Column names are flexible: variations like &quot;School Name&quot; and
                &quot;Contact Name&quot; are matched automatically.
              </p>
            </div>
          </div>

          <div className="ui-info-tile tone-success" style={{ marginBottom: 'var(--space-5)' }}>
            <div className="ui-info-title">📥 Sample CSV Template</div>
            <div className="ui-info-body" style={{ marginBottom: 'var(--space-3)' }}>
              Download a sample file to see the expected format:
            </div>
            <button className="modern-btn-primary is-success is-small" onClick={downloadCsvTemplate}>
              📄 Download Template
            </button>
          </div>

          <form onSubmit={handleCsvSubmit}>
            <input
              type="file"
              accept=".csv"
              className="ui-input"
              onChange={handleCsvChange}
              aria-label="CSV file"
              style={{ marginBottom: 'var(--space-4)' }}
            />

            {csvError && (
              <div className="ui-alert tone-danger" role="alert">
                {csvError}
              </div>
            )}

            {csvFile && (
              <div className="ui-alert tone-warning">📁 Selected file: {csvFile.name}</div>
            )}

            <button
              type="submit"
              className="modern-btn-primary ui-block"
              disabled={!csvFile || csvUploading}
            >
              {csvUploading ? '📤 Uploading...' : '📤 Upload CSV File'}
            </button>
          </form>

          {csvResult && (
            <div className="ui-info-tile tone-success" style={{ marginTop: 'var(--space-5)' }}>
              <div className="ui-info-title">✅ Upload Results</div>
              <div className="ui-info-body">
                <p>
                  Schools added:{' '}
                  <strong style={{ color: 'var(--color-success)' }}>
                    {csvResult.schools_added}
                  </strong>
                </p>
                <p>
                  Schools skipped:{' '}
                  <strong style={{ color: 'var(--color-warning)' }}>
                    {csvResult.schools_skipped}
                  </strong>
                </p>
                {csvResult.errors?.length > 0 && (
                  <div style={{ marginTop: 'var(--space-3)' }}>
                    <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>Row errors:</p>
                    <ul
                      style={{
                        marginLeft: 'var(--space-4)',
                        color: 'var(--color-danger)',
                        fontSize: '0.8rem',
                        listStyle: 'disc',
                      }}
                    >
                      {csvResult.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {csvResult.errors.length > 5 && (
                        <li>...and {csvResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
