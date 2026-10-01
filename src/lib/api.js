/* =========================================================
   API CLIENT

   Replaces the backend URL that was hardcoded at 33 call sites
   across 9 files, and the `if (res.status === 401)` block that
   was hand-repeated at every one of those call sites.

   Set VITE_API_BASE_URL in .env.local to point at a local or
   staging backend. If it is unset we fall back to production,
   which preserves the previous behaviour.
   ========================================================= */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'https://psa-sales-backend.onrender.com'
).replace(/\/$/, '')

/** Thrown for any non-2xx response. `payload` is the parsed JSON body when there was one. */
export class ApiError extends Error {
  constructor(message, { status, payload } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

/** Thrown specifically on 401 so callers can distinguish a dead token from a real failure. */
export class SessionExpiredError extends ApiError {
  constructor() {
    super('Your session has expired. Please log in again.', { status: 401 })
    this.name = 'SessionExpiredError'
  }
}

/* ---------------------------------------------------------
   Session-expiry notification

   AuthContext registers one handler at startup. Without this,
   every component had to remember to check for 401 itself -
   and a missed check meant a silent no-op that looked like the
   button simply did nothing.
   --------------------------------------------------------- */

let sessionExpiredHandler = null

export function onSessionExpired(handler) {
  sessionExpiredHandler = handler
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null
  }
}

function notifySessionExpired() {
  if (sessionExpiredHandler) sessionExpiredHandler()
}

/** Read the token the same way AuthContext persists it. */
function storedToken() {
  return localStorage.getItem('jwt') || ''
}

/**
 * Make a request against the PSA backend.
 *
 * @param {string} path         e.g. '/api/my-schools' (leading slash optional)
 * @param {object} [options]
 * @param {string} [options.method='GET']
 * @param {object} [options.body]      JSON-serialised automatically
 * @param {FormData} [options.formData] sent as-is; do not set Content-Type for this
 * @param {string} [options.token]     defaults to the stored JWT
 * @param {boolean} [options.auth=true] set false for the public endpoints
 * @returns {Promise<any>} the parsed JSON body (or null for 204/empty responses)
 */
export async function apiFetch(path, options = {}) {
  const {
    method = 'GET',
    body,
    formData,
    token = storedToken(),
    auth = true,
    signal,
  } = options

  const headers = {}
  if (auth && token) headers.Authorization = `Bearer ${token}`

  // Only set Content-Type for JSON. For FormData the browser must generate it
  // so that it can include the multipart boundary.
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const url = `${API_BASE_URL}/${String(path).replace(/^\//, '')}`

  const response = await fetch(url, {
    method,
    headers,
    signal,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  })

  if (response.status === 401) {
    notifySessionExpired()
    throw new SessionExpiredError()
  }

  // Some endpoints return an empty body on success; others return JSON even on
  // error. Parse defensively so a non-JSON error page cannot throw a confusing
  // SyntaxError in place of the real status.
  let payload = null
  const text = await response.text()
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = { raw: text }
    }
  }

  if (!response.ok) {
    const message =
      (payload && (payload.error || payload.message)) ||
      `Request failed with status ${response.status}`
    throw new ApiError(message, { status: response.status, payload })
  }

  return payload
}

/* Thin verb helpers - most call sites read better with these. */
export const api = {
  get: (path, options) => apiFetch(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiFetch(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => apiFetch(path, { ...options, method: 'PUT', body }),
  del: (path, body, options) => apiFetch(path, { ...options, method: 'DELETE', body }),
  upload: (path, formData, options) => apiFetch(path, { ...options, method: 'POST', formData }),
}

export default api
