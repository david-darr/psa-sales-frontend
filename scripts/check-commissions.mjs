import assert from 'node:assert/strict'
import { createServer } from 'vite'

const store = new Map()
globalThis.sessionStorage = { getItem: (key) => store.get(key), setItem: (key, value) => store.set(key, value) }
globalThis.localStorage = sessionStorage
globalThis.window = { location: { search: '?preview=1&scenario=admin' } }
globalThis.fetch = () => { throw new Error('Preview must never call production') }
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
try {
  const { previewRequest: api } = await server.ssrLoadModule('/src/lib/previewData.js')
  const path = '/api/admin/program-commissions'
  const data = api(path)
  assert.equal(data.records.length, 3)
  const first = data.records[0]
  assert.equal(first.pool, 1350)
  assert.equal(first.director_remainder, 450)
  assert.equal(data.summary.needs_review, 1)
  assert.equal(data.summary.unallocated_pool, 1350)
  assert.equal(data.by_season.length, 2)
  const body = { sales_school_id: first.sales_school_id, season: first.season, program: first.program,
    rep_id: first.rep_id, gross: first.gross, leagueapps: first.leagueapps, cash_expenses: first.cash_expenses,
    sale_type: first.sale_type, rep_payout: 1000, revision: first.revision, voided: true }
  const updated = api(`${path}/${first.id}`, { method: 'PUT', body })
  assert.equal(updated.revision, 2)
  assert.equal(api(path).summary.programs, 2)
  assert.equal(api(`${path}/${first.id}/history`).length, 2)
  assert.throws(() => api(`${path}/${first.id}`, { method: 'PUT', body }), /changed/)
  assert.ok(api(`${path}?format=csv`).raw.includes('director_remainder'))
  assert.equal(api(`${path}?season=Spring+2027`).records.length, 1)
  const employee = { endpoint: path, method: 'GET', user: { admin: false } }
  const { programCommissionsPreview } = await server.ssrLoadModule('/src/lib/preview/programCommissions.js')
  assert.throws(() => programCommissionsPreview(employee), /Administrator/)
  const { estimateProgram } = await server.ssrLoadModule('/src/lib/programCommissions.js')
  assert.equal(estimateProgram({ gross: 1, leagueapps: true, cash_expenses: 0, sale_type: 'new', rep_payout: 0.14 }).pool, 0.14)
  console.log('Commission preview passed: calculation, unallocated pool, filters, history, stale writes, CSV and permissions.')
} finally { await server.close() }
