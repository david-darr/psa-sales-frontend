import '../styles/ui.css'
import Icon from './Icon'
import iconForLabel from './iconForLabel'

/**
 * The dashboard card shell: optional titled header with an icon chip, then
 * content. Pages previously wrote out the `.modern-card-header` /
 * `.modern-card-title` / `.modern-card-icon` / `.modern-card-content`
 * structure by hand every time, usually with the icon's accent colour
 * inlined.
 *
 * @param {string}    [title]
 * @param {ReactNode} [icon]      Emoji or node for the header chip.
 * @param {'primary'|'success'|'warning'|'danger'|'info'} [tone='primary']
 * @param {ReactNode} [headerAside] Extra controls on the header row.
 * @param {string}    [className]
 */
export default function Card({
  title,
  icon,
  tone = 'primary',
  headerAside,
  className = '',
  children,
  ...rest
}) {
  const classes = ['modern-dashboard-card', `tone-${tone}`, className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      {(title || icon || headerAside) && (
        <div className="modern-card-header">
          {title && <div className="modern-card-title">{title}</div>}
          {headerAside}
          {icon && (
            <div className="modern-card-icon" aria-hidden="true">
              {typeof icon === 'string' ? <Icon name={iconForLabel(title)} size={16} /> : icon}
            </div>
          )}
        </div>
      )}
      <div className="modern-card-content">{children}</div>
    </div>
  )
}
