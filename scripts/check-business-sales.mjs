// In-memory contracts only. A request to the network is a test failure.
import assert from 'node:assert/strict'
import { createServer } from 'vite'
const storage = new Map()
globalThis.sessionStorage = { getItem: (k) => storage.get(k), setItem: (k,v) => storage.set(k,v) }
globalThis.localStorage = sessionStorage
globalThis.window = { location: { pathname: '/businesses', search: '?preview=1&scenario=admin' } }
globalThis.fetch = () => { throw new Error('Business demo must not contact production') }
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false, watch: null }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' })
try {
  const { previewRequest: schools, previewBusinessRequest: businesses } = await server.ssrLoadModule('/src/lib/previewData.js')
  const before = schools('/api/crm/schools').items.map(r => r.school_name)
  const rows = businesses('/api/crm/schools').items
  assert.ok(rows.length)
  const owned=rows.find(row=>row.user_id != null)
  const assigned=businesses('/api/crm/schools?scope=team&owner='+owned.user_id).items
  assert.ok(assigned.length)
  assert.ok(assigned.every(row=>row.user_id===owned.user_id))
  const { salesPath, salesText }=await server.ssrLoadModule('/src/lib/salesWorkspace.js')
  assert.equal(salesPath('/schools')+'?owner='+owned.user_id,'/businesses/records?owner='+owned.user_id)
  assert.equal(salesText('Assigned schools'),'Assigned businesses')
  assert.ok(rows.every(r => r.school_type === 'business' && r.sales_workspace === 'business'))
  assert.ok(rows.every(r => !before.includes(r.school_name)))
  assert.ok(businesses('/api/crm/schools?stage=partner,former').items.length)
  const schoolContact = schools(`/api/sales-schools/${rows[0].id}/contacts`).contacts[0]
  const businessContacts = businesses(`/api/sales-schools/${rows[0].id}/contacts`).contacts
  assert.ok(!businessContacts.some(c => c.email === schoolContact.email))
  const created = businesses('/api/add-school',{method:'POST',body:{school_name:'Fictional Sponsor',email:'sponsor@example.test',school_type:'business',industry:'Retail',status:'meeting',sponsorship_value:'1000.00'}})
  businesses(`/api/sales-schools/${created.id}`,{method:'PATCH',body:{notes:'Review sponsorship proposal'}})
  assert.equal(businesses(`/api/sales-schools/${created.id}`).school.notes,'Review sponsorship proposal')
  assert.deepEqual(schools('/api/crm/schools').items.map(r=>r.school_name),before)
  const btask=businesses('/api/crm/tasks',{method:'POST',body:{title:'Discuss sponsorship',school_id:created.id,user_id:businesses('/api/profile').id}})
  assert.ok(businesses('/api/crm/tasks?scope=team').items.some(t=>t.id===btask.id))
  assert.ok(!schools('/api/crm/tasks?scope=team').items.some(t=>t.title==='Discuss sponsorship'))
  assert.equal(businesses('/api/outreach/templates').items.length,0)
  const template=businesses('/api/outreach/templates',{method:'POST',body:{name:'Sponsor intro',audience:'marketing',kind:'initial',step:0,subject:'For {business name}',body:'Hello {contact name}',attachment_ids:[]}})
  assert.ok(businesses('/api/outreach/templates').items.some(t=>t.id===template.id))
  assert.ok(!schools('/api/outreach/templates').items.some(t=>t.id===template.id))
  const form=new FormData();form.append('file',new File(['business_name,email,contact_role,school_type\nCSV Sponsor,contact@csv.example.test,marketing,business\n'],'business.csv'))
  const preview=await businesses('/api/contact-imports/preview',{method:'POST',formData:form})
  assert.equal(preview.errors.length,0)
  assert.equal(preview.groups[0].school_name,'CSV Sponsor')
  const search=businesses('/api/find-schools',{method:'POST',body:{address:'Fairfax, VA',keywords:['coffee shop'],radius_km:10}})
  assert.ok(search.schools.length)
  assert.ok(search.schools.every(r=>!r.school_name.includes('Elementary')))
  console.log('Business demo passed: independent records, contacts, tasks, sponsors, templates, CSV and discovery. No network.')
} finally { await server.close() }
