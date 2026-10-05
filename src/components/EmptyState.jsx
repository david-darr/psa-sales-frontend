import '../styles/ui.css'
import Icon from './Icon'
import iconForLabel from './iconForLabel'

/**
 * The "nothing here" / "still loading" panel used inside cards and tables.
 *
 * @param {ReactNode} [icon]
 * @param {string}    title
 * @param {ReactNode} [message]
 * @param {ReactNode} [action]  Usually a button.
 */
export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="ui-empty-state">
      {icon && (
        <div className="ui-empty-icon" aria-hidden="true">
          {typeof icon === 'string' ? <Icon name={iconForLabel(title)} size={24} /> : icon}
        </div>
      )}
      <h3 className="ui-empty-title">{title}</h3>
      {message && <p className="ui-empty-message">{message}</p>}
      {action}
    </div>
  )
}
