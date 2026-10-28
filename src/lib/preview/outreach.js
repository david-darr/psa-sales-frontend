// Demo handlers for the outreach endpoints. Return undefined to fall through to previewRequest.
//
// Everything here is in-memory and only reachable when UI_PREVIEW is on (the
// api client routes to previewRequest instead of fetch), so "sending" in the
// demo can never reach a real mailbox.

const DAY = 86400000
const CLOSED = ['partner', 'former', 'not_interested']
const REPLIED = ['replied', 'meeting']
const ACTIVE = ['queued', 'sending']
const DAILY_LIMIT = 40
const PRIOR_SENDS_TODAY = 11

// Extra demo prospects so selection, paging and "select all eligible" have
// realistic volume. [name, status, days since last contact, extras]
const EXTRA = [
  ['Aspen Glen Preschool', 'pending'],
  ['Birchwood Elementary', 'pending'],
  ['Clearwater Montessori', 'pending', null, { contact: '' }],
  ['Dogwood Early Learning', 'pending'],
  ['Eastgate Academy', 'pending'],
  ['Foxhollow Preschool', 'pending', null, { email: '' }],
  ['Greenfield Elementary', 'pending'],
  ['Harborview Day School', 'pending'],
  ['Ironwood Learning Center', 'pending'],
  ['Juniper Hill Preschool', 'pending', null, { contact: '' }],
  ['Kestrel Ridge Academy', 'pending'],
  ['Lakeshore Montessori', 'pending'],
  ['Magnolia Park Elementary', 'pending'],
  ['Northgate Preschool', 'pending', null, { unsubscribed: true }],
  ['Orchard Lane School', 'contacted', 1],
  ['Pinecrest Early Learning', 'contacted', 3],
  ['Quail Run Elementary', 'contacted', 6],
  ['Rosewood Academy', 'contacted', 8],
  ['Stonebridge Preschool', 'contacted', 9],
  ['Thistle Creek School', 'contacted', 11],
  ['Union Square Montessori', 'contacted', 14],
  ['Valley Forge Elementary', 'contacted', 18],
  ['Wren Hollow Preschool', 'contacted', 23],
  ['Yarrow Springs Academy', 'contacted', 29],
  ['Zephyr Point Learning', 'replied', 4],
  ['Amberly Heights School', 'meeting', 6],
  ['Briar Cliff Preschool', 'partner', 40],
  ['Copperfield Elementary', 'not_interested', 33],
]

const store = { seq: 0, batches: [], seeded: false, simSent: 0 }

const pageParams = () =>
  typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search)

const dayStart = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

function buildPool(ctx) {
  const { user, team } = ctx
  const rows = ctx.scoped(ctx.schools, new URLSearchParams()).map((school) => {
    const sent = ctx.emails.filter((e) => e.sales_school_id === school.id)
    return {
      school_id: school.id,
      school_name: school.school_name,
      email: school.id % 7 === 3 ? '' : school.email,
      contact_name: school.id % 6 === 0 ? '' : school.contact_name,
      status: school.status,
      owner_id: school.user_id,
      owner_name: school.user_name,
      days: sent.length ? Math.min(...sent.map((e) => e.days_ago)) : null,
      responded: sent.some((e) => e.responded),
    }
  })
  const owners = user.admin ? team.slice(0, 3) : [user]
  EXTRA.forEach(([name, status, days = null, extra = {}], index) => {
    const owner = owners[index % owners.length]
    rows.push({
      school_id: 200 + index,
      school_name: name,
      email:
        extra.email === ''
          ? ''
          : `office@${name.toLowerCase().replace(/[^a-z]/g, '')}.example.test`,
      contact_name:
        extra.contact === ''
          ? ''
          : ['Riley Quinn', 'Avery Stone', 'Drew Nakamura', 'Sky Alvarez'][
              index % 4
            ],
      status,
      owner_id: owner.id,
      owner_name: owner.name,
      days,
      responded: REPLIED.includes(status),
      unsubscribed: Boolean(extra.unsubscribed),
    })
  })
  return rows
}

function evaluate(row, kind, ctx) {
  const blockers = []
  if (!ctx.user.mail_connected) blockers.push('no_mailbox')
  if (!row.email) blockers.push('missing_email')
  if (row.unsubscribed) blockers.push('unsubscribed')
  if (CLOSED.includes(row.status)) blockers.push('closed')
  if (kind !== 'custom' && (REPLIED.includes(row.status) || row.responded))
    blockers.push('replied')
  if (kind === 'initial' && row.status === 'contacted')
    blockers.push('recently_contacted')
  if (kind === 'custom' && row.days === 0) blockers.push('recently_contacted')
  if (kind === 'followup' && row.days !== null && row.days < 7)
    blockers.push('not_due')
  return [...new Set(blockers)]
}

function toRecipient(row, kind, ctx) {
  const blockers = evaluate(row, kind, ctx)
  return {
    school_id: row.school_id,
    school_name: row.school_name,
    email: row.email,
    contact_name: row.contact_name,
    status: row.status,
    owner_id: row.owner_id,
    owner_name: row.owner_name,
    last_contacted_at: row.days === null ? null : ctx.ago(row.days),
    days_since_contact: row.days,
    followup_due_at: row.days === null ? null : ctx.ago(row.days - 7),
    eligible: blockers.length === 0,
    blockers,
  }
}

function limits(ctx) {
  const today = dayStart(new Date())
  const mine = ctx.emails.filter(
    (e) => e.user_id === ctx.user.id && dayStart(new Date(e.sent_at)) === today,
  ).length
  const low = Number(pageParams().get('demo_limit'))
  const sentToday = Number.isFinite(low) && pageParams().has('demo_limit')
    ? DAILY_LIMIT - low
    : PRIOR_SENDS_TODAY + mine + store.simSent
  const next = new Date()
  next.setHours(24, 0, 0, 0)
  return {
    daily_limit: DAILY_LIMIT,
    sent_today: Math.min(sentToday, DAILY_LIMIT),
    remaining: Math.max(DAILY_LIMIT - sentToday, 0),
    resets_at: next.toISOString(),
    mailbox_connected: ctx.user.mail_connected === true,
  }
}

/* ---------------- Batch simulator ---------------- */

function counts(batch) {
  const tally = (status) =>
    batch.recipients.filter((r) => r.status === status).length
  return {
    sent: tally('sent'),
    failed: tally('failed'),
    skipped: tally('skipped'),
  }
}

function view(batch, withRecipients) {
  const out = {
    id: batch.id,
    kind: batch.kind,
    status: batch.status,
    total: batch.recipients.length,
    ...counts(batch),
    created_at: batch.created_at,
    finished_at: batch.finished_at,
  }
  if (withRecipients)
    out.recipients = batch.recipients.map((r) => ({
      school_id: r.school_id,
      school_name: r.school_name,
      email: r.email,
      status: r.status,
      error: r.error || null,
      sent_at: r.sent_at || null,
    }))
  return structuredClone(out)
}

function finalize(batch, ctx) {
  batch.status = 'done'
  batch.finished_at = ctx.ago(0)
}

function resolveCurrent(batch, ctx) {
  const current = batch.recipients.find((r) => r.status === 'sending')
  if (!current) return
  if (current.failOnce && current.attempts === 0) {
    current.status = 'failed'
    current.error = 'The recipient server rejected the message (550 mailbox unavailable).'
  } else {
    current.status = 'sent'
    current.error = null
    current.sent_at = ctx.ago(0)
    store.simSent += 1
  }
  current.attempts += 1
}

function advance(batch, ctx) {
  if (!ACTIVE.includes(batch.status)) return
  const steps = batch.fast ? Math.max(2, Math.ceil(batch.recipients.length / 5)) : 1
  if (batch.status === 'queued') {
    batch.status = 'sending'
    const first = batch.recipients.find((r) => r.status === 'queued')
    if (first) first.status = 'sending'
    else finalize(batch, ctx)
    return
  }
  for (let i = 0; i < steps && batch.status === 'sending'; i += 1) {
    resolveCurrent(batch, ctx)
    const next = batch.recipients.find((r) => r.status === 'queued')
    if (next) next.status = 'sending'
    else finalize(batch, ctx)
  }
}

function makeRecipients(rows, ctx, { skip = {}, alreadySent = 0 } = {}) {
  let sendable = 0
  return rows.map((row, index) => {
    const reason = skip[row.school_id]
    const base = {
      school_id: row.school_id,
      school_name: row.school_name,
      email: row.email,
      attempts: 0,
      error: null,
      sent_at: null,
    }
    if (reason) return { ...base, status: 'skipped', error: reason }
    sendable += 1
    if (index < alreadySent)
      return { ...base, status: 'sent', attempts: 1, sent_at: ctx.ago(0.05) }
    return { ...base, status: 'queued', failOnce: sendable === 3 }
  })
}

function seed(ctx) {
  if (store.seeded) return
  store.seeded = true
  const rows = buildPool(ctx).filter((row) => row.email)
  const old = (id, kind, daysAgo, slice, failed) => {
    const recipients = rows.slice(slice[0], slice[1]).map((row, index) => ({
      school_id: row.school_id,
      school_name: row.school_name,
      email: row.email,
      attempts: 1,
      status: index < failed ? 'failed' : 'sent',
      error: index < failed ? 'Mailbox full (452 4.2.2). Try again later.' : null,
      sent_at: index < failed ? null : ctx.ago(daysAgo),
    }))
    store.batches.push({
      id,
      kind,
      status: 'done',
      created_at: ctx.ago(daysAgo + 0.02),
      finished_at: ctx.ago(daysAgo),
      recipients,
    })
  }
  old(1, 'initial', 2.3, [0, 14], 0)
  old(2, 'followup', 1.1, [8, 17], 2)
  store.seq = 2
  if (pageParams().has('demo_resume')) {
    store.seq = 3
    store.batches.push({
      id: 3,
      kind: 'initial',
      status: 'sending',
      created_at: ctx.ago(0.003),
      finished_at: null,
      recipients: makeRecipients(rows.slice(20, 32), ctx, { alreadySent: 4 }).map(
        (r, index) => (index === 4 ? { ...r, status: 'sending' } : r),
      ),
    })
  }
}

/* ---------------- Preview rendering ---------------- */

const escapeHtml = (text) =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const DEFAULTS = {
  initial: {
    subject: "Let's Connect! PSA Programs",
    body: (row, user) =>
      `Hello ${row.contact_name || 'there'},\n\nMy name is ${user.name}, and I am with The Players Sports Academy. I would love to explore bringing on-site sports programs to ${row.school_name}.\n\nWould you be open to a short introductory call?\n\nBest,\n${user.name}`,
  },
  followup: {
    subject: 'Follow-Up: PSA Programs',
    body: (row, user) =>
      `Hello ${row.contact_name || 'there'},\n\nI wanted to follow up on my earlier note about PSA sports programs at ${row.school_name}. Would a brief call be helpful?\n\nBest,\n${user.name}`,
  },
  custom: { subject: '', body: () => '' },
}

function fill(template, row, user) {
  return template
    .replace(/\[school_name\]/g, row.school_name)
    .replace(/\[contact_name\]/g, row.contact_name || 'there')
    .replace(/\[user_name\]/g, user.name)
    .replace(/\[user_email\]/g, user.email)
}

function previewFor(row, body, ctx) {
  const defaults = DEFAULTS[body.kind] || DEFAULTS.custom
  const subject = body.subject?.trim()
    ? fill(body.subject, row, ctx.user)
    : defaults.subject
  const text = body.body?.trim()
    ? fill(body.body, row, ctx.user)
    : defaults.body(row, ctx.user)
  const html = escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\+\+(.+?)\+\+/g, '<span style="font-size:1.25em">$1</span>')
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('')
  const warnings = evaluate(row, body.kind, ctx).filter((w) => w !== 'no_mailbox')
  if (!row.contact_name && /\[contact_name\]|Hello there/.test(body.body || text))
    warnings.push('empty_greeting')
  return {
    school_id: row.school_id,
    school_name: row.school_name,
    email: row.email,
    subject,
    body_html: html,
    body_text: text,
    warnings: [...new Set(warnings)],
  }
}

const SNIPPETS = [
  'Thanks for reaching out. We would like to learn more about your spring programs.',
  'Could you send over pricing and a sample weekly schedule?',
  'Our director is out this week. Can we pick this up on Monday?',
  'This looks interesting. Do you offer a trial session for new classes?',
  'Please call the front office after 3pm to set up a visit.',
]

export function outreachPreview(ctx) {
  const { endpoint, method, body, params } = ctx

  if (endpoint === '/api/sent-emails' && method === 'GET') {
    const rows = ctx.clone(ctx.scoped(ctx.emails, params))
    return rows.map((email, index) =>
      email.responded
        ? {
            ...email,
            reply_snippet: SNIPPETS[index % SNIPPETS.length],
            reply_at: ctx.ago((index % 5) * 0.7 + 0.1),
            reply_unread: index % 3 !== 1,
          }
        : email,
    )
  }

  if (!endpoint.startsWith('/api/outreach/') && endpoint !== '/api/email-preview')
    return undefined

  if (endpoint === '/api/email-preview') {
    // The legacy single-school shape has no `kind`; leave it to the old handler.
    if (method !== 'POST' || !body || !Array.isArray(body.school_ids) || !body.kind)
      return undefined
    const pool = buildPool(ctx)
    const previews = body.school_ids
      .map((id) => pool.find((row) => row.school_id === id))
      .filter(Boolean)
      .map((row) => previewFor(row, body, ctx))
    return { previews, preview_token: 'demo-preview-token' }
  }

  seed(ctx)

  if (endpoint === '/api/outreach/limits' && method === 'GET') return limits(ctx)

  if (endpoint === '/api/outreach/recipients' && method === 'GET') {
    const kind = params.get('kind') || 'initial'
    const term = (params.get('q') || '').toLowerCase()
    const stage = params.get('stage')
    const owner = Number(params.get('owner')) || null
    const page = Math.max(Number(params.get('page')) || 1, 1)
    const perPage = Math.min(Math.max(Number(params.get('per_page')) || 50, 1), 200)
    let rows = buildPool(ctx)
    if (kind === 'followup') rows = rows.filter((row) => row.days !== null)
    rows = rows.filter(
      (row) =>
        (!term ||
          [row.school_name, row.email, row.contact_name].join(' ').toLowerCase().includes(term)) &&
        (!stage || row.status === stage) &&
        (!owner || (ctx.user.admin && row.owner_id === owner)),
    )
    let items = rows.map((row) => toRecipient(row, kind, ctx))
    items =
      kind === 'followup'
        ? items.sort((a, b) => a.followup_due_at.localeCompare(b.followup_due_at))
        : items.sort((a, b) => a.school_name.localeCompare(b.school_name))
    return ctx.clone({
      items: items.slice((page - 1) * perPage, page * perPage),
      total: items.length,
      page,
      per_page: perPage,
    })
  }

  if (endpoint === '/api/outreach/batches' && method === 'POST') {
    const ids = Array.isArray(body?.school_ids) ? body.school_ids : []
    if (!ids.length) throw new Error('Choose at least one recipient.')
    if (!['initial', 'followup', 'custom'].includes(body.kind))
      throw new Error('Unknown message type.')
    if (!ctx.user.mail_connected)
      throw new Error('Connect your mailbox on the Account page before sending.')
    const pool = buildPool(ctx)
    const skip = {}
    const rows = []
    for (const id of ids) {
      const row = pool.find((item) => item.school_id === id)
      if (!row) {
        skip[id] = 'not_found'
        rows.push({ school_id: id, school_name: `School ${id}`, email: '' })
        continue
      }
      const blockers = evaluate(row, body.kind, ctx)
      if (blockers.length) skip[id] = blockers[0]
      rows.push(row)
    }
    const sendable = rows.length - Object.keys(skip).length
    if (sendable > limits(ctx).remaining)
      throw new Error('This batch would go over your daily sending limit.')
    store.seq += 1
    const batch = {
      id: store.seq,
      kind: body.kind,
      status: sendable ? 'queued' : 'done',
      created_at: ctx.ago(0),
      finished_at: sendable ? null : ctx.ago(0),
      fast: pageParams().has('demo_fast'),
      recipients: makeRecipients(rows, ctx, { skip }),
    }
    store.batches.unshift(batch)
    return {
      batch_id: batch.id,
      status: batch.status,
      total: batch.recipients.length,
      skipped: Object.entries(skip).map(([id, reason]) => ({
        school_id: Number(id),
        reason,
      })),
    }
  }

  if (endpoint === '/api/outreach/batches' && method === 'GET') {
    const limit = Number(params.get('limit')) || 10
    return {
      items: [...store.batches]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
        .map((batch) => view(batch, false)),
    }
  }

  const match = endpoint.match(/^\/api\/outreach\/batches\/(\d+)(?:\/(retry|cancel))?$/)
  if (match) {
    const batch = store.batches.find((item) => item.id === Number(match[1]))
    if (!batch) throw new Error('Batch not found.')
    const action = match[2]
    if (action && method === 'POST') {
      if (action === 'cancel' && ACTIVE.includes(batch.status)) {
        batch.recipients.forEach((r) => {
          if (r.status === 'queued' || r.status === 'sending') r.status = 'cancelled'
        })
        batch.status = 'cancelled'
        batch.finished_at = ctx.ago(0)
      }
      if (action === 'retry' && !ACTIVE.includes(batch.status)) {
        const failed = batch.recipients.filter((r) => r.status === 'failed')
        failed.forEach((r) => {
          r.status = 'queued'
          r.error = null
        })
        if (failed.length) {
          batch.status = 'queued'
          batch.finished_at = null
        }
      }
      return view(batch, true)
    }
    if (method === 'GET') {
      advance(batch, ctx)
      return view(batch, true)
    }
  }

  return undefined
}
