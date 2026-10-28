// Pure helpers for the school finder: presets, persistence, geometry, URLs.

export const KEYWORD_PRESETS = [
  { value: 'preschool', label: 'Preschool' },
  { value: 'daycare', label: 'Daycare' },
  { value: 'montessori', label: 'Montessori' },
  { value: 'elementary', label: 'Elementary' },
  { value: 'private school', label: 'Private school' },
  { value: 'child care', label: 'Child care' },
  { value: 'after-school', label: 'After-school' },
]

export const DEFAULT_KEYWORDS = ['preschool', 'daycare']
export const RADIUS_OPTIONS = [2, 5, 10, 20]
export const DEFAULT_RADIUS = 10
export const MAX_ROUTE_STOPS = 25
export const MY_LOCATION_LABEL = 'My location'

const STORAGE_KEY = 'psa-finder-last-search'

export function clampRadius(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULT_RADIUS
  return Math.min(40, Math.max(1, Math.round(n * 10) / 10))
}

export function normalizeKeyword(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .slice(0, 40)
}

export function keywordLabel(value) {
  const preset = KEYWORD_PRESETS.find((p) => p.value === value)
  if (preset) return preset.label
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

export function loadLastSearch() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!raw || typeof raw !== 'object') return null
    const keywords = Array.isArray(raw.keywords)
      ? raw.keywords.map(normalizeKeyword).filter(Boolean)
      : []
    return {
      address: typeof raw.address === 'string' ? raw.address : '',
      keywords,
      radius: clampRadius(raw.radius),
    }
  } catch {
    return null
  }
}

export function saveLastSearch({ address, keywords, radius }) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ address, keywords, radius }),
    )
  } catch {
    // Private mode or a full quota: persistence is a nicety, not a requirement.
  }
}

/** Reads ?q= &k= &r= . Returns null when there is no query. */
export function parseUrlSearch(params) {
  const q = (params.get('q') || '').trim()
  if (!q) return null
  const k = (params.get('k') || '')
    .split(',')
    .map(normalizeKeyword)
    .filter(Boolean)
  return {
    address: q,
    keywords: k.length ? [...new Set(k)] : null,
    radius: params.get('r') ? clampRadius(params.get('r')) : null,
  }
}

export function haversineKm(a, b) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatKm(km) {
  if (km === null || km === undefined || Number.isNaN(Number(km))) return ''
  return `${Number(km).toFixed(1)} km`
}

export function directionsUrl(school) {
  const hasCoords =
    Number.isFinite(Number(school.lat)) && Number.isFinite(Number(school.lng))
  const destination =
    school.address || (hasCoords ? `${school.lat},${school.lng}` : '')
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination,
  )}&travelmode=driving`
}

function stopQuery(stop) {
  if (typeof stop === 'string') return stop
  return Number.isFinite(Number(stop.lat))
    ? `${stop.lat},${stop.lng}`
    : stop.address
}

/**
 * Google Maps multi-stop links. The directions URL tops out around ten
 * points, so long routes are split into chained legs.
 */
export function routeUrls(stops, start) {
  const CHUNK = 9
  const urls = []
  let origin = start || null
  for (let i = 0; i < stops.length; i += CHUNK) {
    const part = stops.slice(i, i + CHUNK)
    const destination = part[part.length - 1]
    const via = part.slice(0, -1)
    const params = new URLSearchParams({ api: '1', travelmode: 'driving' })
    if (origin) params.set('origin', stopQuery(origin))
    params.set('destination', stopQuery(destination))
    if (via.length) params.set('waypoints', via.map(stopQuery).join('|'))
    urls.push({
      from: i + 1,
      to: i + part.length,
      href: `https://www.google.com/maps/dir/?${params.toString()}`,
    })
    origin = destination
  }
  return urls
}

const GENERIC_TYPES = new Set([
  'point_of_interest',
  'establishment',
  'premise',
  'political',
  'store',
])

export function typeLabels(types, max = 2) {
  const seen = []
  for (const type of types || []) {
    if (!type || GENERIC_TYPES.has(type)) continue
    const label = String(type)
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase())
    if (!seen.includes(label)) seen.push(label)
    if (seen.length >= max) break
  }
  return seen
}

/** Maps Google place types and the name onto SchoolDialog's school_type values. */
export function guessSchoolType(school) {
  const text = `${(school.types || []).join(' ')} ${school.school_name || ''}`
    .toLowerCase()
  if (/montessori|preschool|pre-school|daycare|day care|child ?care|nursery|early learning/.test(text))
    return 'preschool'
  if (/private|academy|preparatory|prep\b/.test(text)) return 'private'
  if (/elementary|primary_school|primary school/.test(text)) return 'elementary'
  return 'preschool'
}

export const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest first' },
  { value: 'rating', label: 'Top rated' },
  { value: 'reviews', label: 'Most reviews' },
]

export function sortSchools(list, sort) {
  const rows = [...list]
  const byDistance = (a, b) =>
    (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
  if (sort === 'rating')
    rows.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1) || byDistance(a, b))
  else if (sort === 'reviews')
    rows.sort(
      (a, b) =>
        (b.user_ratings_total ?? -1) - (a.user_ratings_total ?? -1) ||
        byDistance(a, b),
    )
  else rows.sort(byDistance)
  return rows
}

export function humanizeReason(reason) {
  const text = String(reason || 'Skipped').replace(/[_-]+/g, ' ').trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function hostOf(url) {
  try {
    return new URL(/^https?:/i.test(url) ? url : `https://${url}`).hostname.replace(
      /^www\./,
      '',
    )
  } catch {
    return url
  }
}

export function safeHref(url) {
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export function circlePolygon(lat, lng, km, steps = 72) {
  const coords = []
  const latRad = (lat * Math.PI) / 180
  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2
    const dLat = (km / 111.32) * Math.sin(angle)
    const dLng = (km / (111.32 * Math.cos(latRad))) * Math.cos(angle)
    coords.push([lng + dLng, lat + dLat])
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
  }
}
