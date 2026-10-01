import { useCallback } from 'react'

/**
 * Bold / larger-text buttons for a plain-text composer.
 *
 * The backend's render_body_parts() turns **text** into <b> and ++text++ into
 * a larger span when it builds the HTML part of the message, so these markers
 * survive into the sent email.
 *
 * @param {React.RefObject<HTMLTextAreaElement>} textareaRef
 * @param {(value: string) => void} onChange
 */
export default function MarkupToolbar({ textareaRef, onChange }) {
  const wrapSelection = useCallback(
    (marker, placeholder) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const { selectionStart, selectionEnd, value } = textarea
      const selected = value.slice(selectionStart, selectionEnd)

      // Clicking the button again on already-wrapped text unwraps it.
      const wrapped =
        selected.startsWith(marker) &&
        selected.endsWith(marker) &&
        selected.length >= marker.length * 2

      const replacement = wrapped
        ? selected.slice(marker.length, -marker.length)
        : `${marker}${selected || placeholder}${marker}`

      onChange(value.slice(0, selectionStart) + replacement + value.slice(selectionEnd))

      // Restore focus after React has committed the new value, otherwise the
      // caret jumps to the end of the textarea.
      requestAnimationFrame(() => {
        textarea.focus()
        const caret = selectionStart + replacement.length
        textarea.setSelectionRange(caret, caret)
      })
    },
    [textareaRef, onChange],
  )

  return (
    <div className="ui-compose-tools">
      <button
        type="button"
        className="ui-tool-btn"
        onClick={() => wrapSelection('**', 'bold text')}
        title="Wrap the selected text in **bold**"
      >
        B
      </button>
      <button
        type="button"
        className="ui-tool-btn"
        onClick={() => wrapSelection('++', 'larger text')}
        title="Wrap the selected text in ++larger text++"
        style={{ fontSize: 'var(--text-base)' }}
      >
        A+
      </button>
    </div>
  )
}
