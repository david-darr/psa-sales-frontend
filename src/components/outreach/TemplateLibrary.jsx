import { useEffect, useState } from 'react'
import FileUpload from '../FileUpload'
import TemplateImport from './TemplateImport'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'
import { useSharedTemplates } from '../../emails/useSharedTemplates'

const AUDIENCES = { principal_ap: 'Principal / school staff', pta_pto: 'PTA / PTO', enrichment: 'Enrichment coordinator', trunk_or_treat: 'Trunk-or-Treat contacts', general: 'General' }
const blank = () => ({ name: '', audience: 'general', kind: 'initial', step: 0, subject: '', body: '', attachments: [], archived: false })

export default function TemplateLibrary() {
  const { user } = useAuth()
  const library = useSharedTemplates(user?.admin === true)
  const [draft, setDraft] = useState(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [history, setHistory] = useState(null)
  const [assets, setAssets] = useState([])
  const [savedAssets, setSavedAssets] = useState([])
  useEffect(() => {
    if (!user?.admin) return
    let alive = true
    api.get('/api/outreach/template-assets').then((data) => alive && (setAssets(data.items), setSavedAssets(data.saved || []))).catch((err) => alive && setError(err.message))
    return () => { alive = false }
  }, [user?.admin])
  const upload = (file) => act(async () => {
    const selected = draft.attachment_ids || draft.attachments?.map((item) => item.id) || []
    if (selected.length >= 3) throw new Error('Choose up to three PDFs per template.')
    if (file.size > 10485760 || !file.name.toLowerCase().endsWith('.pdf')) throw new Error('Choose a PDF of at most 10 MB.')
    if (draft.attachments.reduce((sum, item) => sum + item.bytes, 0) + file.size > 15728640) throw new Error('Template PDFs must total at most 15 MB.')
    const formData = new FormData(); formData.append('file', file)
    const asset = await api.post('/api/outreach/template-assets', undefined, { formData })
    setSavedAssets((current) => [...current.filter((item) => item.id !== asset.id), asset])
    setDraft((current) => ({ ...current, attachment_ids: [...new Set([...selected, asset.id])], attachments: [...current.attachments.filter((item) => item.id !== asset.id), asset] }))
    setNotice('PDF uploaded. Save this template version to attach it on every use.')
  })
  const field = (key, value) => setDraft((current) => ({ ...current, [key]: value }))
  const act = async (action) => {
    setBusy(true); setError(''); setNotice('')
    try { await action(); library.reload() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  const save = () => act(async () => {
    const saved = draft.id ? await api.put(`/api/outreach/templates/${draft.id}`, draft) : await api.post('/api/outreach/templates', draft)
    setSavedAssets((current) => [...new Map([...current, ...saved.attachments].map((asset) => [asset.id, asset])).values()])
    setDraft(saved); setHistory(null); setNotice(`Saved version ${saved.revision}. Queued messages are unchanged.`)
  })
  const seed = () => act(async () => {
    const result = await api.post('/api/outreach/templates/seed-winter-2027', {})
    setNotice(`Added ${result.added} templates; ${result.existing} already present. No sending schedule changed.`)
  })
  const edit = (item) => { setDraft({ ...item }); setHistory(null); setError(''); setNotice('') }
  const rows = library.items.filter((item) => `${item.name} ${AUDIENCES[item.audience]}`.toLowerCase().includes(search.toLowerCase()))
  return <section className="ou-card">
    <div className="ou-card-head"><div><h3 className="ou-card-title">Shared template library</h3><p className="ou-muted">Choose these in Compose or Follow-ups. Edits there affect only your batch.</p></div>
      {user?.admin && <div className="template-actions"><button className="ou-btn ou-btn-ghost" disabled={busy} onClick={seed}>Import Chris’s 16 templates</button><button className="ou-btn ou-btn-primary" disabled={busy} onClick={() => edit(blank())}>New template</button></div>}
    </div>
    <div className="ou-card-body">
      <p className="ou-muted">Templates do not schedule messages. Chris’s suggested days 0, 4, 10 and 17 are reference information; the current follow-up schedule stays in effect. Chris’s source templates have no attachments. Save reusable PDFs on a template and they attach automatically every time it is used. Follow-up templates start without files; admins can add them explicitly.</p>
      {(error || library.error) && <p className="ou-callout tone-danger" role="alert">{error || library.error}</p>}
      {notice && <p className="ou-callout tone-success" role="status">{notice}</p>}
      <label className="ou-field"><span className="ou-label">Find a template</span><input className="ou-input" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      {library.loading && <p role="status">Loading templates...</p>}
      {!library.loading && !rows.length && <p>No templates found.{user?.admin ? ' Import Chris’s templates or create one.' : ' Ask an admin to add shared templates.'}</p>}
      {user?.admin && <TemplateImport onImported={library.reload} />}
      <div className="template-grid">{rows.map((item) => <button key={item.id} type="button" className={`template-tile${draft?.id === item.id ? ' is-active' : ''}`} disabled={busy} onClick={() => edit(item)}>
        <strong>{item.name}</strong><span>{AUDIENCES[item.audience]} · {item.step ? `Follow-up ${item.step}` : 'Intro'} · v{item.revision}{item.archived ? ' · Archived' : ''}</span>
      </button>)}</div>
      {draft && <div className="template-editor">
        <h4>{draft.id ? `Template version ${draft.revision}` : 'New template'}</h4>
        <label className="ou-field"><span className="ou-label">Name</span><input className="ou-input" value={draft.name} maxLength={180} readOnly={!user?.admin || busy} onChange={(event) => field('name', event.target.value)} /></label>
        <label className="ou-field"><span className="ou-label">Audience</span><select className="ou-input" value={draft.audience} disabled={!user?.admin || busy} onChange={(event) => field('audience', event.target.value)}>{Object.entries(AUDIENCES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
        <label className="ou-field"><span className="ou-label">Message step</span><select className="ou-input" value={draft.step} disabled={!user?.admin || busy} onChange={(event) => setDraft({ ...draft, step: Number(event.target.value), kind: Number(event.target.value) ? 'followup' : 'initial' })}>{[0, 1, 2, 3].map((step) => <option key={step} value={step}>{step ? `Follow-up ${step}` : 'Intro'}</option>)}</select></label>
        <label className="ou-field"><span className="ou-label">Subject</span><input className="ou-input" maxLength={200} value={draft.subject} readOnly={!user?.admin || busy} onChange={(event) => field('subject', event.target.value)} /></label>
        <label className="ou-field"><span className="ou-label">Body</span><textarea className="ou-textarea" value={draft.body} readOnly={!user?.admin || busy} onChange={(event) => field('body', event.target.value)} /></label>
        {user?.admin && <fieldset className="ou-field" disabled={busy}>
          <legend className="ou-label">PDFs included every time this template is used</legend>
          <FileUpload key={draft.id || 'new'} label="Upload a reusable PDF" hint="PDF, up to 10 MB. Save the template to include it on every use." accept="application/pdf,.pdf" buttonLabel="Upload PDF" busy={busy} onFileSelect={upload} />
          {savedAssets.map((asset) => {
            const ids = draft.attachment_ids || draft.attachments.map((item) => item.id)
            return <label className="ou-checkline" key={asset.id}><input type="checkbox" checked={ids.includes(asset.id)} onChange={(event) => {
              const next = event.target.checked ? [...ids, asset.id] : ids.filter((id) => id !== asset.id)
              setDraft({ ...draft, attachment_id: null, attachment_ids: next, attachments: savedAssets.filter((item) => next.includes(item.id)) })
            }} />{asset.name} ({(asset.bytes / 1048576).toFixed(1)} MB)</label>
          })}
          <label className="ou-field"><span>Existing PSA flyer (optional)</span><select className="ou-input" value={draft.attachment_file || ''} onChange={(event) => field('attachment_file', event.target.value || null)}><option value="">None</option>{assets.map((asset) => <option key={asset.filename} value={asset.filename}>{asset.filename}</option>)}</select></label>
          <span className="ou-muted">Up to three PDFs, 10 MB each and 15 MB combined. Saving preserves the file bytes for every reviewed send.</span>
        </fieldset>}
        {!user?.admin && <p>Attachments: {draft.attachments?.map((item) => item.name).join(', ') || 'none'}</p>}
        <p className="ou-muted">Merge fields: {'{school name}, {contact name}, {my name}, {my email}'}. Missing values block sending.</p>
        {user?.admin && <><label className="ou-checkline"><input type="checkbox" checked={draft.archived} disabled={busy} onChange={(event) => field('archived', event.target.checked)} />Archive for future selections</label>
          <div className="template-actions"><button className="ou-btn ou-btn-primary" disabled={busy} onClick={save}>{busy ? 'Working...' : 'Save new version'}</button>{draft.id && <button className="ou-btn ou-btn-ghost" disabled={busy} onClick={() => act(async () => setHistory((await api.get(`/api/outreach/templates/${draft.id}/versions`)).items))}>Version history</button>}<button className="ou-btn ou-btn-ghost" disabled={busy} onClick={() => { library.reload(); setDraft(null) }}>Close</button></div></>}
        {history && <ol>{history.map((version) => <li key={version.revision}><details><summary>Version {version.revision} · {new Date(version.created_at).toLocaleString()}{version.archived ? ' · Archived' : ''}</summary><p>{version.subject}</p><p>Attachments: {version.attachments?.map((item) => item.name).join(', ') || 'none'}</p><pre className="template-history">{version.body}</pre></details></li>)}</ol>}
      </div>}
    </div>
  </section>
}
