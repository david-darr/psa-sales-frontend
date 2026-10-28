// Demo handlers for the school finder endpoints. Return undefined to fall through to previewRequest.
// Everything is deterministic and in-memory; nothing here can reach Google or production.

const FALLBACK_CENTER = { lat: 38.89, lng: -77.22 }
const PAGE_SIZE = 12

const NAMES = [
  'Little Acorns Preschool',
  'Sunrise Montessori',
  'Fairfax Child Care Center',
  'Bright Path Academy',
  'Maple Leaf Early Learning',
  'Kidstop Daycare',
  'St. Anne Elementary',
  'Lakeview Learning Center',
  'Pioneer Day School',
  'Cherry Tree Preschool',
  'Harmony Montessori',
  'Tiny Steps Child Care',
  'Hillcrest Elementary',
  'Rainbow Bridge Academy',
  'Lighthouse Private School',
  'Discovery Cove Preschool',
  'Evergreen After School',
  'Wonder Years Daycare',
  'Oakton Learning Academy',
  'Silver Spring Montessori',
  'Blue Ridge Early Learning',
  'Sprout Child Care',
  'Meadow Lane Elementary',
  'Alpine Kids Academy',
]
const STREETS = ['Cedar Ln', 'Oak St', 'River Rd', 'Maple Ave', 'Pine Dr', 'Main St']
const TYPES = [
  ['school', 'point_of_interest'],
  ['school', 'establishment'],
  ['point_of_interest', 'establishment'],
]

// Stable pseudo-random value in [0, 1) from an integer seed.
const rand = (seed) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

const haversineKm = (a, b) => {
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '')

function centerFrom(body) {
  if (body.lat == null || body.lng == null) return FALLBACK_CENTER
  const lat = Number(body.lat)
  const lng = Number(body.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : FALLBACK_CENTER
}

function candidates(center, radiusKm, ctx) {
  const rows = NAMES.map((name, index) => {
    const angle = rand(index + 1) * Math.PI * 2
    const dist = 0.6 + rand(index + 40) * radiusKm * 0.92
    const lat = center.lat + (Math.sin(angle) * dist) / 111
    const lng =
      center.lng + (Math.cos(angle) * dist) / (111 * Math.cos((center.lat * Math.PI) / 180))
    const reviews = Math.round(rand(index + 80) * 180)
    return {
      place_id: 'demo-place-' + slug(name),
      school_name: name,
      address: `${100 + Math.round(rand(index + 5) * 800)} ${STREETS[index % STREETS.length]}, Fairfax, VA`,
      lat,
      lng,
      distance_km: Math.round(haversineKm(center, { lat, lng }) * 10) / 10,
      rating: reviews ? Math.round((3.4 + rand(index + 120) * 1.6) * 10) / 10 : null,
      user_ratings_total: reviews,
      types: TYPES[index % TYPES.length],
      already_saved: false,
      saved_school_id: null,
      owner_name: null,
    }
  })
  const saved = new Map(ctx.schools.map((s) => [slug(s.school_name), s]))
  const others = ctx.team.filter((member) => member.id !== ctx.user.id)
  rows.forEach((row, index) => {
    const known = saved.get(slug(row.school_name))
    if (known) {
      row.already_saved = true
      row.owner_name = known.user_name
      row.saved_school_id = ctx.user.admin || known.user_id === ctx.user.id ? known.id : null
    } else if (index === 2 || index === 7 || index === 15) {
      // A few places read as owned by other reps so the poaching guard is visible.
      row.already_saved = true
      row.owner_name = (others[index % others.length] || ctx.user).name
    }
  })
  return rows.sort((a, b) => a.distance_km - b.distance_km)
}

function search(ctx) {
  const { body } = ctx
  const center = centerFrom(body)
  const radius = Math.min(40, Math.max(1, Number(body.radius_km) || 8))
  const rows = candidates(center, radius, ctx)
  const page = body.page_token === 'demo-page-2' ? 2 : 1
  const start = (page - 1) * PAGE_SIZE
  return {
    location: { lat: center.lat, lng: center.lng, label: body.address || 'Fairfax, VA' },
    radius_km: radius,
    schools: ctx.clone(rows.slice(start, start + PAGE_SIZE)),
    next_page_token: page === 1 ? 'demo-page-2' : null,
  }
}

function details(ctx) {
  const out = {}
  ;(ctx.body.place_ids || []).slice(0, 20).forEach((id, index) => {
    const base = id.replace('demo-place-', '')
    const n = Math.round(rand(index + base.length) * 8999) + 1000
    out[id] = {
      phone: index % 5 === 4 ? '' : `(555) 010-${n}`,
      website: index % 4 === 3 ? '' : `https://www.${base}.example.test`,
      hours_text: 'Mon to Fri, 7:00 AM to 6:00 PM',
      formatted_address: '',
    }
  })
  return { details: out }
}

function saveBatch(ctx) {
  const { body, schools, user, team } = ctx
  const created = []
  const skipped = []
  let nextId = schools.reduce((max, s) => Math.max(max, s.id), 0) + 1
  const assignee =
    user.admin && body.assign_to
      ? team.find((member) => member.id === Number(body.assign_to)) || user
      : user
  for (const item of body.schools || []) {
    const dupe = schools.find((s) => slug(s.school_name) === slug(item.school_name))
    if (dupe) {
      skipped.push({
        place_id: item.place_id,
        reason: 'duplicate',
        detail: `Already assigned to ${dupe.user_name}`,
        owner_name: dupe.user_name,
        existing_id: dupe.id,
      })
      continue
    }
    const school = {
      id: nextId++,
      school_name: item.school_name,
      contact_name: '',
      email: item.email || '',
      additional_emails: [],
      all_emails: item.email ? [item.email] : [],
      phone: item.phone || '',
      address: item.address || '',
      school_type: item.school_type || 'preschool',
      status: 'pending',
      user_id: assignee.id,
      user_name: assignee.name,
      notes: '',
      next_action: '',
      next_action_at: null,
      created_at: new Date().toISOString(),
      place_id: item.place_id,
      lat: item.lat,
      lng: item.lng,
    }
    schools.push(school)
    created.push({ place_id: item.place_id, id: school.id })
  }
  return { created, skipped }
}

export function finderPreview(ctx) {
  if (ctx.method !== 'POST') return undefined
  if (ctx.endpoint === '/api/find-schools') return search(ctx)
  if (ctx.endpoint === '/api/find-schools/details') return details(ctx)
  if (ctx.endpoint === '/api/find-schools/save-batch') return saveBatch(ctx)
  return undefined
}
