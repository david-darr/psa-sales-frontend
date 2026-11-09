import { useState } from 'react'
import FileUpload from '../FileUpload'
import { useAuth } from '../../hooks/useAuth'
import api from '../../lib/api'
import { useAttachmentCatalog, downloadCatalogPdf } from '../../emails/useAttachmentCatalog'

export default function AttachmentCatalog() {
  const { user } = useAuth()
  const catalog = useAttachmentCatalog()
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [existing, setExisting] = useState('')
  const upload = async (file) => {
    setError(''); setNotice(''); setBusy(true)
    try {
      if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 10485760) throw new Error('Choose a PDF of at most 10 MB.')
      const formData = new FormData(); formData.append('file', file)
      const saved = await api.upload('/api/outreach/template-assets', formData)
      setNotice(`${saved.name} is available to reps in the message composer.`); catalog.reload()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  const publish = async () => {
    setError('');setNotice('');setBusy(true)
    try { const asset=await api.post('/api/outreach/template-assets/publish',{filename:existing});setNotice(`${asset.name} is now in the shared catalog.`);setExisting('');catalog.reload() }
    catch(err) { setError(err.message) }
    finally { setBusy(false) }
  }
  const download = async (asset) => {
    setError('')
    try { await downloadCatalogPdf(asset) } catch (err) { setError(err.message) }
  }
  return <section className="ou-card">
    <div className="ou-card-head"><h3 className="ou-card-title">Attachment catalog</h3><button className="ou-btn ou-btn-ghost" onClick={catalog.reload}>Refresh</button></div>
    <div className="ou-card-body">
      <p>Pick catalog PDFs in Compose or Follow-ups. Template defaults stay included; additional selections apply only to that batch.</p>
      {user?.admin && <FileUpload label="Upload a PDF for the sales team" hint="PDF, up to 10 MB. Available in the shared catalog without creating a template." accept=".pdf,application/pdf" buttonLabel="Upload PDF" busy={busy} onFileSelect={upload} />}
      {user?.admin && !!catalog.available.length && <div className="ou-field"><label className="ou-label" htmlFor="catalog-existing-pdf">Add an existing PSA PDF</label><select id="catalog-existing-pdf" className="ou-input" value={existing} disabled={busy} onChange={(event)=>setExisting(event.target.value)}><option value="">Choose a PSA file</option>{catalog.available.map((asset)=><option key={asset.filename} value={asset.filename}>{asset.filename}</option>)}</select><button className="ou-btn ou-btn-ghost" disabled={busy||!existing} onClick={publish}>Add to shared catalog</button></div>}
      {(error || catalog.error) && <p className="ou-callout tone-danger" role="alert">{error || catalog.error}</p>}
      {notice && <p className="ou-callout tone-success" role="status">{notice}</p>}
      <label className="ou-field"><span className="ou-label">Find a PDF</span><input className="ou-input" value={query} onChange={(event)=>setQuery(event.target.value)} /></label>
      {catalog.loading && <p role="status">Loading PDFs...</p>}
      {!catalog.loading && !catalog.items.length && <p>No PDFs have been uploaded yet.{user?.admin ? ' Upload one above.' : ' Ask an admin to add a PDF.'}</p>}
      <ul>{catalog.items.filter((asset)=>asset.name.toLowerCase().includes(query.toLowerCase())).map((asset)=><li key={asset.id}><strong>{asset.name}</strong> ({(asset.bytes/1048576).toFixed(1)} MB) <button className="ou-btn ou-btn-ghost ou-btn-sm" onClick={()=>download(asset)}>Download PDF</button></li>)}</ul>
    </div>
  </section>
}
