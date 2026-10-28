import { Link } from 'react-router-dom'
import Icon from '../Icon'
import {
  MAP_LAYERS,
  directionsUrl,
  formatDate,
  initialsOf,
  stageMeta,
} from '../../lib/mapLayers'

/** Details for the selected map point: one of our accounts or a prospect location. */
export default function AccountCard({ point, onClose }) {
  if (!point) return null
  const isAccount = point.kind === 'account'
  const layer = !isAccount && MAP_LAYERS.find((item) => item.key === point.layer)
  const stage = isAccount ? stageMeta(point.status) : null
  const directions = directionsUrl(point.address)
  const closed = isAccount && point.closed_at ? formatDate(point.closed_at) : ''

  return (
    <aside className="tm-detail" aria-label={`Details for ${point.name}`}>
      <button
        type="button"
        className="tm-icon-btn tm-detail-close"
        onClick={onClose}
        aria-label="Close details"
      >
        <Icon name="close" size={14} />
      </button>
      <div className="tm-detail-kicker">
        {isAccount ? (
          <>
            <span className="tm-dot" style={{ '--dot': stage.color }} />
            {stage.label}
          </>
        ) : (
          <>
            <span className="tm-dot" style={{ '--dot': layer?.swatch }} />
            {layer?.popup || 'Location'}
          </>
        )}
      </div>
      <h2>{point.name}</h2>
      {point.address && <p className="tm-detail-address">{point.address}</p>}

      {isAccount && (
        <dl className="tm-detail-facts">
          <div>
            <dt>Rep</dt>
            <dd>
              <span
                className="tm-avatar"
                style={{ '--avatar': point.color }}
                aria-hidden="true"
              >
                {initialsOf(point.owner_name)}
              </span>
              {point.owner_name || 'Unassigned'}
            </dd>
          </div>
          {closed && (
            <div>
              <dt>Closed</dt>
              <dd>{closed}</dd>
            </div>
          )}
          {point.school_type && (
            <div>
              <dt>Type</dt>
              <dd className="tm-cap">{point.school_type}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="tm-detail-actions">
        {isAccount && (
          <Link className="tm-btn tm-btn-solid" to={`/schools/${point.id}`}>
            Open school
            <Icon name="arrow" size={13} />
          </Link>
        )}
        {directions && (
          <a
            className="tm-btn"
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get directions
          </a>
        )}
      </div>
    </aside>
  )
}
