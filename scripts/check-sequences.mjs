import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { nextSequenceWindow, nominalSequenceDue, sequenceDate } from '../src/lib/sequenceTime.js'

assert.equal(nominalSequenceDue('2026-11-04T15:00:00Z', 4).toISOString(), '2026-11-09T15:00:00.000Z')
assert.equal(nominalSequenceDue('2026-03-06T15:00:00Z', 4).toISOString(), '2026-03-10T14:00:00.000Z')
assert.equal(nominalSequenceDue('2026-10-30T14:00:00Z', 4).toISOString(), '2026-11-03T15:00:00.000Z')
assert.equal(nextSequenceWindow('2026-11-06T23:00:00Z').toISOString(), '2026-11-09T14:00:00.000Z')
assert.equal(sequenceDate('2026-07-06', 9).toISOString(), '2026-07-06T13:00:00.000Z')
const admin = !process.argv.includes('--employee')
const storage = new Map()
globalThis.sessionStorage = { getItem: (k) => storage.get(k) || null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) }
globalThis.localStorage = sessionStorage
globalThis.window = { location: { search: '?preview=1' + (admin ? '&scenario=admin' : '') } }
globalThis.fetch = () => { throw new Error('Sequence demo must never contact production') }
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
try {
  const { previewRequest: api } = await server.ssrLoadModule('/src/lib/previewData.js')
  const post = (url, body) => api(url, { method: 'POST', body })
  const sequence = api('/api/outreach/sequences').items[0]
  assert.deepEqual(sequence.steps.map((s) => s.day), [4, 10, 17])
  assert.equal(api('/api/outreach/worker').status, 'demo')
  const original = api('/api/outreach/sequence-originals?q=Sequence%20Preview').items[0]
  assert.ok(original)
  const date = (offset) => new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const settings = { sequence_id: sequence.id, revision: sequence.revision, original_ids: [original.id], start_date: date(0), end_date: date(45) }
  const preview = post('/api/outreach/sequence-enrollments/preview', settings)
  assert.equal(preview.mode, 'review')
  assert.equal(preview.rows[0].steps.length, 3)
  const commit = { review_id: preview.review_id, settings }
  assert.throws(() => post('/api/outreach/sequence-enrollments/commit', { ...commit, settings: { ...settings, mode: 'automatic' } }), /Review/)
  const saved = post('/api/outreach/sequence-enrollments/commit', commit)
  assert.deepEqual(post('/api/outreach/sequence-enrollments/commit', commit), saved)
  const enrollment = api('/api/outreach/sequence-enrollments').items[0]
  assert.equal(enrollment.mode, 'review')
  assert.ok(enrollment.steps.every((s) => s.status === 'waiting'))
  assert.equal(post(`/api/outreach/sequence-steps/${enrollment.steps[0].id}/preview`, {}).email, original.email)
  post(`/api/outreach/sequence-enrollments/${enrollment.id}/cancel`, {})
  assert.equal(api('/api/outreach/sequence-enrollments').items[0].status, 'cancelled')
  const automatic = { ...settings, mode: 'automatic', replace_existing: true }
  const autoReview = post('/api/outreach/sequence-enrollments/preview', automatic)
  const authorize = { review_id: autoReview.review_id, settings: automatic }
  assert.throws(() => post('/api/outreach/sequence-enrollments/commit', authorize), /Explicit/)
  post('/api/outreach/sequence-enrollments/commit', { ...authorize, confirm: 'AUTHORIZE_AUTOMATIC_SEQUENCE' })
  assert.equal(api('/api/outreach/sequence-enrollments').items[0].mode, 'automatic')
  const definition = { name: 'Demo revision', audience: sequence.audience, start_hour: 9, end_hour: 17, steps: sequence.steps.map((s) => ({ day: s.day, template_id: s.template.id, template_revision: s.template.revision })) }
  if (admin) {
    api(`/api/outreach/sequences/${sequence.id}`, { method: 'PUT', body: { ...definition, revision: 1 } })
    assert.equal(api('/api/outreach/sequence-enrollments').items[0].status, 'paused')
    assert.throws(() => post('/api/outreach/sequence-enrollments/preview', settings), /current/)
  } else {
    assert.throws(() => post('/api/outreach/sequences', definition), /Admin/)
  }
  console.log(`Sequence ${admin ? 'admin' : 'employee'} demo passed: Eastern DST/weekends, default review, actor-bound approval, idempotence, explicit automation and revoke. No network or mail.`)
} finally { await server.close() }
