// Demo handlers for the portfolio and map-account endpoints. Return undefined to fall through to previewRequest.

const CLOSED = ['partner', 'former']
const PIPELINE = ['pending', 'contacted', 'replied', 'meeting']
const DAY = 86400000

// Demo schools that start without coordinates so the "Locate them" flow has something to do.
const unlocated = new Set([15])

const initials = (name) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const cityOf = (address) => {
  const parts = (address || '').split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length && /^[A-Za-z]{2}(\s+\d{5})?$/.test(parts[parts.length - 1])) parts.pop()
  return parts.length ? parts[parts.length - 1] : null
}

const hasCoords = (school) =>
  school.lat != null && school.lng != null && !unlocated.has(school.id)

const visible = (ctx) => {
  const own = ctx.params.get('scope') === 'mine' || !ctx.user.admin
  return ctx.schools.filter((school) => !own || school.user_id === ctx.user.id)
}

function portfolio(ctx) {
  const all = ctx.user.admin && ctx.params.get('scope') !== 'mine'
  const pool = visible(ctx)
  const cutoff = Date.now() - 90 * DAY
  const people = ctx.team
    .filter((member) => all || member.id === ctx.user.id)
    .map((member) => {
      const own = pool.filter((school) => school.user_id === member.id)
      const closed = own
        .filter((school) => CLOSED.includes(school.status))
        .sort((a, b) => new Date(b.closed_at || 0) - new Date(a.closed_at || 0))
      const count = (status) => own.filter((school) => school.status === status).length
      return {
        id: member.id,
        name: member.name,
        email: member.email,
        admin: !!member.admin,
        initials: initials(member.name),
        counts: {
          total: own.length,
          pipeline: own.filter((school) => PIPELINE.includes(school.status)).length,
          active: count('partner'),
          former: count('former'),
        },
        closed_last_90: closed.filter((school) => new Date(school.closed_at).getTime() >= cutoff)
          .length,
        closed_total: closed.length,
        accounts: closed.map((school) => ({
          id: school.id,
          school_name: school.school_name,
          status: school.status,
          school_type: school.school_type,
          address: school.address,
          city: cityOf(school.address),
          lat: hasCoords(school) ? school.lat : null,
          lng: hasCoords(school) ? school.lng : null,
          closed_at: school.closed_at,
          last_activity_at: ctx.ago(2 + (school.id % 9)),
          contact_name: school.contact_name,
        })),
      }
    })
    .sort(
      (a, b) =>
        b.counts.active - a.counts.active ||
        a.name.toLowerCase().localeCompare(b.name.toLowerCase()) ||
        a.id - b.id,
    )
  const sum = (pick) => people.reduce((total, rep) => total + pick(rep), 0)
  return {
    scope: all ? 'all' : 'self',
    totals: {
      reps: people.length,
      total_schools: sum((rep) => rep.counts.total),
      active_clients: sum((rep) => rep.counts.active),
      former_clients: sum((rep) => rep.counts.former),
      in_pipeline: sum((rep) => rep.counts.pipeline),
      closed_last_90: sum((rep) => rep.closed_last_90),
    },
    reps: people,
  }
}

function mapAccounts(ctx) {
  const raw = ctx.params.get('stages')
  const stages = raw ? raw.split(',').filter(Boolean) : CLOSED
  const owner = ctx.params.get('owner')
  const rows = visible(ctx).filter((school) => stages.includes(school.status))
  const byRep = new Map()
  for (const school of rows) {
    const entry = byRep.get(school.user_id) || {
      id: school.user_id,
      name: school.user_name,
      count: 0,
    }
    entry.count += 1
    byRep.set(school.user_id, entry)
  }
  const reps = [...byRep.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name) || a.id - b.id,
  )
  const scoped = owner ? rows.filter((school) => school.user_id === Number(owner)) : rows
  const accounts = scoped.filter(hasCoords).map((school) => ({
    id: school.id,
    school_name: school.school_name,
    address: school.address,
    status: school.status,
    school_type: school.school_type,
    owner_id: school.user_id,
    owner_name: school.user_name,
    lat: school.lat,
    lng: school.lng,
    closed_at: school.closed_at,
  }))
  return { accounts, reps, unlocated: scoped.filter((school) => !hasCoords(school)).length }
}

function locate(ctx) {
  const pool = visible(ctx).filter((school) => unlocated.has(school.id))
  const limit = Math.max(1, Number(ctx.body.limit) || 25)
  const batch = pool.slice(0, limit)
  batch.forEach((school) => unlocated.delete(school.id))
  return { located: batch.length, remaining: pool.length - batch.length }
}

export function portfolioPreview(ctx) {
  if (ctx.method === 'GET' && ctx.endpoint === '/api/crm/portfolio') return portfolio(ctx)
  if (ctx.method === 'GET' && ctx.endpoint === '/api/crm/map-accounts') return mapAccounts(ctx)
  if (ctx.method === 'POST' && ctx.endpoint === '/api/crm/map-accounts/locate') return locate(ctx)
  return undefined
}
