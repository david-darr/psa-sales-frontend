// Fictional preview only. The API client never calls fetch in this mode.
import { contactsPreview } from './contacts'
import { buildPool, evaluate, previewFor, outreachPreview } from './outreach'
function createAreaPreview(){


const reviews = new Map(), ledger = new Map(), batches = [], campaigns = []
let sequence = 10000
const key = (value) => JSON.stringify(Object.fromEntries(Object.entries(value).filter(([name]) => name !== 'preview_token')))
function rowsFor(ctx, body) {
  const groups = new Map(), pool = buildPool(ctx)
  for (const id of body.school_ids || []) {
    const school = pool.find((row) => row.school_id === id)
    if (!school || school.owner_id !== ctx.user.id) throw new Error('Send only to schools assigned to you')
    const actual = ctx.schools.find((row) => row.id === id)
    const contacts = actual ? contactsPreview({ ...ctx, endpoint: `/api/sales-schools/${id}/contacts`, method: 'GET' }).contacts :
      [{ id: id * 10000, contact_id: id * 10000, name: school.contact_name, email: school.email, roles: ['unknown'], tags: [] }]
    for (const contact of contacts) {
      if (body.audience && body.audience !== 'all' && !contact.roles.includes(body.audience) &&
          !(body.audience === 'trunk_or_treat' && contact.tags.includes('trunk_or_treat'))) continue
      const context = { school_id: id, school_name: school.school_name, contact_name: contact.name }
      if (!groups.has(contact.email)) groups.set(contact.email, [])
      groups.get(contact.email).push({ school, contact, context })
    }
  }
  return [...groups.values()].map((group) => {
    const choice = body.contact_contexts?.[group[0].contact.contact_id]
    const { school, contact } = group.find((row) => row.school.school_id === choice) || group[0]
    const contextRequired = group.length > 1 && !choice
    const candidate = { ...school, contact_name: contact.name, email: contact.email }
    const blockers = evaluate(candidate, body.kind, ctx)
    if (contact.do_not_contact || contact.school_do_not_contact) blockers.push('unsubscribed')
    if (contextRequired) blockers.push('choose_school_context')
    const ledgerKey = `${body.campaign_id || 'standard'}:${contact.email}:${body.kind === 'followup' ? 'followup-1' : 'intro'}`
    if (ledger.has(ledgerKey)) blockers.push('campaign_already_contacted')
    return { ...previewFor(candidate, body, ctx), contact_id: contact.contact_id, contact_link_id: contact.id,
      contact_name: contact.name, contexts: group.map((row) => row.context), context_required: contextRequired,
      blockers, warnings: blockers, eligible: !blockers.length, ledgerKey }
  })
}
function review(ctx, body, value) {
  const id = `contact-review-${++sequence}`
  reviews.set(id, { actor: ctx.user.id, key: key(body), value, expires: Date.now() + 900000 })
  return { ...value, preview_token: id }
}
function getReview(ctx, body) {
  const saved = reviews.get(body.preview_token)
  if (!saved || saved.actor !== ctx.user.id || saved.expires < Date.now() || saved.key !== key(body)) throw new Error('Review the messages again')
  return saved
}
function create(ctx, kind, recipients, saved) {
  if (saved.batch) return { batch_id: saved.batch.id, repeated: true }
  const batch = { id: ++sequence, user_id: ctx.user.id, kind, status: 'queued', total: recipients.length,
    sent: 0, failed: 0, skipped: 0, queued: recipients.length, sending: 0, unconfirmed: 0, cancelled: 0,
    created_at: ctx.ago(0), finished_at: null, recipients: recipients.map((row, i) => ({ ...row, id: sequence * 100 + i, status: 'queued' })) }
  batches.push(batch); saved.batch = batch
  return { batch_id: batch.id, status: 'queued', total: recipients.length, skipped: [] }
}
function contactOutreachPreview(ctx) {
  const { endpoint, method, body } = ctx
  const report = endpoint.match(/^\/api\/contacts\/(\d+)\/report$/)
  if (report) {
    const available = ctx.schools.filter((school) => ctx.user.admin || school.user_id === ctx.user.id)
    let found
    for (const school of available) {
      const contacts = contactsPreview({ ...ctx, endpoint: `/api/sales-schools/${school.id}/contacts`, method: 'GET' }).contacts
      const contact = contacts.find((row) => row.contact_id === Number(report[1]))
      if (contact) { found = { school, contact }; break }
    }
    if (!found || !['optout', 'complaint', 'review'].includes(body.kind) || body.detail?.trim().length < 10) throw new Error('Record the source of the contact signal')
    const { school, contact } = found
    contactsPreview({ ...ctx, endpoint: `/api/sales-schools/${school.id}/contacts/${contact.id}`, method: 'PATCH', body: {
      ...contact, contact_version: contact.contact_version, do_not_contact: true, suppression_reason: body.detail } })
    for (const batch of batches) {
      if (!['queued', 'sending'].includes(batch.status) || !batch.recipients.some((r) => r.email === contact.email)) continue
      batch.status = 'paused'; batch.paused_reason = 'Recipient signal: ' + body.kind
      for (const row of batch.recipients) if (row.email === contact.email && row.status === 'queued') row.status = 'cancelled'
      batch.queued = batch.recipients.filter((r) => r.status === 'queued').length
    }
    if (body.kind === 'optout' && ['pending', 'contacted', 'replied'].includes(school.status)) school.status = 'not_interested'
    return { suppressed: true }
  }
  if (endpoint === '/api/outreach/campaigns') {
    if (method === 'GET') return { items: [{ id: 'standard', name: 'Standard outreach', daily_limit: 40 }, ...campaigns] }
    if (!ctx.user.admin) throw new Error('Admin access required')
    if (!body.name || body.reason?.trim().length < 10 || body.daily_limit < 1 || body.daily_limit > 40) throw new Error('Enter a campaign name, a reason, and a daily cap from 1 to 40')
    const campaign = { ...body, id: `campaign-${++sequence}` }; campaigns.push(campaign); return campaign
  }
  if (endpoint === '/api/email-preview' && body?.contact_mode) {
    const previews = rowsFor(ctx, body)
    return review(ctx, body, { previews, recipient_count: previews.length, unmatched_school_ids: body.school_ids.filter((id) => !previews.some((row) => row.contexts.some((c) => c.school_id === id))) })
  }
  if (endpoint === '/api/outreach/batches' && method === 'POST' && body?.contact_mode) {
    const saved = getReview(ctx, body)
    if (saved.batch) return { batch_id: saved.batch.id, repeated: true }
    const current = rowsFor(ctx, body)
    if (JSON.stringify(current) !== JSON.stringify(saved.value.previews)) throw new Error('A contact or eligibility changed. Review again.')
    const rows = current.filter((row) => row.eligible)
    if (!rows.length) throw new Error('No eligible contacts')
    for (const row of rows) ledger.set(row.ledgerKey, true)
    return create(ctx, body.kind, rows, saved)
  }
  if (endpoint === '/api/outreach/test-preview') {
    const school = buildPool(ctx).find((row) => row.school_id === body.school_ids[0] && row.owner_id === ctx.user.id)
    if (!school) throw new Error('Choose one of your schools')
    return review(ctx, body, { ...previewFor(school, body, ctx), email: ctx.user.email })
  }
  if (endpoint === '/api/outreach/test-send') {
    const saved = getReview(ctx, body)
    return create(ctx, 'test', [{ ...saved.value, school_id: null, school_name: 'Test to myself', email: ctx.user.email }], saved)
  }
  const match = endpoint.match(/^\/api\/outreach\/batches\/(\d+)$/)
  if (match) {
    const batch = batches.find((row) => row.id === Number(match[1]))
    if (!batch) return undefined
    if (['queued', 'sending'].includes(batch.status) && Date.now() - new Date(batch.created_at) > 1500) {
      batch.recipients.forEach((row) => { row.status = 'sent' }); batch.status = 'done'
      batch.sent = batch.total; batch.queued = 0; batch.finished_at = ctx.ago(0)
    }
    return ctx.clone(batch)
  }
  if (endpoint === '/api/outreach/batches' && method === 'GET') {
    const older = outreachPreview(ctx)
    return { items: [...batches].reverse().concat(older.items).slice(0, Number(ctx.params.get('limit') || 10)) }
  }
  const action = endpoint.match(/^\/api\/outreach\/batches\/(\d+)\/(cancel|retry|retry-preview)$/)
  if (action) {
    const batch = batches.find((row) => row.id === Number(action[1]))
    if (batch) {
      if (action[2] === 'cancel') {
        batch.recipients.forEach((row) => { if (row.status === 'queued') row.status = 'cancelled' })
        batch.status = 'cancelled'; batch.cancelled = batch.recipients.filter((r) => r.status === 'cancelled').length
        batch.queued = 0
        return { batch_id: batch.id, status: batch.status }
      }
      if (action[2] === 'retry-preview') return { preview_token: 'demo-retry-reviewed', previews: batch.recipients.filter((row) => ['failed', 'queued'].includes(row.status)) }
      throw new Error('Nothing to retry in this completed demo batch')
    }
  }
  const retry = endpoint.match(/^\/api\/outreach\/batches\/(\d+)\/retry-preview$/)
  if (retry) {
    const batch = outreachPreview({ ...ctx, endpoint: `/api/outreach/batches/${retry[1]}`, method: 'GET' })
    return { preview_token: 'demo-retry-reviewed', previews: batch.recipients.filter((row) => row.status === 'failed') }
  }
  return undefined
}

return {contactOutreachPreview}
}
const areaStores=new Map()
function areaStore(ctx){const area=ctx?.area || 'school';if(!areaStores.has(area))areaStores.set(area,createAreaPreview());return areaStores.get(area)}
export function contactOutreachPreview(...args){return areaStore(args[0]).contactOutreachPreview(...args)}
