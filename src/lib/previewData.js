/** Fictional records for local visual review. This module never calls fetch. */
import { DEMO_USER, NEW_EMPLOYEE_USER, DEMO_ADMIN_USER } from './previewFixtures.js'
import { NEW_EMPLOYEE_PREVIEW, ADMIN_PREVIEW } from './previewMode.js'

const schools = [
  { id: 1, school_name: 'Cedar Grove Preschool', contact_name: 'Jordan Lee', email: 'office@cedargrove.example.test', all_emails: ['office@cedargrove.example.test'], additional_emails: [], phone: '(555) 010-0101', address: '101 Cedar Lane, Fairfax, VA', school_type: 'preschool', status: 'contacted', user_name: DEMO_USER.name },
  { id: 2, school_name: 'Riverview Elementary', contact_name: 'Taylor Brooks', email: 'principal@riverview.example.test', all_emails: ['principal@riverview.example.test'], additional_emails: [], phone: '(555) 010-0102', address: '220 River Road, Arlington, VA', school_type: 'elementary', status: 'pending', user_name: DEMO_USER.name },
  { id: 3, school_name: 'Northfield Academy', contact_name: 'Morgan Patel', email: 'admin@northfield.example.test', all_emails: ['admin@northfield.example.test', 'programs@northfield.example.test'], additional_emails: ['programs@northfield.example.test'], phone: '(555) 010-0103', address: '33 Northfield Drive, McLean, VA', school_type: 'private', status: 'contacted', user_name: DEMO_USER.name },
  { id: 4, school_name: 'Oak Hill Learning Center', contact_name: 'Casey Rivera', email: 'director@oakhill.example.test', all_emails: ['director@oakhill.example.test'], additional_emails: [], phone: '(555) 010-0104', address: '84 Oak Street, Reston, VA', school_type: 'preschool', status: 'pending', user_name: DEMO_USER.name },
]

const daysBefore = (days) => new Date(Date.now() - days * 86400000).toISOString()
const emails = [
  { id: 101, school_name: schools[0].school_name, school_email: schools[0].email, user_name: DEMO_USER.name, sent_at: daysBefore(2), days_ago: 2, responded: true, followup_sent: false, has_reply_content: true, is_mine: true },
  { id: 102, school_name: schools[2].school_name, school_email: schools[2].email, user_name: DEMO_USER.name, sent_at: daysBefore(5), days_ago: 5, responded: true, followup_sent: false, has_reply_content: true, is_mine: true },
  { id: 103, school_name: schools[1].school_name, school_email: schools[1].email, user_name: DEMO_USER.name, sent_at: daysBefore(9), days_ago: 9, followup_due_at: daysBefore(2), followup_eligible: true, responded: false, followup_sent: false, has_reply_content: false, is_mine: true },
  { id: 104, school_name: schools[3].school_name, school_email: schools[3].email, user_name: DEMO_USER.name, sent_at: daysBefore(16), days_ago: 16, responded: false, followup_sent: true, has_reply_content: false, is_mine: true },
]

const finderSchools = [
  { place_id: 'preview-1', name: 'Cedar Grove Preschool', address: '101 Cedar Lane, Fairfax, VA', lat: 38.8462, lng: -77.3064 },
  { place_id: 'preview-2', name: 'Riverview Elementary', address: '220 River Road, Arlington, VA', lat: 38.8816, lng: -77.0932 },
  { place_id: 'preview-3', name: 'Northfield Academy', address: '33 Northfield Drive, McLean, VA', lat: 38.9339, lng: -77.1773 },
]

const point = (name, address, lat, lng) => ({ name, address, lat, lng })
const mapSchools = {
  happyfeet: [point('Cedar Grove Preschool', schools[0].address, 38.8462, -77.3064)],
  psa: [point('Northfield Academy', schools[2].address, 38.9339, -77.1773)],
  elementary: [point('Riverview Elementary', schools[1].address, 38.8816, -77.0932)],
  reached_out: [point('Oak Hill Learning Center', schools[3].address, 38.9505, -77.3429)],
  rec: [point('Meadow Recreation Site', '50 Meadow Way, Falls Church, VA', 38.8823, -77.1711)],
}

const clone = (value) => structuredClone(value)

export function previewRequest(path, { method = 'GET', body } = {}) {
  const endpoint = `/${String(path).replace(/^\//, '')}`

  if (method === 'GET') {
    if (endpoint === '/api/profile') return clone(ADMIN_PREVIEW ? DEMO_ADMIN_USER : NEW_EMPLOYEE_PREVIEW ? NEW_EMPLOYEE_USER : DEMO_USER)
    if (endpoint === '/api/my-schools') return clone(NEW_EMPLOYEE_PREVIEW ? [] : schools)
    if (endpoint === '/api/sent-emails') return clone(NEW_EMPLOYEE_PREVIEW ? [] : emails)
    if (endpoint === '/api/schools') return schools.map((school) => ({ id: school.id, name: school.school_name, address: school.address, phone: school.phone, contact: school.contact_name, email: school.email }))
    if (endpoint === '/api/team-stats') return clone([
      { name: DEMO_USER.name, email: DEMO_USER.email, phone: DEMO_USER.phone, role: 'Sales Associate', totalSchools: schools.length, totalEmails: emails.length },
      { name: 'Jamie Chen', email: 'jamie@example.test', phone: '(555) 010-0151', role: 'Sales Associate', totalSchools: 7, totalEmails: 12 },
      { name: 'Riley Davis', email: 'riley@example.test', phone: '(555) 010-0152', role: 'Sales Associate', totalSchools: 5, totalEmails: 8 },
    ])
    if (endpoint === '/api/map-schools') return clone(mapSchools)
    if (endpoint === '/api/invitations') return []
    if (endpoint === '/api/mail-credential-migration') {
      return { configured: 1, encrypted: 1, legacy: 0, invalid: 0, legacy_reads_enabled: false }
    }
    if (endpoint.startsWith('/api/followup-preview/')) {
      const email = emails.find((item) => String(item.id) === endpoint.split('/').at(-1))
      if (!email?.followup_eligible) throw new Error('This sample follow-up is not due.')
      return {
        email_id: email.id,
        school_name: email.school_name,
        to_email: email.school_email,
        subject: 'Follow-Up: PSA Programs',
        body: `Hello there,\n\nI wanted to follow up on my previous email about PSA sports programs for ${email.school_name}.\n\nWould you be open to a quick call?\n\nBest regards,\n${DEMO_USER.name}`,
        sent_at: email.sent_at,
        due_at: email.followup_due_at,
      }
    }
    if (endpoint.startsWith('/api/email-reply-chain/')) {
      const email = emails.find((item) => String(item.id) === endpoint.split('/').at(-1))
      if (!email) throw new Error('No preview reply found.')
      return clone({ school_name: email.school_name, school_email: email.school_email, reply_count: 1, last_reply_date: daysBefore(1), replies: [{ id: 1, reply_date: daysBefore(1), reply_sender: 'School contact', reply_content: 'Thanks for reaching out. We would like to learn more about PSA programs.' }] })
    }
  }

  // These preview-only calculations are local and cannot reach production.
  if (method === 'POST' && endpoint === '/api/find-schools') return clone({ schools: finderSchools, location: { lat: 38.89, lng: -77.22 } })
  if (method === 'POST' && endpoint === '/api/route-plan') return { route: (body?.schools || []).map((school) => school.place_id) }
  if (method === 'POST' && endpoint === '/api/refresh-map-schools') return { message: 'Preview map ready.' }
  if (method === 'POST' && endpoint === '/api/check-email-replies') return { message: 'Preview replies are up to date.' }

  throw new Error('Preview mode uses sample data. Changes and email sending are disabled.')
}
