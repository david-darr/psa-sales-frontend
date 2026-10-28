import { memo } from 'react'
import { Link } from 'react-router-dom'
import Glyph from './icons'
import {
  directionsUrl,
  formatKm,
  hostOf,
  safeHref,
  typeLabels,
} from './finderUtils'

function Stars({ rating, total }) {
  if (rating === null || rating === undefined) {
    return <span className="fd-muted fd-mono">No reviews</span>
  }
  const pct = Math.max(0, Math.min(100, (Number(rating) / 5) * 100))
  return (
    <span
      className="fd-rating"
      title={`${Number(rating).toFixed(1)} out of 5`}
    >
      <span
        className="fd-stars"
        style={{ '--fd-fill': `${pct}%` }}
        role="img"
        aria-label={`${Number(rating).toFixed(1)} out of 5 stars`}
      />
      <span className="fd-mono">{Number(rating).toFixed(1)}</span>
      {total !== null && total !== undefined && (
        <span className="fd-muted fd-mono">({total})</span>
      )}
    </span>
  )
}

function StatusBadge({ school, mine }) {
  if (!school.already_saved) {
    return (
      <span className="fd-badge is-new">
        <i className="fd-dot" aria-hidden="true" />
        New
      </span>
    )
  }
  const label = mine ? 'In your pipeline' : `Owned by ${school.owner_name || 'a teammate'}`
  const inner = (
    <>
      <i className="fd-dot" aria-hidden="true" />
      {label}
    </>
  )
  const cls = `fd-badge ${mine ? 'is-mine' : 'is-owned'}`
  return school.saved_school_id ? (
    <Link
      className={`${cls} is-link`}
      to={`/schools/${school.saved_school_id}`}
      title="Open school workspace"
    >
      {inner}
    </Link>
  ) : (
    <span className={cls}>{inner}</span>
  )
}

function ResultRow({
  school,
  rank,
  selected,
  hovered,
  active,
  mine,
  details,
  saving,
  observe,
  onToggle,
  onHover,
  onFocusPin,
  onSave,
  onEdit,
}) {
  const id = school.place_id
  const types = typeLabels(school.types)
  const loadingDetails = details === undefined
  const phone = details?.phone
  const website = details?.website
  const classes = [
    'fd-row',
    selected && 'is-selected',
    hovered && 'is-hover',
    active && 'is-active',
  ]
    .filter(Boolean)
    .join(' ')

  function handleRowClick(event) {
    if (event.target.closest('a, button, input, label, select')) return
    onFocusPin(id)
  }

  return (
    <li
      ref={observe}
      id={`fd-row-${id}`}
      data-place={id}
      className={classes}
      onMouseEnter={() => onHover(id)}
      onMouseLeave={() => onHover(null)}
      onClick={handleRowClick}
    >
      <label className="fd-check" title="Select for bulk actions">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(id)}
          aria-label={`Select ${school.school_name}`}
        />
        <span className="fd-check-box" aria-hidden="true">
          <Glyph name="check" size={12} />
        </span>
      </label>

      <span className="fd-rank fd-mono" aria-hidden="true">
        {rank}
      </span>

      <div className="fd-row-main">
        <div className="fd-row-head">
          <button
            type="button"
            className="fd-name"
            onClick={() => onFocusPin(id)}
            onFocus={() => onHover(id)}
            onBlur={() => onHover(null)}
            aria-label={`${school.school_name}, show on map`}
          >
            {school.school_name}
          </button>
          <StatusBadge school={school} mine={mine} />
        </div>

        <p className="fd-address-line">
          {school.address}
          {school.distance_km !== null && school.distance_km !== undefined && (
            <span className="fd-distance fd-mono">
              {formatKm(school.distance_km)}
            </span>
          )}
        </p>

        <div className="fd-meta">
          <Stars rating={school.rating} total={school.user_ratings_total} />
          {types.map((label) => (
            <span key={label} className="fd-tag">
              {label}
            </span>
          ))}
        </div>

        <div className="fd-contact" aria-live="polite">
          {loadingDetails ? (
            <span className="fd-skel fd-skel-line" style={{ width: 170 }} />
          ) : (
            <>
              {phone ? (
                <a href={`tel:${phone.replace(/[^+\d]/g, '')}`}>
                  <Glyph name="phone" size={13} />
                  <span className="fd-mono">{phone}</span>
                </a>
              ) : (
                <span className="fd-muted">No phone listed</span>
              )}
              {website && (
                <a
                  href={safeHref(website)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Glyph name="globe" size={13} />
                  {hostOf(website)}
                </a>
              )}
              {details?.hours_text && (
                <span className="fd-muted fd-hours" title={details.hours_text}>
                  {details.hours_text}
                </span>
              )}
            </>
          )}
        </div>

        <div className="fd-actions">
          {school.already_saved ? (
            school.saved_school_id && (
              <Link
                className="fd-btn fd-btn-ghost fd-btn-sm"
                to={`/schools/${school.saved_school_id}`}
              >
                Open workspace
              </Link>
            )
          ) : (
            <>
              <button
                type="button"
                className="fd-btn fd-btn-solid fd-btn-sm"
                onClick={() => onSave(school)}
                disabled={saving}
              >
                <Glyph name="plus" size={13} />
                {saving ? 'Saving...' : 'Save lead'}
              </button>
              <button
                type="button"
                className="fd-btn fd-btn-ghost fd-btn-sm"
                onClick={() => onEdit(school)}
                disabled={saving}
              >
                <Glyph name="edit" size={13} />
                Edit details
              </button>
            </>
          )}
          <a
            className="fd-btn fd-btn-ghost fd-btn-sm"
            href={directionsUrl(school)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Glyph name="directions" size={13} />
            Directions
            <span className="fd-sr">(opens Google Maps)</span>
          </a>
        </div>
      </div>
    </li>
  )
}

export default memo(ResultRow)

export function SkeletonRows({ count = 5 }) {
  return Array.from({ length: count }, (_, i) => (
    <li key={i} className="fd-row fd-row-skel" aria-hidden="true">
      <span className="fd-skel fd-skel-box" />
      <span className="fd-skel fd-skel-rank" />
      <div className="fd-row-main">
        <span className="fd-skel fd-skel-line" style={{ width: `${48 + ((i * 13) % 30)}%`, height: 14 }} />
        <span className="fd-skel fd-skel-line" style={{ width: `${62 + ((i * 7) % 24)}%` }} />
        <span className="fd-skel fd-skel-line" style={{ width: '34%' }} />
        <span className="fd-skel fd-skel-pill" />
      </div>
    </li>
  ))
}
