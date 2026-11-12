// Local preview only. Shared source wording; all recipients and sending are fictional.
import source from './winter2027.json'
const audienceIds = ['principal_ap', 'pta_pto', 'enrichment', 'trunk_or_treat']
const audienceNames = [...new Set(source.templates.map((item) => item.audience))]
const originals = source.templates.map((item, index) => ({ ...item, id: index + 1, version_id: index + 1, revision: 1, archived: false, attachments: [],
  audience: audienceIds[audienceNames.indexOf(item.audience)], step: [0, 4, 10, 17].indexOf(item.send_on_day) }))
const items = structuredClone(originals)
const assets = [{ filename: 'PSA After School.pdf', bytes: 800000 }, { filename: 'PSA TOTS seasonal flyer.pdf', bytes: 1200000 }]
// One synthetic catalogue PDF makes the rep picker reviewable without an upload.
const sampleId = 'f'.repeat(64)
function samplePdf() {
  const stream = 'BT /F1 16 Tf 60 720 Td (PSA fictional demo attachment) Tj ET'
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`]
  let text = '%PDF-1.4\n'; const offsets = [0]
  objects.forEach((object,index)=>{ offsets.push(text.length);text+=`${index+1} 0 obj\n${object}\nendobj\n` })
  const xref=text.length;text+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset)=>{text+=`${String(offset).padStart(10,'0')} 00000 n \n`})
  text+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new Blob([text],{type:'application/pdf'})
}
const pdfBlobs = new Map([[sampleId,samplePdf()]])
const savedAssets = [{ id:sampleId,name:'Sample program flyer.pdf',bytes:pdfBlobs.get(sampleId).size }]
const importReviews = new Map()
const importKey = (item) => JSON.stringify(Object.fromEntries(['name','kind','step','audience','subject','body','attachment_ids'].map((key)=>[key,key==='attachment_ids' ? item[key] || [] : item[key]])))
const importedKeys = new Set(originals.map(importKey))
let uploadSequence = 0
const histories = new Map(items.map((item) => [item.id, [{ ...item, created_at: new Date().toISOString() }]]))
const aliases = { business_name: 'business name', school_name: 'school name', contact_name: 'contact name', user_name: 'my name', user_email: 'my email' }
const tokens = /\{([^{}]*)\}|\[([^\]\r\n[]*)\]/g
function validate(subject, body) {
  if (typeof subject !== 'string' || !subject.trim() || subject.length > 200 || /[\r\n]/.test(subject)) throw new Error('Enter a valid subject.')
  if (typeof body !== 'string' || !body.trim() || body.length > 20000) throw new Error('Enter a valid message.')
  const remaining = `${subject}\n${body}`.replace(tokens, (token, curly, square) => {
    if (!Object.values(aliases).includes(curly ?? aliases[square])) throw new Error(`Unsupported merge field: ${token}`)
    return ''
  })
  if (/[{}]/.test(remaining)) throw new Error('A merge field has unmatched braces.')
}
export function resolveDemoTemplate(body) {
  if (body?.template_id == null) return null
  const template = items.find((item) => item.id === body.template_id)
  if (!template || template.archived || template.revision !== body.template_revision) throw new Error('The shared template changed or was archived. Choose it again.')
  if (template.kind !== body.kind) throw new Error('Choose a template matching this message type.')
  if (body.attachments) throw new Error('Use the attachment saved in the shared template.')
  if (body.school_ids?.length > 100) throw new Error('Select at most 100 schools for full template review.')
  return template
}
export function demoAttachments(body) {
  const template = resolveDemoTemplate(body)
  const ids = body.attachment_ids || []
  if (!Array.isArray(ids) || ids.length>3) throw new Error('Choose up to three catalog PDFs.')
  const extras = ids.map((id)=>savedAssets.find((asset)=>asset.id===id))
  if (extras.some((asset)=>!asset)) throw new Error('A selected catalog PDF is unavailable.')
  const files = [...new Map([...(template?.attachments||[]),...extras].map((asset)=>[asset.id,asset])).values()]
  if (files.length>3 || files.reduce((sum,item)=>sum+item.bytes,0)>15728640) throw new Error('Choose up to three PDFs totaling at most 15 MB.')
  return files
}
export function renderDemoTemplate(body, row, user) {
  const template = resolveDemoTemplate(body)
  if (!template) return null
  if (body.kind === 'followup' && template.step !== (row.followups_sent || 0) + 1) throw new Error(`The follow-up template step does not match ${row.school_name}.`)
  const subject = body.subject ?? template.subject, text = body.body ?? template.body
  validate(subject, text)
  const values = { 'business name': row.school_name, 'school name': row.school_name, 'contact name': row.contact_name, 'my name': user.name, 'my email': user.email }
  const fill = (value) => value.replace(tokens, (token, curly, square) => {
    const key = curly ?? aliases[square]
    if (!values[key]?.trim()) throw new Error(`Missing ${key} for ${row.school_name}.`)
    return values[key]
  })
  return { subject: fill(subject), body: fill(text) }
}
export function templatesPreview(ctx) {
  const { endpoint, method, body, user } = ctx
  if (!endpoint.startsWith('/api/outreach/templates') && !endpoint.startsWith('/api/outreach/template-assets') && !endpoint.startsWith('/api/outreach/template-imports')) return undefined
  const download = endpoint.match(/^\/api\/outreach\/template-assets\/([^/]+)$/)
  if (download && method === 'GET') { const blob=pdfBlobs.get(download[1]);if(!blob)throw new Error('PDF not found');return blob }
  if (endpoint === '/api/outreach/template-assets' && method === 'GET') { return { items: structuredClone(assets), saved: structuredClone(savedAssets), max_bytes: 10485760 } }
  const clone = (value) => structuredClone(value)
  if (endpoint === '/api/outreach/templates' && method === 'GET') return { items: clone(items.filter((item) => (item.sales_workspace || 'school') === (ctx.area || 'school') && (!item.archived || (user.admin && ctx.params.get('include_archived') === '1')))) }
  if (!user.admin) throw new Error('Admin access required')
  if (endpoint === '/api/outreach/template-assets/publish' && method === 'POST') {
    const file=assets.find((asset)=>asset.filename===body?.filename)
    if(!file)throw new Error('Choose an approved existing PDF')
    const key=`demo-asset:${file.filename}`
    let asset=savedAssets.find((item)=>item.id===key)
    if(!asset){asset={id:key,name:file.filename,bytes:file.bytes};savedAssets.push(asset);pdfBlobs.set(key,samplePdf())}
    return clone(asset)
  }
  if (endpoint === '/api/outreach/template-assets' && method === 'POST') return (async () => {
    const file = ctx.formData?.get('file')
    if (!file || !file.name.toLowerCase().endsWith('.pdf') || file.size > 10485760) throw new Error('Upload a PDF of at most 10 MB')
    if (!(await file.text()).startsWith('%PDF-')) throw new Error('Upload a valid PDF')
    const asset = { id: `demo-upload:${++uploadSequence}`, name: file.name, bytes: file.size }
    savedAssets.push(asset); pdfBlobs.set(asset.id,new Blob([await file.arrayBuffer()],{type:'application/pdf'}));return clone(asset)
  })()
  if (endpoint === '/api/outreach/template-imports/preview' && method === 'POST') return (async()=>{
    const file=ctx.formData?.get('file')
    if (!file || !file.name.toLowerCase().endsWith('.json') || file.size>1048576) throw new Error('Upload a JSON template file of at most 1 MB')
    const doc=JSON.parse(await file.text());const rows=Array.isArray(doc)?doc:(doc.templates || [doc])
    if (!rows.length || rows.length>100) throw new Error('Upload between 1 and 100 templates')
    const seen=new Set()
    const plans=rows.map((input)=>{
      const row={...input}
      if(audienceNames.includes(row.audience))row.audience=audienceIds[audienceNames.indexOf(row.audience)]
      if(row.step==null && [0,4,10,17].includes(row.send_on_day))row.step=[0,4,10,17].indexOf(row.send_on_day)
      validate(row.subject,row.body)
      if (!row.name?.trim() || !['initial','followup'].includes(row.kind) || !['principal_ap','pta_pto','enrichment','trunk_or_treat','general','marketing','decision_maker','community_relations'].includes(row.audience)) throw new Error('Invalid template metadata')
      const copy={...row,step:row.step || 0,attachment_ids:row.attachment_ids || [],attachments:(row.attachment_ids || []).map((id)=>savedAssets.find((asset)=>asset.id===id))}
      if(copy.attachments.some((asset)=>!asset))throw new Error('A referenced PDF is unavailable')
      const key=importKey(copy),duplicate=seen.has(key);seen.add(key)
      return {copy,key,duplicate}
    })
    const id=`demo-import-${importReviews.size+1}`
    importReviews.set(id,{plans,actor:user.id})
    return {id,filename:file.name,total:plans.length,new:plans.filter((plan)=>!plan.duplicate&&!importedKeys.has(plan.key)).length,items:plans.map((plan)=>({name:plan.copy.name,kind:plan.copy.kind,audience:plan.copy.audience,attachments:plan.copy.attachments.map((asset)=>asset.name),action:plan.duplicate||importedKeys.has(plan.key)?'skip existing':'create'}))}
  })()
  const commit=endpoint.match(/^\/api\/outreach\/template-imports\/([^/]+)\/commit$/)
  if(commit && method==='POST'){
    const review=importReviews.get(commit[1]);if(!review||review.actor!==user.id)throw new Error('Import review not found')
    if(review.result)return clone(review.result)
    let added=0
    review.plans.forEach((plan)=>{if(plan.duplicate||importedKeys.has(plan.key))return;const next={...clone(plan.copy),id:Math.max(16,...items.map((item)=>item.id))+1,revision:1,archived:false};items.push(next);histories.set(next.id,[{...clone(next),created_at:new Date().toISOString()}]);importedKeys.add(plan.key);added++})
    review.result={added,skipped:review.plans.length-added};return clone(review.result)
  }
  if (endpoint.endsWith('/seed-winter-2027') && method === 'POST') {
    const missing = originals.filter((original) => !items.some((item) => item.id === original.id))
    items.push(...clone(missing)); return { added: missing.length, existing: 16 - missing.length, automatic_schedule_changed: false }
  }
  const match = endpoint.match(/^\/api\/outreach\/templates\/(\d+)(\/versions)?$/)
  if (match && match[2] && method === 'GET') return { items: clone([...(histories.get(Number(match[1])) || [])].reverse()) }
  if ((endpoint === '/api/outreach/templates' && method === 'POST') || (match && method === 'PUT')) {
    validate(body?.subject, body?.body)
    if (!body.name?.trim() || body.name.length > 180) throw new Error('Enter a template name.')
    if (!['principal_ap', 'pta_pto', 'enrichment', 'trunk_or_treat', 'general', 'marketing', 'decision_maker', 'community_relations'].includes(body.audience)) throw new Error('Choose a supported audience.')
    if (!['initial', 'followup'].includes(body.kind) || !(body.kind === 'initial' ? [0] : [1, 2, 3]).includes(body.step)) throw new Error('Choose a valid message step.')
    const asset = body.attachment_file && assets.find((item) => item.filename === body.attachment_file)
    if (body.attachment_file && !asset) throw new Error('Choose a PDF from the approved attachment list.')
    const current = match && items.find((item) => item.id === Number(match[1]))
    if (match && (!current || body.revision !== current.revision)) throw new Error('This template changed. Reload before saving.')
    const next = { ...clone(body), sales_workspace: ctx.area || 'school', id: current?.id || Math.max(16, ...items.map((item) => item.id)) + 1, revision: (current?.revision || 0) + 1, attachments: [], archived: !!body.archived }
    const ids = [...new Set(body.attachment_ids || (body.attachment_id ? [body.attachment_id] : []))]
    if (asset) {
      const added = { id: `demo-asset:${asset.filename}`, name: asset.filename, bytes: asset.bytes }
      if (!savedAssets.some((item) => item.id === added.id)) { savedAssets.push(added);pdfBlobs.set(added.id,samplePdf()) }
      if (!ids.includes(added.id)) ids.push(added.id)
    }
    if (ids.length > 3) throw new Error('Choose up to three saved PDF attachments.')
    const files = ids.map((id) => savedAssets.find((item) => item.id === id))
    if (files.some((file) => !file)) throw new Error('An attachment is unavailable.')
    if (files.reduce((sum,file) => sum + file.bytes,0) > 15728640) throw new Error('Template PDFs must total at most 15 MB.')
    next.attachment_ids = ids; next.attachment_id = ids[0] || null; next.attachments = clone(files)
    delete next.attachment_file
    if (current) Object.assign(current, next)
    else items.push(next)
    histories.set(next.id, [...(histories.get(next.id) || []), { ...next, created_at: new Date().toISOString() }])
    return clone(next)
  }
  return undefined
}
