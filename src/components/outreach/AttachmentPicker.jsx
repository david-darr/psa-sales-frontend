import { useState } from 'react'
import { useAttachmentCatalog, downloadCatalogPdf } from '../../emails/useAttachmentCatalog'

export default function AttachmentPicker({ defaults = [], selected = [], onChange }) {
  const catalog = useAttachmentCatalog()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const required = new Set(defaults.map((asset)=>asset.id))
  const all = [...new Map([...defaults, ...catalog.items].map((asset)=>[asset.id,asset])).values()]
  const chosen = all.filter((asset)=>required.has(asset.id) || selected.includes(asset.id))
  const download = async (asset) => { try { await downloadCatalogPdf(asset) } catch(err) { setError(err.message) } }
  const toggle = (asset, checked) => {
    setError('')
    const next = checked ? [...new Set([...selected,asset.id])] : selected.filter((id)=>id!==asset.id)
    const files = all.filter((item)=>required.has(item.id) || next.includes(item.id))
    if (files.length>3 || files.reduce((sum,item)=>sum+item.bytes,0)>15728640) { setError('Choose up to three PDFs, totaling at most 15 MB including template defaults.'); return }
    onChange(next)
  }
  return <fieldset className="ou-field">
    <legend className="ou-label">Attachments from the catalog</legend>
    <p className="ou-muted">Template PDFs are always included. Pick additional files for this batch; your choices do not change the shared template.</p>
    <label className="ou-field"><span>Find a PDF</span><input className="ou-input" value={query} onChange={(event)=>setQuery(event.target.value)} /></label>
    <button type="button" className="ou-btn ou-btn-ghost ou-btn-sm" onClick={catalog.reload}>Refresh catalog</button>
    {(catalog.error || error) && <p role="alert">{error || catalog.error}</p>}
    {catalog.loading && <p role="status">Loading PDFs...</p>}
    {all.filter((asset)=>asset.name.toLowerCase().includes(query.toLowerCase())).map((asset)=><div className="template-actions" key={asset.id}>
      <label className="ou-checkline"><input type="checkbox" checked={required.has(asset.id)||selected.includes(asset.id)} disabled={required.has(asset.id)} onChange={(event)=>toggle(asset,event.target.checked)} />{asset.name} ({(asset.bytes/1048576).toFixed(1)} MB){required.has(asset.id) ? ' | Template default' : ''}</label>
      <button type="button" className="ou-btn ou-btn-ghost ou-btn-sm" onClick={()=>download(asset)}>Download</button>
    </div>)}
    {!catalog.loading && !all.length && <p>No catalog PDFs yet. An admin can upload files in the Attachments tab.</p>}
    <p className="ou-muted">{chosen.length} PDFs selected | {(chosen.reduce((sum,item)=>sum+item.bytes,0)/1048576).toFixed(1)} MB. Review the final attachments before sending.</p>
  </fieldset>
}
