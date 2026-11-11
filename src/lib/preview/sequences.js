// Entirely fictional scheduling. No timer here sends email or calls fetch.
import { templatesPreview, renderDemoTemplate } from './templates'
import { contactsPreview } from './contacts'
import { nominalSequenceDue, nextSequenceWindow, sequenceDate } from '../sequenceTime'

const sequences = [], enrollments = [], reviews = new Map()
let serial = 1, seeded = false
const clone = (value) => structuredClone(value)
const hash = (value) => JSON.stringify(value)
const time = (days = 0) => new Date(Date.now() + days * 86400000).toISOString()
function seed(ctx) {
  if (seeded) return
  seeded = true
  const library = templatesPreview({ ...ctx, endpoint: '/api/outreach/templates', method: 'GET' }).items
  const steps = [1, 2, 3].map((number) => ({ number, day: [4, 10, 17][number - 1], template: library.find((t) => t.audience === 'principal_ap' && t.step === number) }))
  sequences.push({ id: 1, revision: 1, name: 'Winter 2027 principal sequence', audience: 'principal_ap', start_hour: 9, end_hour: 17, steps, archived: false })
  const id = Math.max(...ctx.schools.map((s) => s.id)) + 1
  const school = { id, school_name: 'Sequence Preview Academy', email: 'principal@sequence-preview.example.test', contact_name: 'Alex Morgan', additional_emails: [], status: 'contacted', user_id: ctx.user.id, user_name: ctx.user.name, school_type: 'elementary', address: '100 Demo Lane', county: 'Demo County' }
  ctx.schools.push(school)
  ctx.emails.push({ id: Math.max(...ctx.emails.map((e) => e.id)) + 1, user_id: ctx.user.id, school_name: school.school_name, school_email: school.email, sales_school_id: id, sent_at: time(-5), days_ago: 5, responded: false, followup_count: 0 })
  const contact = contactsPreview({ ...ctx, endpoint: `/api/sales-schools/${id}/contacts`, method: 'GET' }).contacts[0]
  contactsPreview({ ...ctx, endpoint: `/api/sales-schools/${id}/contacts/${contact.id}`, method: 'PATCH', body: { ...contact, roles: ['principal_ap'], name: 'Alex Morgan' } })
}
function checked(ctx, body) {
  if (!body?.name || !body.steps?.length) throw new Error('Choose a sequence name and steps')
  if (body.steps.length > 3 || !Number.isInteger(body.start_hour) || !Number.isInteger(body.end_hour) || body.start_hour < 6 || body.start_hour >= body.end_hour || body.end_hour > 20) throw new Error('Choose a weekday business window and one to three steps')
  const library = templatesPreview({ ...ctx, endpoint: '/api/outreach/templates', method: 'GET' }).items
  let previous = 0
  const steps = body.steps.map((step, i) => {
    const template = library.find((t) => t.id === step.template_id && t.revision === step.template_revision)
    if (!template || template.step !== i + 1 || ![body.audience, 'general'].includes(template.audience) || step.day <= previous || step.day > 90) throw new Error('Choose increasing days and matching follow-up templates')
    previous = step.day
    return { number: i + 1, day: step.day, template: clone(template) }
  })
  return { name: body.name, audience: body.audience, start_hour: body.start_hour, end_hour: body.end_hour, steps, archived: Boolean(body.archived) }
}
function prepare(ctx, body) {
  const sequence = sequences.find((s) => s.id === body.sequence_id && s.revision === body.revision && !s.archived)
  if (!sequence || !body.original_ids?.length) throw new Error('Select a current sequence and conversations')
  const library = templatesPreview({ ...ctx, endpoint: '/api/outreach/templates', method: 'GET' }).items
  if (sequence.steps.some((step) => !library.some((t) => t.id === step.template.id && t.revision === step.template.revision))) throw new Error('A sequence template changed. Review a new sequence version.')
  if (!['review', 'automatic'].includes(body.mode || 'review')) throw new Error('Choose review or automatic mode')
  const rows = body.original_ids.map((id) => {
    const original = ctx.emails.find((e) => e.id === id && e.user_id === ctx.user.id && !e.responded)
    const school = original && ctx.schools.find((s) => s.id === original.sales_school_id && s.user_id === ctx.user.id)
    if (!school) throw new Error('Conversation unavailable')
    if (original.sequence_managed && !body.replace_existing) throw new Error('Explicitly review a replacement enrollment')
    const contacts = contactsPreview({ ...ctx, endpoint: `/api/sales-schools/${school.id}/contacts`, method: 'GET' }).contacts
    const contact = contacts.find((c) => c.email === original.school_email)
    if (!contact || contact.do_not_contact || (sequence.audience !== 'all' && !contact.roles.includes(sequence.audience) && !contact.tags.includes(sequence.audience))) throw new Error('Contact does not match this sequence audience')
    const row = { ...school, school_name: school.school_name, contact_name: contact.name }
    return { original_id: id, school_name: school.school_name, email: contact.email, steps: sequence.steps.map((step) => {
      const rendered = renderDemoTemplate({ kind: 'followup', template_id: step.template.id, template_revision: step.template.revision }, { ...row, followups_sent: step.number - 1 }, ctx.user)
      const due = nextSequenceWindow(Math.max(nominalSequenceDue(original.sent_at, step.day, sequence.start_hour, sequence.end_hour).getTime(), sequenceDate(body.start_date, sequence.start_hour).getTime(), Date.now()), sequence.start_hour, sequence.end_hour)
      return { number: step.number, day: step.day, subject: rendered.subject, body: rendered.body, attachments: step.template.attachments.map((a) => a.name), due_at: due.toISOString(), already_sent: step.number <= (original.followup_count || 0) }
    }) }
  })
  return { sequence_id: sequence.id, revision: sequence.revision, mode: body.mode || 'review', rows, starts_at: sequenceDate(body.start_date, sequence.start_hour).toISOString(), ends_at: sequenceDate(body.end_date, sequence.end_hour).toISOString(), definition: clone(sequence) }
}
export function sequencesPreview(ctx) {
  const { endpoint, method, body } = ctx
  if (!/^\/api\/outreach\/(sequences|sequence-|worker)/.test(endpoint)) return undefined
  seed(ctx)
  if (endpoint === '/api/outreach/worker') return { online: false, last_seen_at: null, status: 'demo' }
  if (endpoint === '/api/outreach/sequences') {
    if (method === 'GET') return { items: clone(sequences) }
    if (!ctx.user.admin) throw new Error('Admin access required')
    const sequence = { id: ++serial, revision: 1, ...checked(ctx, body) }; sequences.push(sequence); return clone(sequence)
  }
  const edit = endpoint.match(/^\/api\/outreach\/sequences\/(\d+)$/)
  if (edit) {
    if (!ctx.user.admin) throw new Error('Admin access required')
    const sequence = sequences.find((s) => s.id === Number(edit[1]))
    if (!sequence || sequence.revision !== body.revision) throw new Error('Sequence changed')
    Object.assign(sequence, checked(ctx, body), { revision: sequence.revision + 1 })
    enrollments.filter((e) => e.sequence_id === sequence.id && e.status === 'active').forEach((e) => { e.status = 'paused'; e.reason = 'Sequence settings changed' })
    return clone(sequence)
  }
  if (endpoint === '/api/outreach/sequence-originals') {
    let items = ctx.emails.filter((e) => e.user_id === ctx.user.id && !e.responded && ctx.schools.some((s) => s.id === e.sales_school_id && s.user_id === ctx.user.id && ['pending', 'contacted'].includes(s.status)))
      .map((e) => ({ id: e.id, school_name: e.school_name, email: e.school_email, sent_at: e.sent_at, legacy_followups: e.followup_count || 0, already_managed: Boolean(e.sequence_managed) }))
    const q = (ctx.params.get('q') || '').toLowerCase()
    items = items.filter((e) => `${e.school_name} ${e.email}`.toLowerCase().includes(q))
    const page = Number(ctx.params.get('page') || 1), total = items.length
    return { items: clone(items.slice((page - 1) * 50, page * 50)), total }
  }
  if (endpoint === '/api/outreach/sequence-enrollments/preview') {
    const payload = prepare(ctx, body), id = `sequence-review-${++serial}`
    reviews.set(id, { key: hash(body), payload, actor: ctx.user.id, expires: Date.now() + 900000 })
    return { ...clone(payload), review_id: id }
  }
  if (endpoint === '/api/outreach/sequence-enrollments/commit') {
    const review = reviews.get(body.review_id)
    if (!review || review.actor !== ctx.user.id || review.key !== hash(body.settings)) throw new Error('Review enrollment again')
    if (review.result) return clone(review.result)
    if (Date.now() > review.expires) throw new Error('Review enrollment again')
    const current = prepare(ctx, body.settings)
    // Template/definition edits invalidate the approval; due instants can move in the demo.
    if (current.revision !== review.payload.revision || hash(current.definition) !== hash(review.payload.definition)) throw new Error('Sequence changed. Review again.')
    if (current.mode === 'automatic' && body.confirm !== 'AUTHORIZE_AUTOMATIC_SEQUENCE') throw new Error('Explicit automatic-send authorization required')
    const ids = current.rows.map((row) => {
      const original = ctx.emails.find((e) => e.id === row.original_id); original.sequence_managed = true
      enrollments.filter((e) => e.original_id === original.id && e.status === 'active').forEach((e) => { e.status = 'paused'; e.reason = 'Replaced by new approval' })
      const enrollment = { id: ++serial, original_id: original.id, user_id: ctx.user.id, sequence_id: current.sequence_id, sequence_name: current.definition.name, revision: current.revision,
        school_name: row.school_name, email: row.email, status: 'active', mode: current.mode, starts_at: current.starts_at, ends_at: current.ends_at,
        steps: row.steps.map((step) => ({ ...step, id: ++serial, status: step.already_sent ? 'sent' : 'waiting' })) }
      enrollments.push(enrollment); return enrollment.id
    })
    review.result = { enrollment_ids: ids }; return clone(review.result)
  }
  if (endpoint === '/api/outreach/sequence-enrollments') {
    const items = enrollments.filter((e) => e.user_id === ctx.user.id).reverse(), page = Number(ctx.params.get('page') || 1)
    return { items: clone(items.slice((page - 1) * 50, page * 50)), total: items.length, page }
  }
  const cancel = endpoint.match(/^\/api\/outreach\/sequence-enrollments\/(\d+)\/cancel$/)
  if (cancel) {
    const enrollment = enrollments.find((e) => e.id === Number(cancel[1]) && e.user_id === ctx.user.id)
    if (!enrollment) throw new Error('Enrollment not found')
    enrollment.status = 'cancelled'; enrollment.reason = 'Authorization revoked by sender'
    enrollment.steps.forEach((step) => { if (step.status === 'waiting') step.status = 'stopped' })
    return { id: enrollment.id, status: enrollment.status }
  }
  const stepAction = endpoint.match(/^\/api\/outreach\/sequence-steps\/(\d+)\/(preview|approve)$/)
  if (stepAction) {
    const enrollment = enrollments.find((e) => e.user_id === ctx.user.id && e.steps.some((s) => s.id === Number(stepAction[1])))
    const step = enrollment?.steps.find((s) => s.id === Number(stepAction[1]))
    if (!step || enrollment.status !== 'active' || step.status !== 'waiting') throw new Error('Step unavailable')
    if (stepAction[2] === 'preview') return { ...clone(step), email: enrollment.email, preview_token: `demo-step-${step.id}` }
    if (body.preview_token !== `demo-step-${step.id}` || Date.parse(step.due_at) > Date.now()) throw new Error('Step is not due or review changed')
    step.approved_until = new Date(Date.now() + 900000).toISOString()
    return { id: step.id, approved_until: step.approved_until }
  }
  return undefined
}
