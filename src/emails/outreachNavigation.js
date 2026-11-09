// Keep existing URLs stable while presenting tasks rather than system features.
export const OUTREACH_VIEWS = [
  { id: 'home', group: 'home', label: 'Start here', description: 'Choose what you want to do. Nothing sends until you review and approve it.' },
  { id: 'compose', group: 'send', label: 'New email', description: 'Choose school contacts, pick a message and PDFs, then review every email before sending.' },
  { id: 'followups', group: 'send', label: 'Follow up now', description: 'Send a one-time reminder to contacts who are due for a follow-up. This does not start an automatic schedule.' },
  { id: 'sequences', group: 'send', label: 'Scheduled follow-ups', description: 'Set up reminders after an introduction. Choose whether to approve each reminder or authorize the displayed schedule.' },
  { id: 'inbox', group: 'review', label: 'School replies', description: 'Check for replies, read the conversation and write back to a school.' },
  { id: 'approvals', group: 'review', label: 'AI requests', description: 'Review emails your assistant prepared. Approving gives it permission to queue this request; approval alone does not send it here.' },
  { id: 'history', group: 'review', label: 'Sending progress', description: 'See what is waiting, sent, skipped or needs attention. Open a send to inspect individual recipients.' },
  { id: 'templates', group: 'library', label: 'Email templates', description: 'Saved messages your team can reuse. Admins create and update shared templates; reps choose them when writing an email.' },
  { id: 'attachments', group: 'library', label: 'PDF library', description: 'Upload flyers once and reuse them. Admins add PDFs here; reps select them while preparing an email.' },
  { id: 'add', group: 'contacts', label: 'Add or import contacts', description: 'Add a school or review a spreadsheet import. Adding contacts does not send them an email.' },
]

export const OUTREACH_SECTIONS = [
  { id: 'home', label: 'Start here', target: 'home' },
  { id: 'send', label: 'Send emails', target: 'compose' },
  { id: 'review', label: 'Replies & progress', target: 'inbox' },
  { id: 'library', label: 'Templates & PDFs', target: 'templates' },
  { id: 'contacts', label: 'Add contacts', target: 'add' },
]

export function outreachView(id, hasSelection = false) {
  return OUTREACH_VIEWS.find((view) => view.id === id) || OUTREACH_VIEWS.find((view) => view.id === (hasSelection ? 'compose' : 'home'))
}
