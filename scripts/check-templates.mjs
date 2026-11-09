import assert from 'node:assert/strict'
import { createServer } from 'vite'
const store = new Map()
globalThis.sessionStorage = { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) }
globalThis.localStorage = sessionStorage
globalThis.window = { location: { search: '?preview=1&scenario=admin' } }
globalThis.fetch = () => { throw new Error('Demo must never contact production') }
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
try {
  const { previewRequest: api } = await server.ssrLoadModule('/src/lib/previewData.js')
  const list = api('/api/outreach/templates').items
  assert.equal(list.length, 16)
  assert.equal(list.filter((item) => item.step === 3).length, 4)
  const chosen = list.find((item) => item.kind === 'initial')
  const school = api('/api/outreach/recipients?kind=initial').items.find((row) => row.eligible)
  assert.ok(school)
  const payload = { kind: 'initial', school_ids: [school.school_id], template_id: chosen.id, template_revision: chosen.revision }
  const preview = api('/api/email-preview', { method: 'POST', body: payload })
  assert.ok(preview.previews[0].body_text.includes(school.school_name))
  assert.ok(!preview.previews[0].body_text.includes('{my name}'))
  assert.throws(() => api('/api/email-preview', { method: 'POST', body: { ...payload, body: 'Hi {unknown}' } }), /Unsupported merge field/)
  const changed = api(`/api/outreach/templates/${chosen.id}`, { method: 'PUT', body: { ...chosen, name: 'New version', archived: true } })
  assert.equal(changed.revision, 2)
  assert.throws(() => api('/api/email-preview', { method: 'POST', body: payload }), /changed or was archived/)
  assert.throws(() => api(`/api/outreach/templates/${chosen.id}`, { method: 'PUT', body: chosen }), /changed/)
  assert.equal(api('/api/outreach/templates').items.length, 15)
  assert.equal(api(`/api/outreach/templates/${chosen.id}/versions`).items.length, 2)
  const seeded = api('/api/outreach/templates/seed-winter-2027', { method: 'POST', body: {} })
  assert.equal(seeded.added, 0)
  assert.equal(api('/api/outreach/templates?include_archived=1').items.find((item) => item.id === chosen.id).name, 'New version')
  const form = new FormData()
  form.append('file',new File(['%PDF-1.4\nFictional PDF'], 'intro.pdf', {type:'application/pdf'}))
  const asset = await api('/api/outreach/template-assets',{method:'POST',formData:form})
  const withPdf = api('/api/outreach/templates',{method:'POST',body:{name:'Reusable PDF',kind:'initial',step:0,audience:'general',subject:'Hello {school name}',body:'Hello from {my name}',attachment_ids:[asset.id]}})
  assert.equal(withPdf.attachments[0].id,asset.id)
  const merged = api('/api/email-preview',{method:'POST',body:{...payload,template_id:withPdf.id,template_revision:1}})
  assert.deepEqual(merged.previews[0].attachments,['intro.pdf'])
  console.log('Template demo passed: 16 source templates, personalized copy, field validation, revision conflicts, archive and idempotent seeding. No network or email calls.')
} finally { await server.close() }
