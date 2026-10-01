import '../styles/ui.css'

/**
 * Small coloured pill. Used for the "YOU" marker, performance tiers and
 * role labels, each of which previously inlined its own background/colour
 * pair through a nested ternary.
 *
 * @param {'primary'|'success'|'warning'|'danger'|'info'|'neutral'} [tone='primary']
 * @param {boolean} [compact]
 */
export default function Badge({ tone = 'primary', compact = false, children }) {
  const toneClass = tone === 'neutral' ? 'ui-badge-neutral' : `tone-${tone}`
  return (
    <span className={`ui-badge ${toneClass}${compact ? ' is-compact' : ''}`}>{children}</span>
  )
}
