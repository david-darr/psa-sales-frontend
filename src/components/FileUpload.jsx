import { useId, useRef, useState } from 'react'
import Icon from './Icon'
import '../styles/file-upload.css'

/** Shared file chooser. The caller retains validation and upload/preview behavior. */
export default function FileUpload({ label, hint, accept, onFileSelect, disabled = false, busy = false, buttonLabel = 'Choose file' }) {
  const id = useId()
  const inputRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const unavailable = disabled || busy
  const size = selected ? (selected.size < 1048576 ? `${Math.max(1, Math.ceil(selected.size / 1024))} KB` : `${(selected.size / 1048576).toFixed(1)} MB`) : ''
  const choose = (event) => {
    const file = event.target.files?.[0]
    // Reset so choosing the same file again still triggers a change event.
    event.target.value = ''
    if (!file || unavailable) return
    setSelected({ name: file.name, size: file.size })
    onFileSelect(file)
  }
  return <div className={`file-upload${unavailable ? ' is-disabled' : ''}`} role="group" aria-labelledby={`${id}-label`} aria-busy={busy}>
    <span className="file-upload__label" id={`${id}-label`}>{label}</span>
    <div className="file-upload__row">
      <input ref={inputRef} type="file" hidden accept={accept} disabled={unavailable} onChange={choose} />
      <button type="button" className="file-upload__button" disabled={unavailable} onClick={() => inputRef.current?.click()} aria-labelledby={`${id}-label ${id}-action`} aria-describedby={hint ? `${id}-hint` : undefined}>
        <span className={`file-upload__icon${busy ? ' is-busy' : ''}`}><Icon name={busy ? 'refresh' : 'upload'} size={18} /></span>
        <span id={`${id}-action`}>{busy ? 'Working...' : buttonLabel}</span>
        <span className="file-upload__tag" aria-hidden="true">{selected ? 'CHANGE' : 'BROWSE'}</span>
      </button>
      <span className="file-upload__selection" role="status" aria-live="polite" aria-atomic="true">
        {selected ? <><span className="file-upload__name" title={selected.name}>{selected.name}</span><span className="file-upload__size">{size}</span></> : <span className="file-upload__empty">No file selected</span>}
      </span>
    </div>
    {hint && <span className="file-upload__hint" id={`${id}-hint`}>{hint}</span>}
  </div>
}
