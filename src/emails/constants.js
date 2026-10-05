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
  { value: 'preschool', label: 'Preschool', display: 'Preschool', tone: 'warning', order: 0 },
  { value: 'elementary', label: 'Elementary School', display: 'Elementary', tone: 'success', order: 1 },
  { value: 'private', label: 'Private School', display: 'Private School', tone: 'info', order: 2 },
]

const TYPE_BY_VALUE = new Map(SCHOOL_TYPES.map((t) => [t.value, t]))

export function schoolType(value) {
  return TYPE_BY_VALUE.get(value) || SCHOOL_TYPES[1]
}

export const EMPTY_SCHOOL = {
  school_name: '',
  contact_name: '',
  email: '',
  additional_emails: [''],
  phone: '',
  address: '',
  school_type: 'preschool',
}

export const EMPTY_CUSTOM_EMAIL = {
  school_id: null,
  school_ids: [],
  school_name: '',
  school_email: '',
  all_emails: [],
  subject: '',
  message: '',
  pdf_files: [],
}

export const EMPTY_CUSTOM_REPLY = {
  email_id: null,
  school_email: '',
  school_name: '',
  subject: '',
  message: '',
}

/**
 * The backend sends one email per (school, address) pair over a single SMTP
 * connection. The frontend still splits large selections into batches so the
 * user gets progress feedback and no single request runs unusually long.
 */
export const MAX_EMAILS_PER_BATCH = 20

/** "Today" / "3 days ago", with a tone that gets warmer as it ages. */
export function timeAgo(daysAgo = 0) {
  if (daysAgo === 0) return { text: 'Today', tone: 'success' }
  if (daysAgo === 1) return { text: 'Yesterday', tone: 'primary' }
  if (daysAgo <= 7) return { text: `${daysAgo} days ago`, tone: 'warning' }
  if (daysAgo <= 30) return { text: `${daysAgo} days ago`, tone: 'danger' }
  return { text: `${daysAgo} days ago`, tone: 'neutral' }
}

/** Follow-up nudge for an unanswered email, or null if none is warranted. */
export function followupUrgency(email) {
  if (email.responded || email.followup_sent) return null
  const daysAgo = email.days_ago || 0
  if (daysAgo >= 14) return { text: 'Urgent follow-up', tone: 'danger' }
  if (daysAgo >= 7) return { text: 'Follow-up due', tone: 'warning' }
  if (daysAgo >= 3) return { text: 'Follow-up soon', tone: 'primary' }
  return null
}

/** Sent-email state as a tone + label. */
export function emailState(email) {
  if (email.responded) return { tone: 'success', label: 'Responded' }
  if (email.followup_sent) return { tone: 'warning', label: 'Follow-up sent' }
  return { tone: 'neutral', label: 'Pending' }
}

/** Eligibility comes from the backend's 7-day, reply, and ownership rules. */
export function canSendFollowup(email) {
  return email.followup_eligible === true && email.is_mine === true
}

/** The backend stores UTC timestamps without a timezone suffix. */
export function serverDate(value) {
  if (!value) return null
  const withZone = /(Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`
  return new Date(withZone)
}

export function serverDateLabel(value) {
  const date = serverDate(value)
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : 'Unknown'
}

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
  // The old version never revoked the blob URL, leaking it for the life of
  // the page every time the template was downloaded.
  URL.revokeObjectURL(url)
}

/** How many addresses a send will actually hit, given the "all emails" toggle. */
export function countOutgoing(schools, selectedIds, sendToAllEmails) {
  const selected = schools.filter((s) => selectedIds.includes(s.id))
  if (!sendToAllEmails) return selected.length
  return selected.reduce((total, s) => total + (s.all_emails ? s.all_emails.length : 1), 0)
}

/**
 * Group selected school ids into batches of at most MAX_EMAILS_PER_BATCH
 * outgoing addresses (not schools), so "send to all emails" on schools with
 * several contacts each does not produce an oversized request.
 */
export function batchSchoolIds(schools, selectedIds, sendToAllEmails) {
  const byId = new Map(schools.map((s) => [s.id, s]))
  const batches = []
  let current = []
  let currentCount = 0

  for (const id of selectedIds) {
    const school = byId.get(id)
    const emailCount = sendToAllEmails && school?.all_emails ? school.all_emails.length : 1

    if (current.length > 0 && currentCount + emailCount > MAX_EMAILS_PER_BATCH) {
      batches.push(current)
      current = [id]
      currentCount = emailCount
    } else {
      current.push(id)
      currentCount += emailCount
    }
  }

  if (current.length > 0) batches.push(current)
  return batches
}
