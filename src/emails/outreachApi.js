import api from '../lib/api'

const query = (values) => {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '')
      params.set(key, value)
  })
  return params.toString()
}

/** Thin wrappers over the outreach batch endpoints. */
export const outreachApi = {
  recipients: (params, options) =>
    api.get(`/api/outreach/recipients?${query(params)}`, options),
  limits: () => api.get('/api/outreach/limits'),
  batches: (limit = 10) => api.get(`/api/outreach/batches?limit=${limit}&scope=mine`),
  batch: (id) => api.get(`/api/outreach/batches/${id}`),
  createBatch: (payload) => api.post('/api/outreach/batches', payload),
  retryBatch: (id) => api.post(`/api/outreach/batches/${id}/retry`, {}),
  cancelBatch: (id) => api.post(`/api/outreach/batches/${id}/cancel`, {}),
  preview: (payload) => api.post('/api/email-preview', payload),
}

/**
 * Walk every page of a recipient query, up to `cap` rows. Used by "select all
 * eligible", "send all due" and the finder deep link, none of which can rely
 * on the page the table happens to be showing.
 */
export async function loadAllRecipients(
  params,
  { cap = 1000, perPage = 100 } = {},
) {
  const items = []
  let page = 1
  let total = 0
  for (;;) {
    const data = await outreachApi.recipients({
      ...params,
      page,
      per_page: perPage,
    })
    total = data.total ?? 0
    items.push(...(data.items || []))
    if (!data.items?.length || items.length >= total || items.length >= cap)
      break
    page += 1
  }
  return { items: items.slice(0, cap), total, truncated: total > cap }
}
