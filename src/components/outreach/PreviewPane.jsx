import { useState } from 'react'
import { warningMeta } from '../../emails/constants'
import { Chip } from './bits'

/** One rendered email at a time, with a picker to flip through recipients. */
export default function PreviewPane({ previews, loading, error, truncated, onRetry }) {
  const [index, setIndex] = useState(0)
  const item = previews[Math.min(index, previews.length - 1)]

  if (error && !previews.length) {
    return (
      <div className="ou-card ou-card-body">
        <p className="ou-error" style={{ padding: 0 }}>
          {error}
        </p>
        <button type="button" className="ou-btn ou-btn-ghost ou-btn-sm" onClick={onRetry}>
          Try again
        </button>
      </div>
    )
  }
  if (!item) {
    return (
      <div className="ou-card ou-empty">
        {loading ? 'Building the preview...' : 'Select recipients to preview their message.'}
      </div>
    )
  }

  return (
    <div className="ou-card" aria-busy={loading}>
      <div className="ou-toolbar">
        <span className="ou-label">Preview</span>
        <select
          className="ou-select"
          aria-label="Preview recipient"
          value={Math.min(index, previews.length - 1)}
          onChange={(event) => setIndex(Number(event.target.value))}
          style={{ maxWidth: '100%', flex: 1 }}
        >
          {previews.map((entry, i) => (
            <option key={entry.school_id} value={i}>
              {i + 1}. {entry.school_name}
            </option>
          ))}
        </select>
        {loading && <span className="ou-muted ou-mono">Updating</span>}
      </div>
      <div className="ou-card-body">
        <div className="ou-mail">
          <div className="ou-mail-head">
            <span className="ou-muted">To {item.email || 'no email on file'}</span>
            <strong>{item.subject || '(no subject)'}</strong>
          </div>
          <div className="ou-mail-body" style={{ whiteSpace: 'pre-wrap' }}>
            {item.body_text}
          </div>
          {(item.attachments?.length > 0 || item.warnings?.length > 0) && (
            <div className="ou-mail-foot">
              {item.attachments?.map((file) => (
                <Chip key={file}>{file}</Chip>
              ))}
              {item.warnings?.map((key) => {
                const meta = warningMeta(key)
                return (
                  <Chip key={key} tone={meta.tone} title={meta.tip}>
                    {meta.label}
                  </Chip>
                )
              })}
            </div>
          )}
        </div>
        {truncated && (
          <p className="ou-sub" style={{ marginTop: 'var(--space-3)' }}>
            Previewing the first 100 recipients. Every recipient gets the same message with their own details filled
            in.
          </p>
        )}
        {error && (
          <p className="ou-error" style={{ padding: 'var(--space-3) 0 0' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
