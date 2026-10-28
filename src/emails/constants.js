/** PDFs the backend will attach. Must stay in sync with ALLOWED_PDFS in api.py. */
export const AVAILABLE_PDFS = [
  { file: 'PSA TOTS seasonal flyer.pdf', label: 'PSA TOTS Seasonal Flyer' },
  { file: 'PSA TOTS year round flyer.pdf', label: 'PSA TOTS Year Round Flyer' },
  { file: 'PSA TOTS Recommendation (Primrose School).pdf', label: 'Recommendation: Primrose School' },
  { file: 'PSA After School.pdf', label: 'PSA After School Program' },
  { file: 'PSA Recommendation (St. Theresa).pdf', label: 'Recommendation: St. Theresa' },
  { file: 'PSA Recommendation Letter (Madison Trust ES).pdf', label: 'Recommendation: Madison Trust ES' },
]

export const SCHOOL_TYPES = [
  { value: 'preschool', label: 'Preschool' },
  { value: 'elementary', label: 'Elementary School' },
  { value: 'private', label: 'Private School' },
]

export const EMPTY_SCHOOL = {
  school_name: '',
  contact_name: '',
  email: '',
  additional_emails: [''],
  phone: '',
  address: '',
  school_type: 'preschool',
}

export const EMPTY_CUSTOM_REPLY = {
  email_id: null,
  school_email: '',
  school_name: '',
  subject: '',
  message: '',
}

/* ---------------- Outreach vocabulary ---------------- */

/** Message types the batch endpoints understand. */
export const KINDS = {
  initial: {
    label: 'Intro email',
    blurb: 'First contact with schools you have not emailed yet.',
  },
  followup: {
    label: 'Follow-up',
    blurb: 'A nudge to schools that have not answered after a week.',
  },
  custom: {
    label: 'Custom email',
    blurb: 'Write your own message for any school you can contact.',
  },
}

/** Why a school cannot be emailed right now, in plain language. */
export const BLOCKERS = {
  missing_email: {
    label: 'Missing email',
    tone: 'danger',
    tip: 'This school has no email address on file. Add one on the school page.',
  },
  replied: {
    label: 'Already replied',
    tone: 'warn',
    tip: 'This school already answered. Reply from the Inbox instead.',
  },
  closed: {
    label: 'Closed',
    tone: 'danger',
    tip: 'This school is closed, a partner or a former client, so outreach is paused.',
  },
  recently_contacted: {
    label: 'Contacted recently',
    tone: 'warn',
    tip: 'You emailed this school very recently. Wait a few days before writing again.',
  },
  not_due: {
    label: 'Not due',
    tone: 'warn',
    tip: 'Follow-ups unlock seven days after the last email.',
  },
  unsubscribed: {
    label: 'Unsubscribed',
    tone: 'danger',
    tip: 'This contact asked not to receive email. They can never be selected.',
  },
  no_mailbox: {
    label: 'No mailbox',
    tone: 'danger',
    tip: 'Connect your work mailbox on the Account page to send email.',
  },
}

/** Preview warnings. Blocking ones are skipped by the server when sending. */
export const WARNINGS = {
  ...BLOCKERS,
  empty_greeting: {
    label: 'No contact name',
    tone: 'warn',
    tip: 'There is no contact name on file, so the greeting will read "Hello there".',
  },
}
export const BLOCKING_WARNINGS = ['missing_email', 'replied', 'closed', 'unsubscribed']

export const blockerMeta = (key) =>
  BLOCKERS[key] || { label: key.replace(/_/g, ' '), tone: 'warn', tip: key }
export const warningMeta = (key) =>
  WARNINGS[key] || { label: key.replace(/_/g, ' '), tone: 'warn', tip: key }

/**
 * Variables shown as chips in the composer. Authors type the readable form;
 * it is translated to the bracket placeholders the custom email endpoints
 * already replace per school ([school_name] and friends) just before preview
 * and send.
 */
export const TEMPLATE_VARS = [
  { token: '{school name}', server: '[school_name]' },
  { token: '{contact name}', server: '[contact_name]' },
  { token: '{my name}', server: '[user_name]' },
  { token: '{my email}', server: '[user_email]' },
]

export function toServerTemplate(text = '') {
  return TEMPLATE_VARS.reduce(
    (out, { token, server }) => out.split(token).join(server),
    text,
  )
}

export const DEFAULT_TEMPLATES = {
  initial: {
    subject: "Let's Connect! PSA Programs",
    body: `Hello {contact name},

My name is {my name}, and I'm with The Players Sports Academy. I'd love to explore bringing on-site sports programs to {school name}.

Would you be open to a short introductory call?

Best,
{my name}`,
  },
  followup: {
    subject: 'Follow-Up: PSA Programs',
    body: `Hello {contact name},

I wanted to follow up on my earlier note about PSA sports programs at {school name}. Would a brief call be helpful?

Best,
{my name}`,
  },
  custom: { subject: '', body: '' },
}

export const BATCH_ACTIVE = ['queued', 'sending']

export const BATCH_STATUS = {
  queued: { label: 'Queued', tone: 'neutral' },
  sending: { label: 'Sending', tone: 'live' },
  done: { label: 'Done', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  stalled: { label: 'Stalled', tone: 'danger' },
}

export const RECIPIENT_STATUS = {
  queued: { label: 'Queued', tone: 'neutral' },
  sending: { label: 'Sending', tone: 'live' },
  sent: { label: 'Sent', tone: 'ok' },
  failed: { label: 'Failed', tone: 'danger' },
  skipped: { label: 'Skipped', tone: 'warn' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

/* ---------------- Dates and numbers ---------------- */

/** The backend stores UTC timestamps without a timezone suffix. */
export function serverDate(value) {
  if (!value) return null
  const withZone = /(Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`
  const date = new Date(withZone)
  return Number.isNaN(date.getTime()) ? null : date
}

export function relativeTime(value, now = Date.now()) {
  const date = serverDate(value)
  if (!date) return 'Never'
  const minutes = Math.round((now - date.getTime()) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function shortDate(value) {
  const date = serverDate(value)
  return date
    ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Unknown'
}

export function shortTime(value) {
  const date = serverDate(value)
  return date
    ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : ''
}

/** "resets 12:00 AM" today or "resets tomorrow 12:00 AM". */
export function resetLabel(value) {
  const date = serverDate(value)
  if (!date) return ''
  const sameDay = date.toDateString() === new Date().toDateString()
  return `${sameDay ? '' : 'tomorrow '}${shortTime(value)}`.trim()
}

/** Due state for a follow-up, most overdue sorts first. */
export function dueState(dueAt, now = Date.now()) {
  const date = serverDate(dueAt)
  if (!date) return { days: null, label: 'No date', tone: 'neutral' }
  const days = Math.floor((now - date.getTime()) / 86400000)
  if (days > 0) return { days, label: `${days}d overdue`, tone: 'danger' }
  if (days === 0 || date.getTime() <= now)
    return { days: 0, label: 'Due today', tone: 'warn' }
  const ahead = Math.ceil((date.getTime() - now) / 86400000)
  return { days: -ahead, label: `Due in ${ahead}d`, tone: 'neutral' }
}

export const plural = (count, one, many = `${one}s`) =>
  `${count.toLocaleString()} ${count === 1 ? one : many}`

/* ---------------- CSV template ---------------- */

export const CSV_TEMPLATE = `school_name,email,contact_name,phone,address,school_type
"ABC Preschool","director@abcpreschool.com","Jane Smith","555-0123","123 Main St, Fairfax VA","preschool"
"ABC Preschool","admin@abcpreschool.com","John Doe","555-0123","123 Main St, Fairfax VA","preschool"
"XYZ Elementary","principal@xyzelementary.edu","Mary Johnson","555-0456","456 Oak Ave, Reston VA","elementary"
"St. Mary Catholic School","office@stmary.org","Father Mike","555-0789","789 Pine Rd, McLean VA","private"`

export function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'schools_template.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
