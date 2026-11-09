import assert from 'node:assert/strict'
import { createServer } from 'vite'
const store = new Map()
globalThis.sessionStorage = { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) }
globalThis.localStorage = sessionStorage
globalThis.window = { location: { search: process.argv.includes('--employee') ? '?preview=1' : '?preview=1&scenario=admin' } }
globalThis.fetch = () => { throw new Error('Demo must never contact production') }
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
try {
  const { previewRequest: api } = await server.ssrLoadModule('/src/lib/previewData.js')
  const catalog=api('/api/outreach/template-assets')
  assert.ok(catalog.saved.length)
  const asset=catalog.saved[0]
  const blob=api(`/api/outreach/template-assets/${asset.id}`)
  assert.ok(blob instanceof Blob)
  assert.ok((await blob.text()).startsWith('%PDF-'))
  const school=api('/api/outreach/recipients?kind=custom').items.find((row)=>row.eligible)
  assert.ok(school)
  const payload={kind:'custom',school_ids:[school.school_id],subject:'For your school',body:'Hello {my name}',attachment_ids:[asset.id]}
  const preview=api('/api/email-preview',{method:'POST',body:payload})
  assert.deepEqual(preview.previews[0].attachments,[asset.name])
  if(process.argv.includes('--employee')){
    assert.throws(()=>api('/api/outreach/templates',{method:'POST',body:{}}),/Admin/)
    assert.throws(()=>api('/api/outreach/template-assets',{method:'POST',body:{}}),/Admin/)
    assert.throws(()=>api('/api/outreach/template-imports/preview',{method:'POST',body:{}}),/Admin/)
  } else {
    const publish=api('/api/outreach/template-assets/publish',{method:'POST',body:{filename:catalog.items[0].filename}})
    assert.ok(api('/api/outreach/template-assets').saved.some((item)=>item.id===publish.id))
    const rows={templates:[{name:'Uploaded Catalog Intro',kind:'initial',step:0,audience:'general',subject:'For {school name}',body:'Hello {my name}',attachment_ids:[asset.id]}]}
    const form=new FormData();form.append('file',new File([JSON.stringify(rows)],'templates.json',{type:'application/json'}))
    const before=api('/api/outreach/templates').items.length
    const plan=await api('/api/outreach/template-imports/preview',{method:'POST',formData:form})
    assert.equal(plan.new,1)
    assert.equal(api('/api/outreach/templates').items.length,before)
    const path=`/api/outreach/template-imports/${plan.id}/commit`
    const result=api(path,{method:'POST',body:{}})
    assert.equal(result.added,1)
    assert.deepEqual(api(path,{method:'POST',body:{}}),result)
    const again=await api('/api/outreach/template-imports/preview',{method:'POST',formData:form})
    assert.equal(again.new,0)
  }
  console.log('Catalog demo passed: authenticated PDF download, rep selections, admin publication/import and preview/commit idempotence. No network or real email.')

} finally { await server.close() }
