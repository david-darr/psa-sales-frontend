import { estimateProgram, programTotals } from '../programCommissions'

let records
const events = new Map()

export function programCommissionsPreview(ctx) {
  const { endpoint, method, body, params, user } = ctx
  if (!endpoint.startsWith('/api/admin/program-commissions')) return undefined
  if (!user.admin) throw new Error('Administrator access required')
  if (!records) {
    records = ctx.schools.slice(0, 3).map((school, index) => {
      const rep = ctx.team.find((person) => person.id === school.user_id)
      const inputs = { gross: 10000, leagueapps: index !== 1, cash_expenses: 650,
        sale_type: index === 1 ? 'renewal' : 'new', rep_payout: index === 2 ? null : index === 1 ? 600 : 900 }
      const row = { id: index + 1, sales_school_id: school.id, school_name: school.school_name,
        season: index === 1 ? 'Spring 2027' : 'Winter 2026/27', program: 'After-school soccer',
        rep_id: rep.id, rep_name: rep.name, ...inputs, ...estimateProgram(inputs),
        notes: 'Fictional preview record', voided: false, needs_review: inputs.rep_payout == null,
        revision: 1, updated_at: new Date().toISOString() }
      events.set(row.id, [{ id: 1, actor_id: user.id, created_at: row.updated_at, before: null, after: ctx.clone(row) }])
      return row
    })
  }
  const match = endpoint.match(/^\/api\/admin\/program-commissions\/(\d+)(\/history)?$/)
  if (match?.[2] && method === 'GET') return ctx.clone(events.get(Number(match[1])) || [])
  if (method === 'POST' || (match && method === 'PUT')) {
    const row = match ? records.find((item) => item.id === Number(match[1])) : null
    if (match && !row) throw new Error('Program record not found')
    if (row && body.revision !== row.revision) throw new Error('This record changed. Refresh before saving.')
    if (records.some((item) => item.id !== row?.id && item.sales_school_id === body.sales_school_id &&
        item.season.toLowerCase().replace(/\s+/g, ' ').trim() === body.season.toLowerCase().replace(/\s+/g, ' ').trim() &&
        item.program.toLowerCase().replace(/\s+/g, ' ').trim() === body.program.toLowerCase().replace(/\s+/g, ' ').trim()))
      throw new Error('This school already has a record for that season and program. Edit it instead.')
    const school = ctx.schools.find((item) => item.id === body.sales_school_id)
    const rep = ctx.team.find((person) => person.id === body.rep_id)
    if (!rep || (!row && !school)) throw new Error('Choose an existing school and rep')
    const values = estimateProgram(body)
    if (values.commission_base < 0 || values.rep_payout > values.pool || values.rep_payout < 0) throw new Error('Payout and expenses exceed available revenue')
    const after = { ...body, ...values, id: row?.id || Math.max(0, ...records.map((item) => item.id)) + 1,
      school_name: row?.school_name || school.school_name, rep_name: rep.name, needs_review: body.rep_payout == null,
      revision: (row?.revision || 0) + 1, updated_at: new Date().toISOString() }
    const history = events.get(after.id) || []
    history.push({ id: history.length + 1, actor_id: user.id, created_at: after.updated_at, before: row ? ctx.clone(row) : null, after: ctx.clone(after) })
    events.set(after.id, history)
    if (row) Object.assign(row, after)
    else records.push(after)
    return ctx.clone(after)
  }
  if (endpoint === '/api/admin/program-commissions' && method === 'GET') {
    const rows = records.filter((row) => (!params.get('season') || row.season === params.get('season')) &&
      (!params.get('rep_id') || row.rep_id === Number(params.get('rep_id'))))
    if (params.get('format') === 'csv') {
      const fields = ['school_name', 'season', 'program', 'rep_name', 'sale_type', 'gross', 'leagueapps_fee', 'net',
        'cash_expenses', 'commission_base', 'pool_rate', 'pool', 'rep_payout', 'director_remainder', 'needs_review', 'voided']
      const cell = (value) => `"${String(value ?? '').replace(/^[=+\-@\t\r\n]/, "'$&").replace(/"/g, '""')}"`
      return { raw: [fields, ...rows.map((row) => fields.map((field) => row[field]))].map((row) => row.map(cell).join(',')).join('\n') }
    }
    return ctx.clone({ records: rows, summary: programTotals(rows),
      seasons: [...new Set(records.map((row) => row.season))], reps: ctx.team.map(({ id, name }) => ({ id, name })),
      by_rep: [...new Set(rows.map((row) => row.rep_id))].map((id) => ({ rep_id: id, rep_name: rows.find((row) => row.rep_id === id).rep_name, ...programTotals(rows.filter((row) => row.rep_id === id)) })),
      by_season: [...new Set(rows.map((row) => row.season))].map((season) => ({ season, ...programTotals(rows.filter((row) => row.season === season)) })) })
  }
  return undefined
}
