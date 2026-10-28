// Exercise the local demo API in Node. No browser, HTTP calls, or production data.
import assert from 'node:assert/strict'
import { createServer } from 'vite'

const admin = process.argv.includes('--admin')
const values = new Map()
globalThis.sessionStorage = {
  getItem: (key) => values.get(key) || null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
}
globalThis.localStorage = globalThis.sessionStorage
globalThis.window = {
  location: { search: '?preview=1' + (admin ? '&scenario=admin' : '') },
}
globalThis.fetch = () => {
  throw new Error('Demo contracts must never make an HTTP request')
}
const server = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
})
try {
  const { previewRequest: api } = await server.ssrLoadModule(
    '/src/lib/previewData.js',
  )
  const me = api('/api/profile')
  const first = api('/api/crm/schools?scope=mine').items[0]
  assert.ok(first)
  assert.equal(first.user_id, me.id)
  const task = api('/api/crm/tasks', {
    method: 'POST',
    body: {
      title: 'Demo contract task',
      user_id: me.id,
      school_id: first.id,
      due_at: '2026-11-01T00:00:00',
      priority: 'normal',
    },
  })
  const done = api('/api/crm/tasks/' + task.id, {
    method: 'PATCH',
    body: { status: 'completed', version: task.version },
  })
  assert.equal(done.status, 'completed')
  assert.throws(() =>
    api('/api/crm/tasks/' + task.id, {
      method: 'PATCH',
      body: { status: 'open', version: task.version },
    }),
  )
  api('/api/crm/schools/bulk', {
    method: 'POST',
    body: { ids: [first.id], status: 'partner' },
  })
  assert.equal(api('/api/sales-schools/' + first.id).school.status, 'partner')
  if (admin) {
    api('/api/crm/schools/bulk', {
      method: 'POST',
      body: { ids: [first.id], user_id: 2 },
    })
    assert.equal(api('/api/sales-schools/' + first.id).school.user_id, 2)
  } else {
    assert.ok(
      api('/api/crm/schools?scope=team').items.every(
        (row) => row.user_id === me.id,
      ),
    )
  }
  const overview = api('/api/crm/overview?scope=mine')
  assert.equal(overview.schools, api('/api/crm/schools?scope=mine').total)
  assert.equal(overview.trend.length, 14)
  assert.throws(
    () => api('/api/crm/outreach/send', { method: 'POST', body: {} }),
    /disabled/,
  )
  console.log(
    (admin ? 'Admin' : 'Employee') +
      ' demo contracts passed: scope, tasks, stale updates, pipeline, overview, blocked sending.',
  )
} finally {
  await server.close()
}
