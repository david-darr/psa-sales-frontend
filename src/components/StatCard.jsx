import '../styles/ui.css'

/**
 * A single metric tile for the stat row at the top of a page.
 *
 * @param {string}           label    Header text (e.g. "Total Schools").
 * @param {ReactNode}        [icon]
 * @param {number|string}    value    The metric. Strings render smaller than numbers.
 * @param {string}           [caption] Small uppercase line under the value.
 * @param {'primary'|'success'|'warning'|'danger'|'info'} [tone='primary']
 */
export default function StatCard({ label, icon, value, caption, tone = 'primary' }) {
  // A numeric metric is the headline; a status word like "Connected" should
  // not be set at 2rem next to it.
  const isText = typeof value === 'string'

  return (
    <div className={`modern-dashboard-card ui-stat-card tone-${tone}`}>
      <div className="modern-card-header">
        <div className="modern-card-title">{label}</div>
        {icon && (
          <div className="modern-card-icon" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
      <div className="modern-card-content ui-stat-body">
        <div className={`ui-stat-value${isText ? ' is-text' : ''}`}>{value}</div>
        {caption && <div className="ui-stat-caption">{caption}</div>}
      </div>
    </div>
  )
}
