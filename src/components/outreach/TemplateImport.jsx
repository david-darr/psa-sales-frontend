import { salesText } from '../../lib/salesWorkspace'
import { useState } from 'react'
import FileUpload from '../FileUpload'
import api from '../../lib/api'

const example = { templates:[{name:'Intro example',kind:'initial',step:0,audience:'general',subject:salesText("Programs for {school name}"),body:'Hello {contact name},\n\nMy name is {my name}. You can reach me at {my email}.',attachment_ids:[]}] }
export default function TemplateImport({ onImported }) {
  const [review,setReview]=useState(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [notice,setNotice]=useState('')
  const act=async(action)=>{setBusy(true);setError('');setNotice('');try{await action()}catch(err){setError([err.message,...(err.payload?.rows||[]).map((row)=>`Row ${row.row}: ${row.error}`)].join(' '))}finally{setBusy(false)}}
  const preview=(file)=>act(async()=>{
    setReview(null)
    if (!file.name.toLowerCase().endsWith('.json') || file.size>1048576) throw new Error('Choose a JSON template file of at most 1 MB.')
    const formData=new FormData();formData.append('file',file)
    setReview(await api.upload('/api/outreach/template-imports/preview',formData))
  })
  const commit=()=>act(async()=>{const result=await api.post(`/api/outreach/template-imports/${review.id}/commit`,{});setNotice(`Imported ${result.added}; skipped ${result.skipped} existing or repeated templates.`);setReview(null);onImported()})
  const download=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(example,null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='psa-template-example.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  return <section className="template-editor">
    <h4>Upload email templates</h4>
    <p>Upload a JSON template or a file with a templates array (up to 100). Preview first, then confirm. Existing library edits are preserved. Choose PDFs from the catalog after import, or reference their attachment_ids.</p>
    <button type="button" className="ou-btn ou-btn-ghost" onClick={download}>Download format example</button>
    <FileUpload label="Template JSON file" hint="JSON, up to 1 MB and 100 templates. Review the file before confirming the import." accept=".json,application/json" buttonLabel="Choose template file" busy={busy} onFileSelect={preview} />
    {error && <p role="alert" className="ou-callout tone-danger">{error}</p>}{notice && <p role="status">{notice}</p>}
    {review && <div><p><strong>{review.new} new templates out of {review.total} rows in {review.filename}.</strong> Nothing has been imported yet.</p><ul>{review.items.map((item,index)=><li key={index}>{item.name} | {item.audience} | {item.action}{item.attachments.length ? ` | PDFs: ${item.attachments.join(', ')}` : ''}</li>)}</ul><button type="button" className="ou-btn ou-btn-primary" disabled={busy} onClick={commit}>{busy?'Importing...':'Confirm template import'}</button><button type="button" className="ou-btn ou-btn-ghost" disabled={busy} onClick={()=>setReview(null)}>Cancel</button></div>}
  </section>
}
