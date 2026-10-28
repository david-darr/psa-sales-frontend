// Demo handlers for Sales admin (commissions, closes) and sign-up links. Return undefined to fall through.

const CLOSED = ['partner', 'former']
const rates = {}
const deals = {}
const splits = {}
const links = []

const round = (value) => Math.round(value * 100) / 100

function closeOf(ctx, school) {
  const person = (id) => ctx.team.find((member) => member.id === id)
  const rows = splits[school.id] || [{ user_id: school.closed_by_id || school.user_id, share_pct: 100, rate_pct: null }]
  const deal = deals[school.id] ?? (school.id % 3 ? 4000 + school.id * 250 : null)
  const earners = rows.map((row) => {
    const rep = person(row.user_id)
    const effective = row.rate_pct ?? rates[row.user_id] ?? (rep && !rep.admin ? 10 : null)
    return {
      user_id: row.user_id, name: rep?.name || 'Former rep', share_pct: row.share_pct, rate_pct: row.rate_pct,
      effective_rate_pct: effective,
      commission: deal != null && effective != null ? round((deal * row.share_pct * effective) / 10000) : null,
    }
  })
  return {
    id: school.id, school_name: school.school_name, status: school.status, owner_id: school.user_id,
    owner_name: person(school.user_id)?.name, closed_at: school.closed_at, closed_by_id: school.closed_by_id || school.user_id,
    deal_value: deal, custom_split: Boolean(splits[school.id]),
    needs_review: deal == null || earners.some((line) => line.effective_rate_pct == null), earners,
  }
}

const reports = []

export function adminPreview(ctx) {
  const { endpoint, method, body, params, user } = ctx
  if (endpoint === '/api/support' && method === 'POST') {
    reports.unshift({ id: reports.length + 1, ...body, reporter: user.name, delivered: true,
      created_at: new Date().toISOString(), message: body.message || '(no description)' })
    return { id: reports.length, delivered: true, via: 'reporter', support_email: 'davidmichael.darr@gmail.com' }
  }
  if (endpoint === '/api/support' && method === 'GET') {
    if (!user.admin) throw new Error('Administrator access required')
    return ctx.clone(reports)
  }
  if (!endpoint.startsWith('/api/admin/') && !endpoint.startsWith('/api/join-links')) return undefined
  if (endpoint === '/api/join-links/check') return { valid: true }
  if (!user.admin) throw new Error('Administrator access required')

  if (endpoint === '/api/admin/commissions') {
    const from = params.get('from')
    const to = params.get('to')
    const closes = ctx.schools
      .filter((school) => CLOSED.includes(school.status))
      .filter((school) => !from || (school.closed_at && school.closed_at.slice(0, 10) >= from))
      .filter((school) => !to || (school.closed_at && school.closed_at.slice(0, 10) <= to))
      .map((school) => closeOf(ctx, school))
    const reps = ctx.team.map((member) => {
      const lines = closes.flatMap((close) =>
        close.earners.filter((line) => line.user_id === member.id).map((line) => ({ close, line })),
      )
      return {
        id: member.id, name: member.name, email: member.email, admin: member.admin,
        commission_rate: rates[member.id] ?? (member.admin ? null : 10), closes: lines.length,
        credited_value: round(lines.reduce((sum, { close, line }) => sum + ((close.deal_value || 0) * line.share_pct) / 100, 0)),
        commission: round(lines.reduce((sum, { line }) => sum + (line.commission || 0), 0)),
      }
    })
    return {
      reps, closes,
      summary: {
        closes: closes.length,
        deal_value: round(closes.reduce((sum, close) => sum + (close.deal_value || 0), 0)),
        commission: round(reps.reduce((sum, rep) => sum + rep.commission, 0)),
        needs_review: closes.filter((close) => close.needs_review).length,
      },
    }
  }
  const rep = endpoint.match(/^\/api\/admin\/reps\/(\d+)$/)
  if (rep && method === 'PATCH') {
    rates[Number(rep[1])] = body.commission_rate
    return { id: Number(rep[1]), commission_rate: body.commission_rate }
  }
  const close = endpoint.match(/^\/api\/admin\/schools\/(\d+)\/close$/)
  if (close && method === 'PUT') {
    const school = ctx.schools.find((item) => item.id === Number(close[1]))
    if (!school) throw new Error('School not found')
    if (body.splits?.length && body.splits.reduce((sum, split) => sum + split.share_pct, 0) !== 100)
      throw new Error('Shares must add up to 100%')
    school.status = body.status
    school.closed_by_id = body.closed_by_id
    school.closed_at = `${body.closed_on}T12:00:00+00:00`
    deals[school.id] = body.deal_value
    if (body.splits?.length) splits[school.id] = body.splits
    else delete splits[school.id]
    return closeOf(ctx, school)
  }
  if (endpoint === '/api/join-links' && method === 'GET') return ctx.clone(links)
  if (endpoint === '/api/join-links' && method === 'POST') {
    const link = {
      id: links.length + 1, label: body.label, max_uses: body.max_uses, use_count: 0, state: 'active',
      expires_at: new Date(Date.now() + body.days * 86400000).toISOString(), created_at: new Date().toISOString(),
    }
    links.unshift(link)
    return { ...link, token: `demo-${link.id}` }
  }
  const revoke = endpoint.match(/^\/api\/join-links\/(\d+)$/)
  if (revoke && method === 'DELETE') {
    const link = links.find((item) => item.id === Number(revoke[1]))
    if (link) link.state = 'revoked'
    return link
  }
  return undefined
}
