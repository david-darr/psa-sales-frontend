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
  const pool = api('/api/crm/schools?scope=unassigned').items
  assert.ok(pool.length)
  const school = pool[0]
  assert.equal(school.user_id, null)
  if (process.argv.includes('--employee')) {
    assert.throws(() => api('/api/crm/schools/assignment-preview', { method:'POST', body:{ ids:[school.id], user_id:null } }), /Administrator/)
  } else {
    const plan = api('/api/crm/schools/assignment-preview', { method:'POST', body:{ filters:{ scope:'unassigned', county:'Fairfax' }, user_id:1 } })
    assert.equal(plan.total,1)
    assert.equal(api('/api/crm/schools?scope=unassigned').items[0].user_id,null)
    const path = `/api/crm/schools/assignment-reviews/${plan.id}/commit`
    const done = api(path, { method:'POST',body:{} })
    assert.equal(done.updated,1)
    assert.deepEqual(api(path,{method:'POST',body:{}}),done)
    const release = api('/api/crm/schools/assignment-preview', {method:'POST',body:{ids:[school.id],user_id:null}})
    api(`/api/crm/schools/assignment-reviews/${release.id}/commit`,{method:'POST',body:{}})
    assert.ok(api('/api/crm/map-accounts?scope=unassigned&stages=pending').accounts.some((row)=>row.id===school.id))
  }
  const result = api(`/api/crm/schools/${school.id}/claim`,{method:'POST',body:{}})
  assert.equal(result.claimed,true)
  assert.equal(api('/api/crm/schools?scope=unassigned').items.length,0)
  assert.equal(api(`/api/crm/schools/${school.id}/claim`,{method:'POST',body:{}}).claimed,false)
  console.log('Ownership demo passed: pool scope, permissions, reviewed filtered reassignment, idempotence, map and self-claim. No network or emails.')

} finally { await server.close() }
