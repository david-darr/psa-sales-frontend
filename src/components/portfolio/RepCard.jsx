import { Link } from 'react-router-dom'
import Icon from '../Icon'
import { dateLabel, stageLabel } from '../../lib/crm'
import { repColor } from '../../lib/mapLayers'

const FILTERS = {
  active: ['partner'],
  former: ['former'],
  all: ['partner', 'former'],
}

export const stagesFor = (view) => FILTERS[view] || FILTERS.all

const activity = (value) => (value ? dateLabel(value) : 'No activity yet')

export default function RepCard({ rep, view, open, onToggle, you }) {
  const stages = stagesFor(view)
  const rows = rep.accounts.filter((account) => stages.includes(account.status))
  const color = repColor(rep.id)
  const maxed = Math.max(rep.counts.total, 1)
  const share = Math.round(((rep.counts.active + rep.counts.former) / maxed) * 100)
  const mapStages = stages.join(',')

  return (
    <section className={`pf-rep${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="pf-rep-head"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className="pf-avatar" style={{ '--rep-color': color }}>
          {rep.initials}
        </span>
        <span className="pf-rep-id">
          <span className="pf-rep-name">
            {rep.name}
            {you && <span className="pf-you">You</span>}
            {rep.admin && <span className="pf-tag">Admin</span>}
          </span>
          <span className="pf-rep-email">{rep.email}</span>
        </span>
        <span className="pf-rep-stats">
          <span className="pf-stat">
            <b>{rep.counts.active}</b>
            <i>Active</i>
          </span>
          <span className="pf-stat">
            <b>{rep.counts.former}</b>
            <i>Former</i>
          </span>
          <span className="pf-stat pf-hide-sm">
            <b>{rep.counts.pipeline}</b>
            <i>In pipeline</i>
          </span>
          <span className="pf-stat pf-hide-sm">
            <b>{rep.closed_last_90}</b>
            <i>Closed 90d</i>
          </span>
        </span>
        <span className="pf-chevron" aria-hidden="true">
          <Icon name="arrow" size={14} />
        </span>
      </button>
      <div
        className="pf-bar"
        role="img"
        aria-label={`${share}% of ${rep.name}'s schools are closed`}
      >
        <span style={{ width: `${share}%`, background: color }} />
      </div>

      {open && (
        <div className="pf-rep-body">
          {rows.length ? (
            <ul className="pf-accounts">
              {rows.map((account) => (
                <li key={account.id} className="pf-account">
                  <span className={`pf-dot is-${account.status}`} aria-hidden="true" />
                  <div className="pf-account-main">
                    <Link to={`/schools/${account.id}`} className="pf-account-name">
                      {account.school_name}
                    </Link>
                    <span className="pf-account-sub">
                      {[account.city, account.school_type].filter(Boolean).join(' · ') || 'No address'}
                    </span>
                  </div>
                  <span className="pf-account-meta pf-hide-sm">
                    <i>{stageLabel(account.status)}</i>
                    Closed {dateLabel(account.closed_at)}
                  </span>
                  <span className="pf-account-meta pf-hide-sm">
                    <i>Last activity</i>
                    {activity(account.last_activity_at)}
                  </span>
                  <Link
                    to={`/map?school=${account.id}&owner=${rep.id}&stages=${mapStages}`}
                    className="pf-link"
                    aria-label={`Show ${account.school_name} on the map`}
                  >
                    <Icon name="map" size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="pf-none">
              {view === 'former'
                ? `${rep.name} has no former clients.`
                : view === 'active'
                  ? `${rep.name} has no active clients yet.`
                  : `${rep.name} has not closed any schools yet.`}
            </div>
          )}
          {rows.length > 0 && (
            <div className="pf-rep-foot">
              <Link to={`/map?owner=${rep.id}&stages=${mapStages}`} className="pf-foot-link">
                <Icon name="map" size={14} />
                View {rows.length} on the map
              </Link>
              <Link to={`/schools?owner=${rep.id}`} className="pf-foot-link">
                All of {rep.name.split(' ')[0]}'s schools
                <Icon name="arrow" size={13} />
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
