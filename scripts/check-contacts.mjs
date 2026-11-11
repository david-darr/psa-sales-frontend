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
  const school = api('/api/crm/schools').items[0]
  const contact = api(`/api/sales-schools/${school.id}/contacts`).contacts[0]
  const url = `/api/sales-schools/${school.id}/contacts/${contact.id}`
  const local = api(url, { method: 'PATCH', body: {version:contact.version, contact_version:contact.contact_version,school_do_not_contact:true,school_suppression_reason:'This school only'} })
  assert.equal(local.school_do_not_contact,true)
  assert.equal(local.do_not_contact,false)
  assert.equal(local.effective_do_not_contact,true)
  Object.assign(contact,local)
  const body = { version: contact.version, contact_version: contact.contact_version, roles: ['pta_pto'], do_not_contact: true, suppression_reason: 'Asked to stop', name: 'Alex' }
  assert.equal(api(url, { method: 'PATCH', body }).do_not_contact, true)
  assert.throws(() => api(url, { method: 'PATCH', body }), /changed/)
  const form = new FormData()
  form.append('file', new File(['school_name,email,contact_role,address\nDemo New School,new@example.test,pta,1 Lane\nDemo New School,principal@example.test,principal,1 Lane\n'], 'contacts.csv', { type: 'text/csv' }))
  const before = api('/api/crm/schools').total
  const plan = await api('/api/contact-imports/preview', { method: 'POST', formData: form })
  assert.equal(plan.groups[0].rows.length, 2)
  assert.equal(api('/api/crm/schools').total, before)
  const args = { method: 'POST', body: { file_hash: plan.file_hash } }
  const result = api(`/api/contact-imports/${plan.id}/commit`, args)
  assert.equal(result.schools_added, 1)
  assert.equal(result.contacts_added, 2)
  assert.deepEqual(api(`/api/contact-imports/${plan.id}/commit`, args), result)
  assert.equal(api('/api/crm/schools').total, before + 1)
  console.log('Contact demo passed: roles, suppression, stale edits, CSV dry run, multi-contact commit and idempotence.')
} finally { await server.close() }
