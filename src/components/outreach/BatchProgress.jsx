import { BATCH_STATUS, KINDS, RECIPIENT_STATUS, plural, relativeTime } from '../../emails/constants'
import { useBatchPoll } from '../../emails/useOutreach'
import { Chip, Dot } from './bits'

/** Live view of one send job. Works for finished batches too, where it just stops polling. */
export default function BatchProgress({ batchId, onSettled, onDone, doneLabel = 'Done' }) {
  const { batch, error, busy, cancel, retry } = useBatchPoll(batchId, onSettled)

  if (!batch) {
    return (
      <div className="ou-card ou-empty">
        {error ? <span className="ou-error">{error}</span> : 'Loading send progress...'}
      </div>
    )
  }

  const status = BATCH_STATUS[batch.status] || BATCH_STATUS.queued
  const finished = batch.sent + batch.failed + batch.skipped
  const pct = batch.total ? Math.round((finished / batch.total) * 100) : 100
  const active = batch.status === 'queued' || batch.status === 'sending'
  const isDone = !active

  return (
    <div className="ou-card" aria-live="polite">
      <div className="ou-card-head">
        <div>
          <h3 className="ou-card-title">
            {KINDS[batch.kind]?.label || 'Batch'} <span className="ou-muted ou-mono">#{batch.id}</span>
          </h3>
          <span className="ou-sub">Started {relativeTime(batch.created_at)}</span>
        </div>
        <Chip tone={status.tone === 'neutral' ? undefined : status.tone}>
          <Dot tone={status.tone} />
          {status.label}
        </Chip>
      </div>
      <div className="ou-card-body">
        <div
          className="ou-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Send progress"
        >
          <div className={`ou-progress-fill${isDone ? ' is-done' : ''}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="ou-summary" style={{ marginTop: 'var(--space-4)' }}>
          <div className="ou-stat">
            <span className="ou-label">Sent</span>
            <span className="ou-stat-num ou-mono">{batch.sent}</span>
          </div>
          <div className="ou-stat">
            <span className="ou-label">Failed</span>
            <span className="ou-stat-num ou-mono" style={batch.failed ? { color: 'var(--color-danger)' } : undefined}>
              {batch.failed}
            </span>
          </div>
          <div className="ou-stat">
            <span className="ou-label">Skipped</span>
            <span className="ou-stat-num ou-mono">{batch.skipped}</span>
          </div>
          <div className="ou-stat">
            <span className="ou-label">Total</span>
            <span className="ou-stat-num ou-mono">{batch.total}</span>
          </div>
        </div>
        {error && <p className="ou-error" style={{ padding: 'var(--space-3) 0 0' }}>{error}</p>}
      </div>

      {batch.recipients?.length > 0 && (
        <ul className="ou-list" aria-label="Recipients">
          {batch.recipients.map((row) => {
            const meta = RECIPIENT_STATUS[row.status] || RECIPIENT_STATUS.queued
            return (
              <li key={row.school_id}>
                <Dot tone={meta.tone} />
                <div className="ou-list-main">
                  <span className="ou-strong" style={{ display: 'inline' }}>
                    {row.school_name}
                  </span>
                  <span>{row.error ? row.error.replace(/_/g, ' ') : row.email}</span>
                </div>
                <span className="ou-muted ou-mono">{meta.label}</span>
              </li>
            )
          })}
        </ul>
      )}

      <div className="ou-pager">
        <span>{active ? `${plural(batch.total - finished, 'email')} to go` : 'Finished'}</span>
        <span className="ou-actionbar-buttons">
          {active && (
            <button type="button" className="ou-btn ou-btn-danger ou-btn-sm" onClick={cancel} disabled={busy}>
              Cancel remaining
            </button>
          )}
          {!active && batch.failed > 0 && (
            <button type="button" className="ou-btn ou-btn-ghost ou-btn-sm" onClick={retry} disabled={busy}>
              Retry {plural(batch.failed, 'failed email')}
            </button>
          )}
          {isDone && onDone && (
            <button type="button" className="ou-btn ou-btn-solid ou-btn-sm" onClick={onDone}>
              {doneLabel}
            </button>
          )}
        </span>
      </div>
    </div>
  )
}
