import assert from 'node:assert/strict'
import { createServer } from 'vite'
const admin = !process.argv.includes('--employee')
const storage = new Map()
globalThis.sessionStorage = { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) }
globalThis.localStorage = sessionStorage
globalThis.window = { location: { search: '?preview=1' + (admin ? '&scenario=admin' : '') } }
globalThis.fetch = () => { throw new Error('Agent approval demo must never contact production') }
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
try {
  const { previewRequest: api } = await server.ssrLoadModule('/src/lib/previewData.js')
  const original = api('/api/agent-outreach-drafts').items[0]
  assert.equal(original.status, 'awaiting')
  assert.equal(original.sender_id, api('/api/profile').id)
  assert.ok(original.preview.previews.some((r) => r.eligible))
  assert.ok(original.preview.previews.every((r) => !r.subject.includes('[school_name]')))
  assert.equal(original.preview.preview_token, undefined)
  const path = '/api/agent-outreach-drafts/' + original.id
  const post = (action, revision) => api(path + '/' + action, { method: 'POST', body: { revision } })
  assert.throws(() => post('approve', 200), /changed/)
  const refreshed = post('refresh', original.revision)
  assert.equal(refreshed.revision, original.revision + 1)
  assert.throws(() => post('approve', original.revision), /changed/)
  const approved = post('approve', refreshed.revision)
  assert.equal(approved.status, 'approved')
  assert.ok(approved.approval_id)
  assert.equal(approved.batch_id, undefined)
  assert.equal(api(path).status, 'approved')
  const revoked = post('revoke', approved.revision)
  assert.equal(revoked.status, 'revoked')
  assert.throws(() => post('approve', revoked.revision), /revoked/)
  console.log(`${admin ? 'Admin' : 'Employee'} agent approval demo passed: rendered recipients, refresh/stale review, approve without sending, revoke. No network or email.`)
} finally { await server.close() }
