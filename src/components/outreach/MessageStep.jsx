import { salesText, salesWorkspace } from '../../lib/salesWorkspace'
import { useRef } from 'react'
import { useSharedTemplates } from '../../emails/useSharedTemplates'
import AttachmentPicker from './AttachmentPicker'
import MarkupToolbar from '../../emails/MarkupToolbar'
import { DEFAULT_TEMPLATES, KINDS, TEMPLATE_VARS } from '../../emails/constants'

/** Subject, body, variables and attachments. `message.custom` false means the standard template. */
export default function MessageStep({ kind, message, onChange }) {
  const bodyRef = useRef(null)
  const library = useSharedTemplates()
  const always = kind === 'custom' || salesWorkspace() === 'business'
  const editing = always || message.custom

  const setMode = (custom) => {
    const copy = { ...message, template_id: undefined, template_revision: undefined, template_audience: undefined }
    if (custom && !message.subject && !message.body) {
      const seed = DEFAULT_TEMPLATES[kind] || DEFAULT_TEMPLATES.custom
      onChange({ ...copy, custom: true, subject: seed.subject, body: seed.body })
    } else {
      onChange({ ...copy, custom })
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
        {kind !== 'custom' && <label className="ou-field"><span className="ou-label">Shared template</span>
          <select className="ou-input" value={message.template_id || ''} onChange={(event) => {
            const chosen = library.items.find((item) => item.id === Number(event.target.value))
            if (chosen) onChange({ ...message, template_id: chosen.id, template_revision: chosen.revision, template_audience: chosen.audience, custom: true, subject: chosen.subject, body: chosen.body, attachments: false })
            else onChange({ ...message, template_id: undefined, template_revision: undefined, template_audience: undefined })
          }}><option value="">Use standard or custom copy</option>{library.items.filter((item) => item.kind === kind && !item.archived).map((item) => <option key={item.id} value={item.id}>{item.name} · v{item.revision}</option>)}</select>
          {library.error && <span role="alert">{library.error}</span>}
        </label>}
        {message.template_id && <p className="ou-muted">Editing a batch copy of version {message.template_revision}. The shared library stays unchanged. Every recipient must be reviewed before sending.</p>}
        {!editing && (
          <p className="ou-muted" style={{ marginTop: 0 }}>
            {KINDS[kind]?.blurb}{salesText(" The standard message fills in each school and contact name. Choose Customize to write your own. ")}</p>
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
                {TEMPLATE_VARS.filter((item) => salesWorkspace() === 'business' ? item.token !== '{school name}' : item.token !== '{business name}').map(({ token }) => (
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
        <AttachmentPicker defaults={library.items.find((item) => item.id === message.template_id)?.attachments || []} selected={message.attachment_ids || []} onChange={(attachment_ids) => onChange({ ...message, attachment_ids, attachments: false })} />
      </div>
    </div>
  )
}
