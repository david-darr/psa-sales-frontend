export const SUPPORT_EMAIL = 'davidmichael.darr@gmail.com'

/** Link target for "Report this problem" on any error message. */
export function supportLink(error, page) {
  const params = new URLSearchParams({ kind: 'error' })
  if (error) params.set('error', String(error).slice(0, 1500))
  if (page) params.set('from', page)
  return '/support?' + params
}
