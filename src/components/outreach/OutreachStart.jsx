const tasks = [
  ['compose', 'Send a new email', 'Choose your schools, message and PDFs. Review before sending.', 'Prepare an email'],
  ['inbox', 'Read school replies', 'See responses and continue a conversation.', 'Open replies'],
  ['approvals', 'Review AI work', 'Check a prepared email request before giving your assistant permission.', 'Review requests'],
  ['history', 'Check sending progress', 'Find sent emails, remaining recipients and anything that needs attention.', 'View progress'],
  ['templates', 'Manage team messages', 'Create reusable email templates and choose their default PDFs.', 'Open templates'],
  ['attachments', 'Add a flyer or PDF', 'Upload a file to the shared library so reps can pick it when writing.', 'Open PDF library'],
]

export default function OutreachStart({ onOpen, onAccount, mailConnected, admin }) {
  return <div className="ou-page">
    <section className="ou-guide" aria-labelledby="outreach-start-title">
      <div><p className="ou-label">Your next step</p><h2 id="outreach-start-title" tabIndex={-1}>What would you like to do?</h2><p>Write emails yourself or review work prepared by AI. Start with one school if this is your first time.</p></div>
      {!mailConnected && <div className="ou-callout tone-warning"><strong>Connect your mailbox before sending.</strong><span>You can still browse templates and add contacts.</span><button className="ou-btn ou-btn-solid" onClick={onAccount}>Connect my email</button></div>}
      <ol className="ou-get-started"><li><strong>1. Add contacts</strong><span>Choose existing schools or <button className="ou-link" onClick={() => onOpen('add')}>import a reviewed contact list</button>.</span></li><li><strong>2. Prepare an email</strong><span>Pick a template and any PDFs from the library.</span></li><li><strong>3. Review, then send</strong><span>Check recipients and personalized messages. Track results in Sending progress.</span></li></ol>
    </section>
    <div className="ou-task-grid">{tasks.map(([id, title, description, action]) => <section key={id} className="ou-card ou-card-body ou-task-card"><h3>{!admin && id === 'templates' ? 'Browse team messages' : !admin && id === 'attachments' ? 'Browse flyers and PDFs' : title}</h3><p>{!admin && id === 'templates' ? 'Find a saved message to use when preparing outreach.' : !admin && id === 'attachments' ? 'Find a shared file to attach to your emails.' : description}</p>{!admin && ['templates','attachments'].includes(id) && <p className="ou-muted">You can use the library. An admin manages shared content.</p>}<button type="button" className={`ou-btn ${id === 'compose' ? 'ou-btn-solid' : 'ou-btn-ghost'}`} onClick={() => onOpen(id)}>{action}</button></section>)}</div>
    <p className="ou-callout tone-neutral">Want an AI assistant to run a whole campaign? Your integration must support campaign review and approval. This website&apos;s AI requests screen reviews one-time email batches.</p>
    <details className="ou-card ou-card-body"><summary>What is the difference between a follow-up and a scheduled follow-up?</summary><p><strong>Follow up now</strong> prepares a one-time reminder that is due. <strong>Scheduled follow-ups</strong> sets future reminders after an introduction, with the approval rules you choose. A new email never starts those reminders by itself.</p><button className="ou-btn ou-btn-ghost" onClick={() => onOpen('sequences')}>View scheduled follow-ups</button></details>
  </div>
}
