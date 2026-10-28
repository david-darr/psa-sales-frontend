import { Link, useLocation } from 'react-router-dom'
import Icon from './Icon'
import { initials, stageColor, stageLabel } from '../lib/crm'
import { supportLink } from '../lib/support'

export function StageBadge({ stage }) {
  return (
    <span
      className={`stage-badge stage-${stage}`}
      style={{ '--stage-color': stageColor(stage) }}
    >
      {stageLabel(stage)}
    </span>
  )
}

/** Compact avatar with a person's initials. */
export function Avatar({ name, className = '' }) {
  return (
    <span className={`avatar-sm ${className}`} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

/** Segmented control. Options are { value, label }. */
export function Segmented({ value, onChange, options, label }) {
  return (
    <div className="workspace-seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'is-active' : ''}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
export function Panel({
  title,
  description,
  to,
  link = 'View all',
  children,
  className = '',
}) {
  return (
    <section className={`workspace-panel ${className}`}>
      <div className="workspace-panel-head">
        <div>
          <h2>{title}</h2>
          {description && (
            <p className="workspace-panel-description">{description}</p>
          )}
        </div>
        {to && (
          <Link to={to}>
            {link}
            <Icon name="arrow" size={13} />
          </Link>
        )}
      </div>
      <div className="workspace-panel-body">{children}</div>
    </section>
  )
}
export function Empty({ title = 'Nothing here yet', text, icon = 'check' }) {
  return (
    <div className="workspace-empty">
      <Icon name={icon} size={26} />
      <strong>{title}</strong>
      {text && <p>{text}</p>}
    </div>
  )
}
export function ErrorNotice({ error, report = true }) {
  const location = useLocation()
  return error ? (
    <div className="ui-alert tone-danger" role="alert">
      {error}
      {report && location.pathname !== '/support' && (
        <>
          {' '}
          <Link className="ui-link-button" to={supportLink(error, location.pathname)}>
            Report this problem
          </Link>
        </>
      )}
    </div>
  ) : null
}
export function Pagination({ page, limit, total, onPage, disabled }) {
  const pages = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="workspace-pagination">
      <span>
        {total
          ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total.toLocaleString()}`
          : '0 records'}
      </span>
      <div className="workspace-actions">
        <button
          className="modern-btn-primary is-neutral is-small"
          disabled={disabled || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <span>
          {page} / {pages}
        </span>
        <button
          className="modern-btn-primary is-neutral is-small"
          disabled={disabled || page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
