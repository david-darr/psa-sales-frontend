import { useRef } from 'react'
import MarkupToolbar from '../../emails/MarkupToolbar'
import { DEFAULT_TEMPLATES, KINDS, TEMPLATE_VARS } from '../../emails/constants'

/** Subject, body, variables and attachments. `message.custom` false means the standard template. */
export default function MessageStep({ kind, message, onChange }) {
  const bodyRef = useRef(null)
  const always = kind === 'custom'
  const editing = always || message.custom

  const setMode = (custom) => {
    if (custom && !message.subject && !message.body) {
      const seed = DEFAULT_TEMPLATES[kind] || DEFAULT_TEMPLATES.custom
      onChange({ ...message, custom: true, subject: seed.subject, body: seed.body })
    } else {
      onChange({ ...message, custom })
    }
  }

  const insertVariable = (token) => {
    const area = bodyRef.current
    const at = area ? area.selectionStart : message.body.length
    const end = area ? area.selectionEnd : at
    const body = message.body.slice(0, at) + token + message.body.slice(end)
    onChange({ ...message, body })
    requestAnimationFrame(() => {
      if (!area) return
      area.focus()
      area.setSelectionRange(at + token.length, at + token.length)
    })
  }

  return (
    <div className="ou-card">
      <div className="ou-card-head">
        <h3 className="ou-card-title">{KINDS[kind]?.label || 'Message'}</h3>
        {!always && (
          <div className="ou-seg" role="group" aria-label="Message source">
            <button type="button" className={!message.custom ? 'is-active' : ''} onClick={() => setMode(false)}>
              Standard
            </button>
            <button type="button" className={message.custom ? 'is-active' : ''} onClick={() => setMode(true)}>
              Customize
            </button>
          </div>
        )}
      </div>
      <div className="ou-card-body">
        {!editing && (
          <p className="ou-muted" style={{ marginTop: 0 }}>
            {KINDS[kind]?.blurb} The standard message fills in each school and contact name. Choose Customize to
            write your own.
          </p>
        )}
        {editing && (
          <>
            <label className="ou-field">
              <span className="ou-label">Subject</span>
              <input
                className="ou-input"
                value={message.subject}
                maxLength={200}
                onChange={(event) => onChange({ ...message, subject: event.target.value })}
              />
            </label>
            <div className="ou-field">
              <span className="ou-label">Message</span>
              <MarkupToolbar textareaRef={bodyRef} onChange={(body) => onChange({ ...message, body })} />
              <textarea
                ref={bodyRef}
                className="ou-textarea"
                aria-label="Message body"
                value={message.body}
                onChange={(event) => onChange({ ...message, body: event.target.value })}
              />
              <div className="ou-vars">
                {TEMPLATE_VARS.map(({ token }) => (
                  <button
                    key={token}
                    type="button"
                    className="ou-chip ou-chip-btn"
                    onClick={() => insertVariable(token)}
                    title="Insert at the cursor"
                  >
                    {token}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <label className="ou-checkline">
          <input
            type="checkbox"
            className="ou-check"
            checked={message.attachments}
            onChange={(event) => onChange({ ...message, attachments: event.target.checked })}
          />
          Attach the PSA program flyers
        </label>
      </div>
    </div>
  )
}
