import { useEffect, useRef } from 'react'
import '../styles/ui.css'

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
export default function Modal({ title, onClose, size = 'md', footer, children }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
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
    panelRef.current?.focus()
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
            ✕
          </button>
        </div>

        <div className="ui-modal-body">{children}</div>

        {footer && <div className="ui-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
