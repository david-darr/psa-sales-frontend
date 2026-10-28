import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Glyph from './icons'

/**
 * Result summary after a save: created vs skipped (with reasons), plus
 * deep links into the workspace and outreach. Stays until dismissed when
 * anything was skipped; otherwise fades out on its own.
 */
export default function SaveToast({ result, onDismiss, lifted }) {
  const createdCount = result?.created.length || 0
  const skippedCount = result?.skipped.length || 0
  const sticky = skippedCount > 0 || Boolean(result?.error)

  useEffect(() => {
    if (!result || sticky) return undefined
    const timer = setTimeout(onDismiss, 12000)
    return () => clearTimeout(timer)
  }, [result, sticky, onDismiss])

  if (!result) return null

  const ids = result.created.map((c) => c.id).filter(Boolean)
  const single = createdCount === 1 ? result.created[0] : null

  return (
    <div
      className={`fd-toast${lifted ? ' is-lifted' : ''}${result.error ? ' is-error' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="fd-toast-head">
        <span className="fd-toast-icon" aria-hidden="true">
          <Glyph name={result.error ? 'alert' : 'check'} size={14} />
        </span>
        <strong>
          {result.error
            ? 'Could not save leads'
            : createdCount > 0
              ? `Saved ${createdCount} lead${createdCount === 1 ? '' : 's'}`
              : 'No new leads saved'}
        </strong>
        <button
          type="button"
          className="fd-icon-btn"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <Glyph name="close" size={14} />
        </button>
      </div>

      {result.error && <p className="fd-toast-text">{result.error}</p>}
      {result.assignee && createdCount > 0 && (
        <p className="fd-toast-text">Assigned to {result.assignee}.</p>
      )}

      {skippedCount > 0 && (
        <div className="fd-toast-skipped">
          <p className="fd-toast-text">
            {skippedCount} skipped
          </p>
          <ul>
            {result.skipped.slice(0, 5).map((item) => (
              <li key={item.place_id}>
                <span>{item.name}</span>
                <span className="fd-muted">{item.reason}</span>
              </li>
            ))}
            {skippedCount > 5 && (
              <li className="fd-muted">and {skippedCount - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {createdCount > 0 && (
        <div className="fd-toast-actions">
          <Link
            className="fd-btn fd-btn-solid fd-btn-sm"
            to={`/emails?school_ids=${ids.join(',')}`}
          >
            <Glyph name="mail" size={13} />
            Start outreach
          </Link>
          {single && (
            <Link
              className="fd-btn fd-btn-ghost fd-btn-sm"
              to={`/schools/${single.id}`}
            >
              Open workspace
            </Link>
          )}
          {!single && (
            <Link className="fd-btn fd-btn-ghost fd-btn-sm" to="/schools">
              View schools
            </Link>
          )}
        </div>
      )}
      {result.retry && (
        <div className="fd-toast-actions">
          <button
            type="button"
            className="fd-btn fd-btn-solid fd-btn-sm"
            onClick={result.retry}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
