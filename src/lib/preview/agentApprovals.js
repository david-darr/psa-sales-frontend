import { contactOutreachPreview } from './contactOutreach'
const drafts = []
const clone = (value) => structuredClone(value)
function seed(ctx) {
  if (drafts.length) return
  const id = Math.max(...ctx.schools.map((s) => s.id)) + 1
  ctx.schools.push({ id, school_name: 'Agent Approval Preview Academy', email: 'principal@agent-preview.example.test', contact_name: 'Taylor', additional_emails: [], status: 'pending', user_id: ctx.user.id, user_name: ctx.user.name, school_type: 'elementary', county: 'Demo County', address: '' })
  const settings = { contact_mode: true, school_ids: [id], kind: 'custom', audience: 'all', subject: 'PSA programs for [school_name]', body: 'Hello [contact_name],\n\nHere is the fictional outreach your agent prepared for review.', attachment_ids: [] }
  const result = contactOutreachPreview({ ...ctx, endpoint: '/api/email-preview', method: 'POST', body: settings })
  const { preview_token: _proof, ...preview } = result
  drafts.push({ id: 'demo-agent-draft', user_id: ctx.user.id, sender_id: ctx.user.id, key_id: 1, key_name: 'AI preview', key_active: true, can_execute: true, status: 'awaiting', revision: 1, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 900000).toISOString(), preview, settings })
}
export function agentApprovalsPreview(ctx) {
  const { endpoint, method, body } = ctx
  if (!endpoint.startsWith('/api/agent-outreach-drafts')) return undefined
  seed(ctx)
  if (endpoint === '/api/agent-outreach-drafts') return { items: clone(drafts.filter((d) => d.user_id === ctx.user.id)), total: drafts.length, page: 1 }
  const match = endpoint.match(/^\/api\/agent-outreach-drafts\/([A-Za-z0-9_-]+)(?:\/(approve|refresh|revoke))?$/)
  const draft = match && drafts.find((d) => d.id === match[1] && d.user_id === ctx.user.id)
  if (!draft) throw new Error('Draft not found')
  if (method === 'GET' && !match[2]) return clone(draft)
  if (body?.revision !== draft.revision) throw new Error('Draft changed. Review again.')
  if (match[2] === 'revoke') { draft.status = 'revoked'; draft.revision++ }
  else if (draft.status === 'revoked' || draft.batch_id) throw new Error('Draft already queued or revoked')
  else if (match[2] === 'refresh') {
    const { preview_token: _proof, ...preview } = contactOutreachPreview({ ...ctx, endpoint: '/api/email-preview', method: 'POST', body: draft.settings })
    draft.preview = preview; draft.revision++; draft.status = 'awaiting'; draft.approval_id = null
    draft.expires_at = new Date(Date.now() + 900000).toISOString()
  } else if (match[2] === 'approve') {
    if (draft.status !== 'awaiting' || Date.parse(draft.expires_at) <= Date.now()) throw new Error('Refresh and review again')
    if (!draft.preview.previews.some((r) => r.eligible)) throw new Error('No eligible recipients')
    draft.status = 'approved'; draft.approval_id = 'demo-approval'; draft.approved_at = new Date().toISOString()
  } else throw new Error('Unknown action')
  return clone(draft)
}
