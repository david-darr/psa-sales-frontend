import assert from 'node:assert/strict'
import { createServer } from 'vite'
const storage = new Map()
globalThis.sessionStorage = { getItem: (key) => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }
globalThis.localStorage = sessionStorage
globalThis.window = { location: { search: '?preview=1' + (process.argv.includes('--admin') ? '&scenario=admin' : '') } }
globalThis.fetch = () => { throw new Error('Demo must never contact production') }
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
try {
  const { previewRequest: api } = await server.ssrLoadModule('/src/lib/previewData.js')
  const me = api('/api/profile')
  const schools = api('/api/crm/schools?scope=mine').items.slice(0, 2)
  assert.equal(schools.length, 2)
  for (const school of schools) {
    api(`/api/sales-schools/${school.id}/contacts`, { method: 'POST', body: { email: 'shared-pta@example.test', name: `${school.school_name} PTA`, roles: ['pta_pto'] } })
  }
  const payload = { kind: 'custom', contact_mode: true, school_ids: schools.map((row) => row.id), audience: 'pta_pto',
    campaign_id: 'standard', contact_contexts: {}, subject: 'Hi [school_name]', body: 'Hello [contact_name]', attachment_ids: [] }
  const preview = api('/api/email-preview', { method: 'POST', body: payload })
  assert.equal(preview.previews.length, 1)
  assert.equal(preview.previews[0].context_required, true)
  assert.equal(preview.previews[0].eligible, false)
  assert.throws(() => api('/api/outreach/batches', { method: 'POST', body: payload }), /Review/)
  const contactId = preview.previews[0].contact_id
  payload.contact_contexts = { [contactId]: schools[1].id }
  // Two partner/replied fixtures are deliberately blocked. A fresh draft school
  // gives this contract a clean path without pretending real contacts consented.
  const draft = api('/api/add-school', { method: 'POST', body: { school_name: 'Contact Outreach Demo', email: 'demo@example.test', school_type: 'elementary', status: 'pending', contact_name: 'Sam' } })
  const schoolId = draft.id || draft.school_id
  assert.ok(schoolId)
  const fresh = { ...payload, school_ids: [schoolId], audience: 'all', contact_contexts: {} }
  const reviewed = api('/api/email-preview', { method: 'POST', body: fresh })
  assert.ok(reviewed.previews.some((row) => row.eligible))
  const send = { ...fresh, preview_token: reviewed.preview_token }
  assert.throws(() => api('/api/outreach/batches', { method: 'POST', body: { ...send, body: 'Changed' } }), /Review/)
  const batch = api('/api/outreach/batches', { method: 'POST', body: send })
  assert.equal(api('/api/outreach/batches', { method: 'POST', body: send }).batch_id, batch.batch_id)
  const test = api('/api/outreach/test-preview', { method: 'POST', body: fresh })
  assert.equal(test.email, me.email)
  const self = api('/api/outreach/test-send', { method: 'POST', body: { ...fresh, preview_token: test.preview_token } })
  assert.equal(api(`/api/outreach/batches/${self.batch_id}`).kind, 'test')
  assert.equal(api(`/api/outreach/batches/${self.batch_id}`).recipients[0].email, me.email)
  const freshContact = api(`/api/sales-schools/${schoolId}/contacts`).contacts[0]
  api(`/api/contacts/${freshContact.contact_id}/report`, { method: 'POST', body: { kind: 'complaint', detail: 'Fictional phone complaint in this demo' } })
  assert.equal(api(`/api/outreach/batches/${batch.batch_id}`).status, 'paused')
  assert.equal(api(`/api/sales-schools/${schoolId}/contacts`).contacts[0].do_not_contact, true)
  assert.ok(api('/api/outreach/campaigns').items.some((row) => row.id === 'standard'))
  console.log('Contact outreach demo passed: audience matching, shared mailbox context, review requirement, changed copy, idempotent queue and server-addressed test. No network or real email.')
} finally { await server.close() }
