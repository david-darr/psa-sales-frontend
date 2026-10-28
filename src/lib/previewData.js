import {
  DEMO_USER,
  NEW_EMPLOYEE_USER,
  DEMO_ADMIN_USER,
} from './previewFixtures'
import { NEW_EMPLOYEE_PREVIEW, ADMIN_PREVIEW } from './previewMode'
import { localToday } from './crm'
import { portfolioPreview } from './preview/portfolio'
import { finderPreview } from './preview/finder'
import { outreachPreview } from './preview/outreach'

const user = ADMIN_PREVIEW
  ? DEMO_ADMIN_USER
  : NEW_EMPLOYEE_PREVIEW
    ? NEW_EMPLOYEE_USER
    : DEMO_USER
const team = [
  DEMO_USER,
  {
    id: 2,
    name: 'Jamie Chen',
    email: 'jamie@example.test',
    admin: false,
    mail_connected: true,
  },
  DEMO_ADMIN_USER,
  NEW_EMPLOYEE_USER,
]
const ago = (days) => new Date(Date.now() - days * 86400000).toISOString()
const clone = (value) => structuredClone(value)
const names = [
  'Cedar Grove Preschool',
  'Riverview Elementary',
  'Northfield Academy',
  'Oak Hill Learning Center',
  'Bright Horizons Preschool',
  'Willow Creek Montessori',
  'Meadowbrook Elementary',
  'Little Oak Academy',
  'Bluebird Early Learning',
  'Westfield Preparatory',
  'Spring Valley School',
  'Maple Ridge Montessori',
  'Fairview Learning Academy',
  'Brookside Elementary',
  'Crestwood Preschool',
  'Heritage Day School',
]
const stages = [
  'partner',
  'partner',
  'meeting',
  'contacted',
  'partner',
  'former',
  'contacted',
  'replied',
  'pending',
  'meeting',
  'contacted',
  'not_interested',
  'partner',
  'pending',
  'former',
  'replied',
]
const CLOSED_STAGES = ['partner', 'former']
let schools = names.map((name, index) => {
  const owner = team[index % 5 === 0 ? 2 : index % 4 === 0 ? 1 : 0]
  const email =
    'office@' + name.toLowerCase().replace(/[^a-z]/g, '') + '.example.test'
  return {
    id: index + 1,
    school_name: name,
    contact_name: [
      'Jordan Lee',
      'Taylor Brooks',
      'Morgan Patel',
      'Casey Rivera',
    ][index % 4],
    email,
    additional_emails: [],
    all_emails: [email],
    phone: '(555) 010-' + (1000 + index),
    address:
      100 +
      index * 27 +
      ' ' +
      [
        'Cedar Lane, Fairfax, VA',
        'River Road, Arlington, VA',
        'Oak Street, Reston, VA',
      ][index % 3],
    school_type: ['preschool', 'elementary', 'private'][index % 3],
    status: stages[index],
    user_id: owner.id,
    user_name: owner.name,
    notes:
      index % 3 === 0
        ? 'Interested in on-site sports programs. Director prefers a short phone call before scheduling a visit.'
        : '',
    next_action:
      index % 3 !== 1
        ? [
            'Send program details',
            'Schedule an introductory visit',
            'Call the director',
          ][index % 3]
        : '',
    next_action_at: index % 3 !== 1 ? ago((index % 4) - 2) : null,
    created_at: ago(18 + index * 2),
    lat: 38.88 + ((index * 37) % 17) * 0.011 - 0.09,
    lng: -77.25 + ((index * 53) % 19) * 0.012 - 0.1,
    closed_at: CLOSED_STAGES.includes(stages[index])
      ? ago(20 + index * 11)
      : null,
    closed_by_id: CLOSED_STAGES.includes(stages[index]) ? owner.id : null,
    closed_by_name: CLOSED_STAGES.includes(stages[index]) ? owner.name : null,
  }
})
let emails = schools
  .filter((school) => school.status !== 'pending')
  .flatMap((school, index) =>
    [0, 1].map((round) => {
      const days = round ? index % 12 : 8 + index
      return {
        id: 101 + index * 2 + round,
        school_name: school.school_name,
        school_email: school.email,
        sales_school_id: school.id,
        user_id: school.user_id,
        user_name: school.user_name,
        sent_at: ago(days),
        days_ago: days,
        responded: ['replied', 'meeting', 'partner'].includes(school.status),
        followup_sent: round === 0 && index % 3 === 1,
        has_reply_content: ['replied', 'meeting', 'partner'].includes(
          school.status,
        ),
        is_mine: school.user_id === user.id,
        followup_eligible:
          school.user_id === user.id &&
          school.status === 'contacted' &&
          days >= 7 &&
          !(round === 0 && index % 3 === 1),
        followup_due_at: ago(days - 7),
      }
    }),
  )
let tasks = [
  ['Call the director about spring programs', 1, -1, 'high'],
  ['Send the after-school program overview', 3, 0, 'normal'],
  ['Prepare questions for the introductory visit', 8, 1, 'normal'],
  ['Review the proposed program dates', 4, -3, 'high'],
  ['Confirm availability for a school visit', 6, 3, 'normal'],
  ['Follow up on the partnership proposal', 7, 0, 'normal'],
  ['Research schools in the Fairfax territory', null, 2, 'normal'],
  ['Review new employee onboarding', null, 0, 'normal'],
].map(([title, schoolId, offset, priority], index) => {
  const school = schools.find((item) => item.id === schoolId)
  return {
    id: index + 1,
    title,
    school_id: schoolId,
    school_name: school?.school_name || null,
    user_id: school?.user_id || (index === 7 ? 3 : 1),
    owner_name:
      school?.user_name ||
      (index === 7 ? DEMO_ADMIN_USER.name : DEMO_USER.name),
    due_at: ago(-offset),
    priority,
    status: 'open',
    version: 1,
  }
})
let activities = schools
  .slice(0, 8)
  .map((school, index) => ({
    school_id: school.id,
    school_name: school.school_name,
    actor: school.user_name,
    kind: index % 2 ? 'call' : 'note',
    detail:
      index % 2
        ? 'Discussed program options with the director.'
        : 'Added context for the next conversation.',
    at: ago(index / 4),
  }))
const directory = [
  ...schools.map((school) => ({
    id: school.id,
    name: school.school_name,
    email: school.email,
    contact: school.contact_name,
    phone: school.phone,
    address: school.address,
  })),
  ...[
    'Fox Meadow Preschool',
    'Evergreen Learning Center',
    'Lakeside Academy',
  ].map((name, index) => ({
    id: 50 + index,
    name,
    email: 'director@sample' + index + '.example.test',
    address: 30 + index + ' Meadow Way, Fairfax, VA',
    phone: '(555) 010-0199',
    contact: 'School administrator',
  })),
]
const mapSchools = {
  psa: schools
    .slice(0, 3)
    .map((school, index) => ({
      name: school.school_name,
      address: school.address,
      lat: 38.84 + index * 0.04,
      lng: -77.31 + index * 0.05,
    })),
  happyfeet: [
    { name: names[4], address: schools[4].address, lat: 38.88, lng: -77.17 },
  ],
  elementary: [
    { name: names[6], address: schools[6].address, lat: 38.93, lng: -77.21 },
  ],
  rec: [
    {
      name: 'Meadow Recreation Site',
      address: '50 Meadow Way, Fairfax, VA',
      lat: 38.89,
      lng: -77.25,
    },
  ],
}
const scoped = (items, params) =>
  items.filter(
    (item) =>
      (user.admin && params.get('scope') !== 'mine') ||
      item.user_id === user.id,
  )
const accessible = (school) =>
  school && (user.admin || school.user_id === user.id)
const paged = (items, params) => {
  const page = Number(params.get('page') || 1),
    limit = Number(params.get('limit') || 25)
  return clone({
    items: items.slice((page - 1) * limit, page * limit),
    total: items.length,
    page,
    limit,
  })
}
const log = (school, detail) =>
  activities.unshift({
    school_id: school.id,
    school_name: school.school_name,
    actor: user.name,
    kind: 'updated',
    detail,
    at: ago(0),
  })
const teamStats = () =>
  team.map((member) => ({
    ...member,
    role: member.admin ? 'Administrator' : 'Sales representative',
    schools: schools.filter((item) => item.user_id === member.id).length,
    sent: emails.filter((item) => item.user_id === member.id).length,
    responses: emails.filter(
      (item) => item.user_id === member.id && item.responded,
    ).length,
    overdue: tasks.filter(
      (item) =>
        item.user_id === member.id &&
        item.status === 'open' &&
        item.due_at?.slice(0, 10) < localToday(),
    ).length,
  }))

export function previewRequest(path, { method = 'GET', body = {} } = {}) {
  const url = new URL(path, 'http://demo.invalid'),
    endpoint = url.pathname,
    params = url.searchParams
  const ctx = {
    endpoint,
    method,
    body,
    params,
    user,
    team,
    ago,
    clone,
    scoped,
    paged,
    accessible,
    log,
    get schools() {
      return schools
    },
    get emails() {
      return emails
    },
    get directory() {
      return directory
    },
  }
  for (const handler of [portfolioPreview, finderPreview, outreachPreview]) {
    const result = handler(ctx)
    if (result !== undefined) return result
  }
  if (endpoint === '/api/crm/profile' && method === 'PATCH') {
    Object.assign(user, body)
    return clone(user)
  }
  const teamMatch = endpoint.match(/^\/api\/crm\/team\/(\d+)$/)
  if (teamMatch && method === 'PATCH') {
    const member = team.find((item) => item.id === Number(teamMatch[1]))
    if (!user.admin) throw new Error('Administrator access required')
    if (!member) throw new Error('Team member not found')
    if (member.id === user.id)
      throw new Error('You cannot change your own administrator access')
    member.admin = Boolean(body.admin)
    return clone(teamStats().find((item) => item.id === member.id))
  }
  if (endpoint === '/api/crm/team') return clone(teamStats())
  if (endpoint === '/api/crm/schools' && method === 'GET') {
    let rows = scoped(schools, params)
    const term = (params.get('q') || '').toLowerCase()
    rows = rows.filter(
      (school) =>
        !term ||
        [school.school_name, school.email, school.contact_name, school.address]
          .join(' ')
          .toLowerCase()
          .includes(term),
    )
    if (params.get('stage'))
      rows = rows.filter((row) => row.status === params.get('stage'))
    if (params.get('owner'))
      rows = rows.filter((row) => row.user_id === Number(params.get('owner')))
    if (params.get('type'))
      rows = rows.filter((row) => row.school_type === params.get('type'))
    if (params.get('due') === 'overdue')
      rows = rows.filter(
        (row) =>
          row.next_action && row.next_action_at?.slice(0, 10) < localToday(),
      )
    if (params.get('due') === 'none')
      rows = rows.filter((row) => !row.next_action)
    rows = [...rows].sort((a, b) =>
      params.get('sort') === 'due'
        ? (a.next_action_at || 'z').localeCompare(b.next_action_at || 'z')
        : a.school_name.localeCompare(b.school_name),
    )
    return paged(rows, params)
  }
  if (endpoint === '/api/crm/directory') {
    const rows = directory
      .filter((row) =>
        Object.values(row)
          .join(' ')
          .toLowerCase()
          .includes((params.get('q') || '').toLowerCase()),
      )
      .map((row) => {
        const assigned = schools.find((school) => school.email === row.email)
        return {
          ...row,
          assigned: Boolean(assigned),
          owner_name: assigned?.user_name,
          sales_school_id: accessible(assigned) ? assigned.id : null,
        }
      })
    return paged(rows, params)
  }
  if (endpoint === '/api/crm/schools/bulk') {
    const rows = schools.filter((school) => body.ids.includes(school.id))
    if (
      rows.length !== body.ids.length ||
      rows.some((school) => !accessible(school))
    )
      throw new Error('School unavailable.')
    if (body.user_id && !user.admin)
      throw new Error('Only administrators can reassign schools.')
    for (const school of rows) {
      if (body.status) school.status = body.status
      if (body.user_id) {
        school.user_id = body.user_id
        school.user_name = team.find(
          (member) => member.id === body.user_id,
        )?.name
        tasks
          .filter(
            (task) => task.school_id === school.id && task.status === 'open',
          )
          .forEach((task) => {
            task.user_id = school.user_id
            task.owner_name = school.user_name
            task.version++
          })
      }
      log(school, 'Updated ' + (body.status ? 'stage' : 'owner'))
    }
    return { updated: rows.length }
  }
  if (endpoint === '/api/crm/tasks' && method === 'GET') {
    let rows = scoped(tasks, params)
    if (params.get('school_id'))
      rows = rows.filter(
        (task) => task.school_id === Number(params.get('school_id')),
      )
    const view = params.get('view') || 'open'
    rows = rows.filter((task) =>
      view === 'completed'
        ? task.status === 'completed'
        : task.status === 'open',
    )
    if (view === 'today')
      rows = rows.filter((task) => task.due_at?.slice(0, 10) === localToday())
    if (view === 'overdue')
      rows = rows.filter((task) => task.due_at?.slice(0, 10) < localToday())
    if (view === 'upcoming')
      rows = rows.filter((task) => task.due_at?.slice(0, 10) > localToday())
    return paged(
      [...rows].sort((a, b) =>
        (a.due_at || 'z').localeCompare(b.due_at || 'z'),
      ),
      params,
    )
  }
  if (endpoint === '/api/crm/tasks' && method === 'POST') {
    const school = schools.find((item) => item.id === body.school_id)
    const task = {
      ...body,
      id: Math.max(0, ...tasks.map((item) => item.id)) + 1,
      status: 'open',
      version: 1,
      owner_name: team.find((member) => member.id === body.user_id)?.name,
      school_name: school?.school_name || null,
    }
    tasks.push(task)
    return clone(task)
  }
  if (endpoint.startsWith('/api/crm/tasks/') && method === 'PATCH') {
    const task = tasks.find(
      (item) => item.id === Number(endpoint.split('/').at(-1)),
    )
    if (!task || (!user.admin && task.user_id !== user.id))
      throw new Error('Task unavailable.')
    if (body.version !== task.version)
      throw new Error('This task changed. Refresh before trying again.')
    Object.assign(task, body, { version: task.version + 1 })
    return clone(task)
  }
  if (endpoint === '/api/crm/overview') {
    const rows = scoped(schools, params),
      mail = scoped(emails, params),
      open = scoped(tasks, params).filter((task) => task.status === 'open')
    const pipeline = Object.fromEntries(
      [
        'pending',
        'contacted',
        'replied',
        'meeting',
        'partner',
        'not_interested',
      ].map((stage) => [
        stage,
        rows.filter((school) => school.status === stage).length,
      ]),
    )
    const responses = mail.filter((item) => item.responded).length
    return clone({
      scope: user.admin && params.get('scope') !== 'mine' ? 'team' : 'mine',
      schools: rows.length,
      pipeline,
      sent: mail.length,
      responses,
      response_rate: mail.length
        ? Math.round((responses / mail.length) * 1000) / 10
        : 0,
      due_followups: emails.filter(
        (item) => item.is_mine && item.followup_eligible,
      ).length,
      tasks_open: open.length,
      tasks_overdue: open.filter(
        (task) => task.due_at?.slice(0, 10) < localToday(),
      ).length,
      tasks: [...open]
        .sort((a, b) => (a.due_at || 'z').localeCompare(b.due_at || 'z'))
        .slice(0, 6),
      actions: rows.filter((school) => school.next_action).slice(0, 5),
      activity: activities
        .filter((item) => rows.some((school) => school.id === item.school_id))
        .slice(0, 6),
      trend: Array.from({ length: 14 }, (_, index) => {
        const date = ago(13 - index).slice(0, 10)
        return {
          date,
          sent: mail.filter((item) => item.sent_at.slice(0, 10) === date)
            .length,
        }
      }),
    })
  }
  if (/^\/api\/sales-schools\/\d+(\/activity)?$/.test(endpoint)) {
    const id = Number(endpoint.split('/')[3]),
      school = schools.find((item) => item.id === id)
    if (!accessible(school)) throw new Error('School not found.')
    if (method === 'PATCH') {
      if (body.user_id && !user.admin)
        throw new Error('Only administrators can reassign schools.')
      Object.assign(school, body)
      school.all_emails = [school.email, ...(school.additional_emails || [])]
      school.user_name = team.find(
        (member) => member.id === school.user_id,
      )?.name
      tasks
        .filter((task) => task.school_id === id && task.status === 'open')
        .forEach((task) => {
          task.user_id = school.user_id
          task.owner_name = school.user_name
          task.version++
        })
      log(school, 'Updated school details')
      return clone(school)
    }
    if (method === 'POST' && endpoint.endsWith('/activity')) {
      activities.unshift({
        ...body,
        school_id: id,
        school_name: school.school_name,
        actor: user.name,
        at: ago(0),
      })
      return { id: activities.length }
    }
    return clone({
      school,
      timeline: [
        ...activities.filter((item) => item.school_id === id),
        ...emails
          .filter((item) => item.sales_school_id === id)
          .map((item) => ({
            kind: 'outreach',
            at: item.sent_at,
            detail: 'Introductory email sent to ' + item.school_email,
          })),
      ].sort((a, b) => b.at.localeCompare(a.at)),
    })
  }
  if (endpoint === '/api/add-school' && method === 'POST') {
    if (
      schools.some(
        (item) => item.email.toLowerCase() === body.email.toLowerCase(),
      )
    )
      throw new Error('This school is already assigned to your team.')
    const school = {
      ...body,
      id: Math.max(...schools.map((item) => item.id)) + 1,
      all_emails: [body.email],
      status: 'pending',
      user_id: user.id,
      user_name: user.name,
      created_at: ago(0),
    }
    schools.push(school)
    log(school, 'Added school to outreach')
    return { id: school.id }
  }
  if (endpoint === '/api/email-preview' && method === 'POST')
    return clone({
      preview_token: 'demo-review',
      items: schools
        .filter((school) => body.school_ids.includes(school.id))
        .flatMap((school) =>
          (body.send_to_all_emails ? school.all_emails : [school.email]).map(
            (address) => ({
              school_id: school.id,
              school_name: school.school_name,
              to_email: address,
              subject: "Let's Connect! PSA Programs",
              attachments: ['PSA After School.pdf'],
              body:
                'Hello ' +
                school.contact_name +
                ',\n\nMy name is ' +
                user.name +
                ', and I’m with The Players Sports Academy. I’d love to explore bringing on-site sports programs to ' +
                school.school_name +
                '.\n\nWould you be open to a short introductory call?\n\nBest,\n' +
                user.name,
            }),
          ),
        ),
    })
  if (endpoint === '/api/profile') return clone(user)
  if (endpoint === '/api/my-schools') return clone(scoped(schools, params))
  if (endpoint === '/api/sent-emails') return clone(scoped(emails, params))
  if (endpoint === '/api/team-users') return clone(team)
  if (endpoint === '/api/team-stats')
    return clone(
      teamStats().map((member) => ({
        ...member,
        totalSchools: member.schools,
        totalEmails: member.sent,
      })),
    )
  if (endpoint === '/api/schools') return clone(directory)
  if (endpoint === '/api/map-schools') return clone(mapSchools)
  if (
    endpoint === '/api/mail-sync-status' ||
    endpoint === '/api/check-email-replies'
  )
    return {
      ready: user.mail_connected,
      pending_count: 0,
      messages_checked: 12,
      replies_found: 0,
      last_checked_at: ago(0),
      last_success_at: ago(0),
      error: null,
    }
  if (endpoint === '/api/invitations' && method === 'GET') return []
  if (endpoint === '/api/mail-credential-migration' && method === 'GET')
    return {
      configured: 3,
      encrypted: 3,
      legacy: 0,
      invalid: 0,
      legacy_reads_enabled: false,
    }
  if (endpoint.startsWith('/api/followup-preview/')) {
    const item = emails.find(
      (email) => email.id === Number(endpoint.split('/').at(-1)),
    )
    if (!item?.followup_eligible) throw new Error('This follow-up is not due.')
    return {
      email_id: item.id,
      school_name: item.school_name,
      to_email: item.school_email,
      subject: 'Follow-Up: PSA Programs',
      body:
        'Hello,\n\nI wanted to follow up about PSA sports programs at ' +
        item.school_name +
        '. Would a brief call be helpful?\n\nBest,\n' +
        user.name,
      sent_at: item.sent_at,
      due_at: item.followup_due_at,
    }
  }
  if (endpoint.startsWith('/api/email-reply-chain/')) {
    const item = emails.find(
      (email) => email.id === Number(endpoint.split('/').at(-1)),
    )
    return clone({
      school_name: item?.school_name,
      school_email: item?.school_email,
      reply_count: 1,
      last_reply_date: ago(1),
      replies: [
        {
          id: 1,
          reply_date: ago(1),
          reply_sender: 'School director',
          reply_content:
            'Thanks for reaching out. We would like to learn more about your spring programs.',
        },
      ],
    })
  }
  if (endpoint === '/api/find-schools')
    return clone({
      location: { lat: 38.89, lng: -77.22 },
      schools: directory
        .slice(-3)
        .map((item, index) => ({
          ...item,
          place_id: 'sample-' + item.id,
          lat: 38.84 + index * 0.04,
          lng: -77.28 + index * 0.03,
        })),
    })
  if (endpoint === '/api/route-plan')
    return { route: (body.schools || []).map((school) => school.place_id) }
  if (endpoint === '/api/refresh-map-schools')
    return { message: 'Demo map refreshed.' }
  const teamPatch = endpoint.match(/^\/api\/crm\/team\/(\d+)$/)
  if (teamPatch && method === 'PATCH' && user.admin) {
    const member = team.find((item) => item.id === Number(teamPatch[1]))
    if (member && typeof body.admin === 'boolean') member.admin = body.admin
    return clone(member)
  }
  throw new Error(
    'This action is disabled in the demo workspace. Email sending never reaches production.',
  )
}
