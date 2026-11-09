// Fictional assignment reviews and claims. Never touches the live database.
const reviews = new Map()
let seq = 0
const snapshot = (rows) => JSON.stringify(rows.map((row) => [row.id,row.user_id,row.ownership_version || 0,row.school_name,row.address,row.county,row.status]))
const filter = (ctx, selection) => ctx.schools.filter((school) => {
  if (selection.ids) return selection.ids.includes(school.id)
  const f = selection.filters || {}
  return (!f.county || (school.county || '').toLowerCase() === f.county.toLowerCase()) &&
    (!f.scope || f.scope !== 'unassigned' || school.user_id == null) &&
    (f.scope !== 'mine' || school.user_id === ctx.user.id) &&
    (!f.owner || school.user_id === (f.owner === 'unassigned' ? null : Number(f.owner))) &&
    (!f.stage || f.stage.split(',').includes(school.status)) &&
    (!f.type || f.type === school.school_type) &&
    (!f.q || [school.school_name,school.email,school.contact_name,school.address].join(' ').toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.due || (f.due === 'none' ? !school.next_action : f.due === 'overdue' ? school.next_action && school.next_action_at?.slice(0,10) < new Date().toISOString().slice(0,10) : true))
}).sort((a,b) => a.id-b.id)
const assign = (ctx, school, target) => {
  if (school.user_id === target) return false
  school.user_id = target; school.user_name = ctx.team.find((rep) => rep.id === target)?.name || 'Unassigned'
  school.owner_name = school.user_name; school.ownership_version = (school.ownership_version || 0) + 1
  if (target != null) ctx.tasks?.filter((task) => task.school_id === school.id && task.status === 'open').forEach((task) => { task.user_id = target; task.owner_name = school.user_name; task.version++ })
  ctx.log(school, 'Owner changed to ' + school.user_name)
  return true
}
export function ownershipPreview(ctx) {
  const { endpoint, method, body, user } = ctx
  if (method !== 'POST') return undefined
  const claim = endpoint.match(/^\/api\/crm\/schools\/(\d+)\/claim$/)
  if (claim) {
    if (body && Object.keys(body).length) throw new Error('Claim as the signed-in user only.')
    const school = ctx.schools.find((row) => row.id === Number(claim[1]))
    if (!school || (school.user_id != null && school.user_id !== user.id)) throw new Error('This school has already been claimed or assigned.')
    return { claimed: assign(ctx,school,user.id), school: ctx.clone(school) }
  }
  const commit = endpoint.match(/^\/api\/crm\/schools\/assignment-reviews\/([^/]+)\/commit$/)
  if (endpoint !== '/api/crm/schools/assignment-preview' && !commit) return undefined
  if (!user.admin) throw new Error('Administrator access required')
  if (commit) {
    const review = reviews.get(commit[1])
    if (!review || review.actor !== user.id) throw new Error('Review not found')
    if (review.result) return ctx.clone(review.result)
    const rows = filter(ctx,review.selection)
    if (snapshot(rows) !== review.snapshot) throw new Error('The schools or their owners changed. Preview again.')
    review.result = { updated: rows.filter((school) => assign(ctx,school,review.target)).length, total: rows.length, review_id: review.id }
    return ctx.clone(review.result)
  }
  if (!body || !('user_id' in body) || (body.user_id != null && !ctx.team.some((rep) => rep.id === body.user_id))) throw new Error('Choose a valid target')
  const rows = filter(ctx,body)
  if (!rows.length || rows.length > 2000) throw new Error('Choose between 1 and 2,000 schools')
  const review = { id: `demo-assignment-${++seq}`, actor:user.id, target:body.user_id, snapshot:snapshot(rows), selection:ctx.clone(body) }
  reviews.set(review.id,review)
  const counties = {}, owners = {}
  rows.forEach((row) => { const county=row.county || 'Not recorded', owner=row.user_name || 'Unassigned'; counties[county]=(counties[county]||0)+1;owners[owner]=(owners[owner]||0)+1 })
  return { id:review.id,total:rows.length,changed:rows.filter((row)=>row.user_id!==body.user_id).length,target_name:ctx.team.find((rep)=>rep.id===body.user_id)?.name || 'Unassigned',counties,owners,
    sample:rows.slice(0,20).map((row)=>({id:row.id,school_name:row.school_name,owner_name:row.user_name || 'Unassigned',county:row.county || ''})) }
}
