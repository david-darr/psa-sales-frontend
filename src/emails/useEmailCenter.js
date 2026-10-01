import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { batchSchoolIds, canSendFollowup, countOutgoing, schoolType } from './constants'

/**
 * All data loading and mutations for the Email Center.
 *
 * Emails.jsx previously held 29 useState hooks in one 3,128-line component,
 * mixing server data, form drafts, modal visibility and transient status. This
 * owns the server data and the actions against it; the page keeps only the
 * draft/modal state that belongs to its own UI.
 */
export function useEmailCenter({ accessToken, user }) {
  const [schools, setSchools] = useState([])
  const [sentEmails, setSentEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)

  /** Status notices carry an explicit tone. */
  const notify = useCallback((tone, text) => {
    setStatus({ tone, text })
  }, [])

  const clearStatus = useCallback(() => setStatus(null), [])

  // Auto-dismiss, but reset the timer whenever a new notice replaces an old
  // one. The previous code scheduled a bare setTimeout per action, so
  // overlapping actions cleared each other's messages early.
  useEffect(() => {
    if (!status) return
    const timer = setTimeout(() => setStatus(null), 6000)
    return () => clearTimeout(timer)
  }, [status])

  /* ---------------- Loading ---------------- */

  const loadSchools = useCallback(async () => {
    try {
      const data = await api.get('/api/my-schools')
      setSchools(Array.isArray(data) ? data : [])
    } catch (err) {
      notify('danger', err.message || 'Could not load your schools.')
    }
  }, [notify])

  const loadSentEmails = useCallback(async () => {
    try {
      const data = await api.get('/api/sent-emails')
      setSentEmails(Array.isArray(data) ? data : [])
    } catch (err) {
      notify('danger', err.message || 'Could not load sent emails.')
    }
  }, [notify])

  const reload = useCallback(
    () => Promise.all([loadSchools(), loadSentEmails()]),
    [loadSchools, loadSentEmails],
  )

  useEffect(() => {
    if (accessToken) reload()
  }, [accessToken, reload])

  /* ---------------- Derived ---------------- */

  const schoolCounts = useMemo(
    () => ({
      all: schools.length,
      pending: schools.filter((s) => s.status !== 'contacted').length,
      contacted: schools.filter((s) => s.status === 'contacted').length,
    }),
    [schools],
  )

  const emailCounts = useMemo(
    () => ({
      all: sentEmails.length,
      pending: sentEmails.filter((e) => !e.responded && !e.followup_sent).length,
      followupEligible: sentEmails.filter((e) => canSendFollowup(e, user?.admin)).length,
      followup: sentEmails.filter((e) => !e.responded && e.followup_sent).length,
      responded: sentEmails.filter((e) => e.responded).length,
      urgent: sentEmails.filter(
        (e) => !e.responded && !e.followup_sent && (e.days_ago || 0) >= 14,
      ).length,
      due: sentEmails.filter(
        (e) =>
          !e.responded &&
          !e.followup_sent &&
          (e.days_ago || 0) >= 7 &&
          (e.days_ago || 0) < 14,
      ).length,
    }),
    [sentEmails, user?.admin],
  )

  const filterSchools = useCallback(
    (filter, sort) => {
      const filtered = schools.filter((school) => {
        if (filter === 'pending') return school.status !== 'contacted'
        if (filter === 'contacted') return school.status === 'contacted'
        return true
      })

      if (sort === 'default') return filtered
      if (sort === 'type') {
        return [...filtered].sort(
          (a, b) => schoolType(a.school_type).order - schoolType(b.school_type).order,
        )
      }
      // Named type first, everything else after, original order preserved
      // within each group.
      return [...filtered].sort((a, b) => {
        const aMatch = a.school_type === sort ? 0 : 1
        const bMatch = b.school_type === sort ? 0 : 1
        return aMatch - bMatch
      })
    },
    [schools],
  )

  const filterEmails = useCallback(
    (filter) =>
      sentEmails.filter((email) => {
        if (filter === 'pending') return !email.responded && !email.followup_sent
        if (filter === 'followup') return !email.responded && email.followup_sent
        if (filter === 'responded') return email.responded
        return true
      }),
    [sentEmails],
  )

  /* ---------------- Mutations ---------------- */

  const addSchool = useCallback(
    async (draft) => {
      const payload = {
        ...draft,
        additional_emails: draft.additional_emails.filter((e) => e.trim()),
      }
      try {
        await api.post('/api/add-school', payload)
        await loadSchools()
        notify('success', 'School added successfully.')
        return true
      } catch (err) {
        notify('danger', err.message || 'Failed to add school.')
        return false
      }
    },
    [loadSchools, notify],
  )

  const uploadCsv = useCallback(
    async (file) => {
      const formData = new FormData()
      formData.append('file', file)
      try {
        const data = await api.upload('/api/upload-schools-csv', formData)
        await loadSchools()
        // The old code gated success on `data.status === "success"`, but this
        // endpoint returns {"message": ..., "schools_added": ...} and has no
        // `status` key at all - so every successful import reported "Failed to
        // upload CSV" and left the panel open, even though the rows had been
        // written. Success is now the absence of an error response.
        notify(
          'success',
          `Added ${data.schools_added} school${data.schools_added === 1 ? '' : 's'}` +
            `${data.schools_skipped ? `, skipped ${data.schools_skipped} already present` : ''}.`,
        )
        return data
      } catch (err) {
        notify('danger', err.message || 'Failed to upload CSV.')
        return null
      }
    },
    [loadSchools, notify],
  )

  /** Delete many of one kind, reporting a single combined outcome. */
  const deleteMany = useCallback(
    async ({ ids, path, bodyKey, noun, after }) => {
      setLoading(true)
      let deleted = 0
      const failures = []

      for (const id of ids) {
        try {
          await api.del(path, { [bodyKey]: id })
          deleted++
        } catch (err) {
          // A dead token aborts the whole loop; the api client has already
          // triggered logout, so continuing would just repeat the failure.
          if (err.status === 401) {
            setLoading(false)
            return { deleted, failed: ids.length - deleted }
          }
          failures.push(err.message || 'Failed to delete')
        }
      }

      await after()
      setLoading(false)

      if (failures.length === 0) {
        notify('success', `${deleted} ${noun}${deleted === 1 ? '' : 's'} deleted.`)
      } else {
        notify(
          'warning',
          `${deleted} ${noun}${deleted === 1 ? '' : 's'} deleted, ${failures.length} failed.`,
        )
      }
      return { deleted, failed: failures.length }
    },
    [notify],
  )

  const deleteSchools = useCallback(
    (ids) =>
      deleteMany({
        ids,
        path: '/api/delete-school',
        bodyKey: 'school_id',
        noun: 'school',
        after: loadSchools,
      }),
    [deleteMany, loadSchools],
  )

  const deleteSentEmails = useCallback(
    (ids) =>
      deleteMany({
        ids,
        path: '/api/delete-sent-email',
        bodyKey: 'email_id',
        noun: 'email record',
        after: loadSentEmails,
      }),
    [deleteMany, loadSentEmails],
  )

  /**
   * Send the stock template to the selected schools, in batches, reporting
   * progress as it goes.
   */
  const sendTemplateEmails = useCallback(
    async ({ selectedIds, sendToAllEmails, subject = "Let's Connect! PSA Programs" }) => {
      setLoading(true)
      const batches = batchSchoolIds(schools, selectedIds, sendToAllEmails)
      let sent = 0
      const errors = []

      try {
        for (let i = 0; i < batches.length; i++) {
          notify('info', `Sending batch ${i + 1} of ${batches.length}...`)
          const data = await api.post('/api/send-email', {
            school_ids: batches[i],
            subject,
            send_to_all_emails: sendToAllEmails,
          })
          sent += data.sent_count || 0
          if (data.errors?.length) errors.push(...data.errors)
        }

        await reload()

        if (sent > 0) {
          notify(
            errors.length ? 'warning' : 'success',
            `Sent ${sent} email${sent === 1 ? '' : 's'}` +
              (errors.length ? `, ${errors.length} failed.` : '.'),
          )
        } else {
          notify('danger', 'Failed to send emails.')
        }
        return { sent, errors }
      } catch (err) {
        notify('danger', err.message || 'Error while sending emails.')
        return { sent, errors }
      } finally {
        setLoading(false)
      }
    },
    [schools, notify, reload],
  )

  /** Send a freeform email to one school, or in batches to many. */
  const sendCustomEmail = useCallback(
    async (draft) => {
      const isBulk = !draft.school_id && draft.school_ids.length > 0
      setLoading(true)

      try {
        if (!isBulk) {
          await api.post('/api/send-custom-email', {
            school_id: draft.school_id,
            to_email: draft.school_email,
            subject: draft.subject,
            message: draft.message,
            pdf_files: draft.pdf_files,
          })
          await reload()
          notify('success', 'Custom email sent.')
          return true
        }

        // Bulk goes one address per school, so batching by school count is
        // equivalent to batching by address count here.
        const batches = batchSchoolIds(schools, draft.school_ids, false)
        let sent = 0
        const errors = []

        for (let i = 0; i < batches.length; i++) {
          notify('info', `Sending batch ${i + 1} of ${batches.length}...`)
          const data = await api.post('/api/send-custom-email-bulk', {
            school_ids: batches[i],
            subject: draft.subject,
            message: draft.message,
            pdf_files: draft.pdf_files,
          })
          sent += data.sent_count || 0
          if (data.errors?.length) errors.push(...data.errors)
        }

        await reload()
        if (sent > 0) {
          notify(
            errors.length ? 'warning' : 'success',
            `Custom email sent to ${sent} school${sent === 1 ? '' : 's'}` +
              (errors.length ? `, ${errors.length} failed.` : '.'),
          )
          return true
        }
        notify('danger', 'Failed to send custom emails.')
        return false
      } catch (err) {
        notify('danger', err.message || 'Error while sending custom email.')
        return false
      } finally {
        setLoading(false)
      }
    },
    [schools, notify, reload],
  )

  const sendCustomReply = useCallback(
    async (draft) => {
      setLoading(true)
      try {
        await api.post('/api/send-custom-reply', {
          email_id: draft.email_id,
          to_email: draft.school_email,
          subject: draft.subject,
          message: draft.message,
        })
        await loadSentEmails()
        notify('success', 'Reply sent.')
        return true
      } catch (err) {
        notify('danger', err.message || 'Failed to send reply.')
        return false
      } finally {
        setLoading(false)
      }
    },
    [loadSentEmails, notify],
  )

  const sendMassFollowup = useCallback(async () => {
    const pending = sentEmails.filter((e) => canSendFollowup(e, user?.admin))
    if (pending.length === 0) {
      notify('info', 'No pending emails from your account to follow up on.')
      return
    }

    setLoading(true)
    let sent = 0
    const failures = []

    try {
      // Three at a time: each follow-up is its own SMTP login server-side, so
      // this paces the mailbox rather than the request.
      const chunkSize = 3
      for (let i = 0; i < pending.length; i += chunkSize) {
        const chunk = pending.slice(i, i + chunkSize)
        notify(
          'info',
          `Sending follow-ups ${i + 1}-${Math.min(i + chunkSize, pending.length)} of ${pending.length}...`,
        )

        const results = await Promise.all(
          chunk.map(async (email) => {
            try {
              await api.post('/api/send-followup', { email_id: email.id })
              return { ok: true }
            } catch (err) {
              if (err.status === 401) return { ok: false, expired: true }
              return { ok: false, school: email.school_name, error: err.message }
            }
          }),
        )

        if (results.some((r) => r.expired)) break

        results.forEach((r) => {
          if (r.ok) sent++
          else failures.push(`${r.school}: ${r.error}`)
        })
      }

      await loadSentEmails()

      if (sent > 0) {
        notify(
          failures.length ? 'warning' : 'success',
          `Sent ${sent} follow-up${sent === 1 ? '' : 's'}` +
            (failures.length ? `, ${failures.length} failed.` : '.'),
        )
      } else {
        notify('danger', 'No follow-ups were sent.')
      }
    } catch (err) {
      notify('danger', err.message || 'Error while sending follow-ups.')
    } finally {
      setLoading(false)
    }
  }, [sentEmails, user?.admin, loadSentEmails, notify])

  const checkReplies = useCallback(async () => {
    setLoading(true)
    notify('info', 'Checking for email replies...')
    try {
      const data = await api.post('/api/check-email-replies')
      await loadSentEmails()
      notify('success', data.status || 'Reply check complete.')
    } catch (err) {
      notify('danger', err.message || 'Failed to check for replies.')
    } finally {
      setLoading(false)
    }
  }, [loadSentEmails, notify])

  const loadReplyChain = useCallback(async (emailId) => {
    // Thrown errors are surfaced by the caller, which owns the modal state.
    return api.get(`/api/email-reply-chain/${emailId}`)
  }, [])

  const setResponded = useCallback(
    async (emailId, responded) => {
      try {
        await api.post('/api/mark-responded', { email_id: emailId, responded })
        await loadSentEmails()
        notify('success', responded ? 'Marked as responded.' : 'Marked as not responded.')
      } catch (err) {
        notify('danger', err.message || 'Could not update the email.')
      }
    },
    [loadSentEmails, notify],
  )

  return {
    // data
    schools,
    sentEmails,
    schoolCounts,
    emailCounts,
    isAdmin: Boolean(user?.admin),
    // ui state
    loading,
    status,
    notify,
    clearStatus,
    // selectors
    filterSchools,
    filterEmails,
    countOutgoing: (ids, all) => countOutgoing(schools, ids, all),
    // actions
    reload,
    addSchool,
    uploadCsv,
    deleteSchools,
    deleteSentEmails,
    sendTemplateEmails,
    sendCustomEmail,
    sendCustomReply,
    sendMassFollowup,
    checkReplies,
    loadReplyChain,
    setResponded,
  }
}

export default useEmailCenter
