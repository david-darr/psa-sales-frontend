
const contacts = new Map()
let nextContact = 1, nextLink = 1
function createAreaPreview(){
// Fictional in-browser data only. These handlers never contact production.
const links = new Map(), previews = new Map()
const ROLES = ['unknown', 'principal_ap', 'pta_pto', 'enrichment', 'other_staff', 'marketing', 'decision_maker', 'community_relations']
const keyOf = (row) => [row.school_name, row.address || '', row.county || ''].map((v) => v.trim().toLowerCase()).join('|')
const normalizeRoles = (value) => {
  const aliases = { principal: 'principal_ap', ap: 'principal_ap', pta: 'pta_pto', pto: 'pta_pto', asep: 'enrichment' }
  const values = (Array.isArray(value) ? value : (value || 'unknown').split(/[;|]/)).map((v) => aliases[v.trim().toLowerCase()] || v.trim().toLowerCase())
  if (values.some((v) => !ROLES.includes(v))) throw new Error('Invalid contact_role')
  return [...new Set(values.filter((v) => v !== 'unknown'))].length ? [...new Set(values.filter((v) => v !== 'unknown'))] : ['unknown']
}
function contactFor(email) {
  email = email.trim().toLowerCase()
  if (!contacts.has(email)) contacts.set(email, { id: nextContact++, email, do_not_contact: false, suppression_reason: '', version: 1 })
  return contacts.get(email)
}
function addLink(school, email, name = '', roles = ['unknown']) {
  const contact = contactFor(email)
  const existing = [...links.values()].find((l) => l.school_id === school.id && l.contact_id === contact.id)
  if (existing) return existing
  const link = { id: nextLink++, school_id: school.id, contact_id: contact.id, name, roles, tags: [], is_primary: email.toLowerCase() === school.email.toLowerCase(), do_not_contact:false,suppression_reason:'',version: 1 }
  links.set(link.id, link); return link
}
function parseCsv(input) {
  const rows = []; let row = [], cell = '', quoted = false
  input = input.replace(/^\uFEFF/, '')
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (c === '"' && quoted && input[i + 1] === '"') { cell += '"'; i++ }
    else if (c === '"') quoted = !quoted
    else if (c === ',' && !quoted) { row.push(cell); cell = '' }
    else if (c === '\n' && !quoted) { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (quoted) throw new Error('Unclosed CSV quotation')
  if (row.length || cell) { row.push(cell); rows.push(row) }
  const headers = (rows.shift() || []).map((s) => s.trim().toLowerCase().replace(/ /g, '_').replace(/^(business_name|company_name)$/, 'school_name'))
  if (!headers.includes('school_name') || !headers.includes('email')) throw new Error('CSV requires school_name and email')
  return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] || ''])))
}
function contactsPreview(ctx) {
  const { endpoint, method, body, user } = ctx
  const match = endpoint.match(/^\/api\/sales-schools\/(\d+)\/contacts(?:\/(\d+))?$/)
  if (!match && !endpoint.startsWith('/api/contact-imports')) return undefined
  for (const school of ctx.schools) for (const email of [school.email, ...(school.additional_emails || [])].filter(Boolean)) addLink(school, email, email === school.email ? school.contact_name || '' : '')
  const snapshot = () => JSON.stringify([ctx.schools, [...links.values()], [...contacts.values()]])
  const serialize = (link) => {
    const contact = [...contacts.values()].find((c) => c.id === link.contact_id)
    const schools = ctx.schools.filter((s) => [...links.values()].some((l) => l.school_id === s.id && l.contact_id === contact.id))
    return { ...ctx.clone(link), email: contact.email, contact_version: contact.version, do_not_contact: contact.do_not_contact,
      suppression_reason: contact.suppression_reason,school_do_not_contact:link.do_not_contact,school_suppression_reason:link.suppression_reason,effective_do_not_contact:contact.do_not_contact || link.do_not_contact, linked_school_count: schools.length,
      shared_schools: schools.filter((s) => user.admin || s.user_id === user.id).map((s) => ({ id: s.id, name: s.school_name })) }
  }
  const project = (school) => {
    const ls = [...links.values()].filter((l) => l.school_id === school.id).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.id - b.id)
    if (!ls.length) return
    ls[0].is_primary = true
    school.email = serialize(ls[0]).email; school.contact_name = ls[0].name
    school.additional_emails = ls.slice(1).map((l) => serialize(l).email)
  }
  if (match) {
    const school = ctx.schools.find((s) => s.id === Number(match[1]))
    if (!school || (!user.admin && school.user_id !== user.id)) throw new Error('School not found')
    if (method === 'GET') return ctx.clone({ contacts: [...links.values()].filter((l) => l.school_id === school.id).map(serialize), roles: ROLES, county: school.county || '' })
    let link
    if (method === 'POST') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) throw new Error('Invalid email')
      if ([...links.values()].some((l) => l.school_id === school.id && serialize(l).email === body.email.toLowerCase())) throw new Error('Contact already linked')
      link = addLink(school, body.email)
    } else {
      link = links.get(Number(match[2]))
      if (!link || link.school_id !== school.id) throw new Error('Contact not found')
      const c = contacts.get(serialize(link).email)
      if (link.version !== body.version || c.version !== body.contact_version) throw new Error('This contact changed. Refresh before saving.')
      if (c.do_not_contact && body.do_not_contact === false && !user.admin) throw new Error('Only administrators can clear do-not-contact')
      if (body.do_not_contact !== undefined && body.do_not_contact !== c.do_not_contact && !body.suppression_reason) throw new Error('Record a reason')
      if ((body.do_not_contact !== undefined && body.do_not_contact !== c.do_not_contact) || (body.suppression_reason !== undefined && body.suppression_reason !== c.suppression_reason)) {c.do_not_contact=body.do_not_contact ?? c.do_not_contact;c.suppression_reason=body.suppression_reason ?? c.suppression_reason;c.version++}
    }
    if (body.school_do_not_contact !== undefined && body.school_do_not_contact !== link.do_not_contact && !body.school_suppression_reason) throw new Error('Record a school-specific reason')
    link.do_not_contact=body.school_do_not_contact ?? link.do_not_contact;link.suppression_reason=body.school_suppression_reason ?? link.suppression_reason
    link.name = body.name ?? link.name; link.roles = normalizeRoles(body.roles || ['unknown']); link.tags = body.tags || []; link.version++
    if (body.do_not_contact) { const c = contacts.get(serialize(link).email); c.do_not_contact = true; c.suppression_reason = body.suppression_reason || 'Requested no outreach' }
    if (body.is_primary) { for (const l of links.values()) if (l.school_id === school.id) l.is_primary = false; link.is_primary = true }
    project(school); return ctx.clone(serialize(link))
  }
  if (endpoint === '/api/contact-imports/preview') return (async () => {
    const file = ctx.formData?.get('file')
    if (!file || file.size > 2_000_000) throw new Error('Choose a CSV under 2 MB')
    const rows = parseCsv(await file.text()), groups = new Map(), errors = []
    if (rows.length > 2000) throw new Error('Preview up to 2,000 rows')
    rows.forEach((row, index) => {
      try {
        if (!row.school_name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) throw new Error('School name and valid email required')
        const normalizedRow = { ...row, roles: normalizeRoles(row.contact_role), email: row.email.toLowerCase(), row_number: index + 2 }
        const key = keyOf(row)
        if (!groups.has(key)) {
          const candidates = ctx.schools.filter((s) => s.school_name.toLowerCase() === row.school_name.toLowerCase() || s.school_name.toLowerCase().includes(row.school_name.toLowerCase().replace(/\s*\([^)]*\)/g, '')))
          const exact = candidates.find((s) => (s.address || '').toLowerCase() === (row.address || '').toLowerCase() && (user.admin || s.user_id === user.id))
          groups.set(key, { key, school_name: row.school_name, address: row.address || '', county: row.county || '', action: exact ? 'existing' : candidates.length ? 'conflict' : 'new', school_id: exact?.id || null,
            candidates: candidates.map((s) => ({ id: user.admin || s.user_id === user.id ? s.id : null, name: s.school_name, editable: user.admin || s.user_id === user.id })), rows: [], warnings: [] })
        }
        groups.get(key).rows.push(normalizedRow)
      } catch (err) { errors.push({ row_number: index + 2, message: err.message }) }
    })
    const id = String(previews.size + 1), hash = `demo-${file.size}-${rows.length}`
    const plan = { id, file_hash: hash, expires_at: new Date(Date.now() + 1800000).toISOString(), groups: [...groups.values()], errors, row_count: rows.length }
    previews.set(id, { plan, user: user.id, snapshot: snapshot() }); return ctx.clone(plan)
  })()
  const commit = endpoint.match(/^\/api\/contact-imports\/([^/]+)\/commit$/)
  if (commit) {
    const saved = previews.get(commit[1])
    if (!saved || saved.user !== user.id) throw new Error('Preview not found')
    if (body.file_hash !== saved.plan.file_hash) throw new Error('File mismatch')
    if (saved.result) return ctx.clone(saved.result)
    if (saved.snapshot !== snapshot() || new Date(saved.plan.expires_at) < new Date()) throw new Error('Records changed. Preview again.')
    if (saved.plan.errors.length && !body.skip_invalid) throw new Error('Review invalid rows')
    const choices = saved.plan.groups.map((group) => ({ ...group, ...(body.decisions?.[group.key] || {}) }))
    if (choices.some((g) => g.action === 'conflict')) throw new Error('Resolve duplicates first')
    const result = { schools_added: 0, schools_updated: 0, contacts_added: 0, shared_contacts: 0, duplicates: 0, rows_skipped: saved.plan.errors.length, schools_skipped: 0 }
    for (const group of choices) {
      if (group.action === 'skip') { result.schools_skipped++; continue }
      let school = ctx.schools.find((s) => s.id === group.school_id)
      const first = group.rows[0]
      if (group.action === 'existing') { if (!school || (!user.admin && school.user_id !== user.id)) throw new Error('School unavailable'); result.schools_updated++ }
      else { school = { id: Math.max(...ctx.schools.map((s) => s.id), 0) + 1, school_name: group.school_name, email: first.email, additional_emails: [], address: group.address, county: group.county, status: first.stage || 'pending', sales_workspace: ctx.area || 'school', school_type: first.school_type || (ctx.area === 'business' ? 'business' : 'preschool'), notes: first.notes || '', user_id: user.id, user_name: user.name, created_at: new Date().toISOString() }; ctx.schools.push(school); result.schools_added++ }
      for (const row of group.rows) {
        const before = links.size
        const link = addLink(school, row.email, row.contact_name || '', row.roles)
        if (links.size > before) result.contacts_added++; else result.duplicates++
        link.roles = normalizeRoles([...link.roles, ...row.roles])
        if (/^(true|yes|1)$/i.test(row.do_not_contact || '')) { const c = contacts.get(row.email); c.do_not_contact = true; c.suppression_reason = row.suppression_reason || 'Imported do-not-contact'; c.version++ }
      }
      project(school)
    }
    saved.result = result; return ctx.clone(result)
  }
  return undefined
}

return {contactsPreview}
}
const areaStores=new Map()
function areaStore(ctx){const area=ctx?.area || 'school';if(!areaStores.has(area))areaStores.set(area,createAreaPreview());return areaStores.get(area)}
export function contactsPreview(...args){return areaStore(args[0]).contactsPreview(...args)}
