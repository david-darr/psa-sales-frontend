import { programCommissionsPreview } from './programCommissions'

const links = []

const reports = []

export function adminPreview(ctx) {
  const { endpoint, method, body, user } = ctx
  const programResult = programCommissionsPreview(ctx)
  if (programResult !== undefined) return programResult
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
