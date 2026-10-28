import { useEffect, useRef } from 'react'
import '../styles/ui.css'
import Icon from './Icon'

/**
 * Dialog shell: scrim, panel, titled header with a close button.
 *
 * Replaces the hand-built modal markup that was inlined per dialog in
 * Emails.jsx. Those versions had no Escape handling, no scroll lock, no
 * click-outside, and no focus management.
 *
 * @param {string}    title
 * @param {() => void} onClose
 * @param {'md'|'lg'} [size='md']
 * @param {ReactNode} [footer]
 */
export default function Modal({
  title,
  onClose,
  size = 'md',
  footer,
  children,
}) {
  const panelRef = useRef(null)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const nodes = [
          ...(panelRef.current?.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
          ) || []),
        ].filter((node) => node.offsetParent !== null)
        const first = nodes[0],
          last = nodes[nodes.length - 1]
        if (!first) {
          event.preventDefault()
          panelRef.current?.focus()
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === panelRef.current)
        ) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Don't let the page behind the scrim scroll.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  // Move focus into the dialog so keyboard users are not left behind it.
  useEffect(() => {
    const previous = document.activeElement
    const first = panelRef.current?.querySelector(
      'input:not([disabled]), textarea:not([disabled]), select:not([disabled])',
    )
    if (first) first.focus()
    else panelRef.current?.focus()
    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [])

  return (
    <div
      className="ui-modal-scrim"
      onMouseDown={(event) => {
        // Only a press that both starts and ends on the scrim should close;
        // a drag that happens to finish out here should not.
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={`ui-modal ui-modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="ui-modal-header">
          <h2 className="ui-modal-title">{title}</h2>
          <button
            type="button"
            className="ui-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" size={17} />
          </button>
        </div>

        <div className="ui-modal-body">{children}</div>

        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
