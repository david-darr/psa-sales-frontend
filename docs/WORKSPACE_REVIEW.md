# PSA workspace review

## Latest local checkpoint: agent approval, 2026-11-05

Item 6 adds optional import/outreach-read/preparation/approved-send permissions under Settings > AI & integrations. Existing keys gain no permissions. Outreach > Agent approvals shows sender-owned frozen requests with exact recipients, messages/PDFs, expiry, refresh, explicit acknowledgment/approval, revocation and recent audit. Approval does not send; the same scoped key must execute the specific approval through the common durable queue. No agent can approve itself or act as another mailbox.

Review: http://127.0.0.1:5173/emails?tab=approvals&preview=1&scenario=admin . The fictional request can be approved/revoked without sending; no actual API key is issued in preview. Backend: 312 tests plus PostgreSQL migration/security/concurrent execute/revoke/two-worker fake-SMTP checks. Six Node bridge tests, frontend lint/build and every demo contract pass. Lint retains two existing warnings. No rendered review, live connector/Gmail test, commit, push, production migration or deployment. See psa-contacts/docs/AGENT_BATCH_APPROVAL.md. Item 7 has not started.

## Latest local checkpoint: sequences, 2026-11-05

Item 5 on feature/contact-foundation adds Outreach > Sequences: admin versioned definitions with saved template PDFs, searched/paginated own introductions, explicit enrollment preview, default review mode, separately authorized automatic mode, step review and revocation. Eastern/DST/weekend windows apply; overdue steps do not catch up as a burst. Worker heartbeat/offline warnings appear here and in batch progress. All queued mail now needs the separate durable worker; no web-thread fallback remains. No actual worker/host was configured, and no production migration, commit, deployment or real mail occurred.

Review: http://127.0.0.1:5173/emails?tab=sequences&preview=1&scenario=admin . Demo scheduling stays fictional. Admin/employee sequence contracts and all earlier demo checks pass; lint/build pass with two existing lint warnings and the existing MapLibre chunk warning. No rendered layout review is claimed. The paired psa-contacts/docs/DURABLE_SEQUENCES.md is the current reference for rollout dependencies and 299-test backend verification. Older sections below are historical.

The new workspace is local on `design/psa-sales-platform`. Its backend changes and database migrations live in the sibling `psa-due-followups` checkout on `feature/psa-sales-platform`.

Run `npm run dev` and open `http://localhost:5173/?preview=1&scenario=admin` for a fictional team workspace. Use `scenario=employee` or `scenario=new` to check employee and first-use states. Demo edits reset on refresh. Sending is disabled. Regular development requests use the local Flask proxy, rather than production, unless `VITE_API_BASE_URL` is set explicitly.

The overview, searchable school records, bulk updates, pipeline, tasks, school activity, focused outreach views, discovery saving, persistent map, and settings are implemented against backend routes. The demo is an isolated exercise of those views; it is not evidence of a production migration or a real mailbox check.

The latest pass restyles the app in a dark theme and adds an Accounts page (schools grouped by sales rep, active and former clients), a rep-colored territory map, a rebuilt Find schools page, a rebuilt Outreach flow, and an admin toggle on the Team page. Two new migrations, `20261029_accounts_portfolio.sql` and `20261029_outreach_batches.sql`, are not applied.

The batch screen also shows an Unconfirmed count for emails whose delivery could not be confirmed, with a button to send them again after checking Sent mail, and the recipient list marks schools that are already sending as "Already sending".

Build checks: `npm run lint`, `npm run build`, `node scripts/check-demo.mjs`, and `node scripts/check-demo.mjs --admin`.

See `psa-due-followups/docs/SALES_WORKSPACE_RELEASE.md` for migrations, release order, the independent mailbox command, verification, and remaining operational limits. No draft changes have been committed or deployed. A rendered browser check is still needed because the computer tool had no connected browser during implementation.


## Contact outreach draft, 2026-11-05

Item 4 is local on feature/contact-foundation, paired with psa-contacts. Compose now selects contact audience/campaign, resolves shared-school context, previews every matching mailbox and requires approval. Self-tests use the signed-in mailbox only; replies and retries have explicit review. School contacts can report stop requests/complaints. Batches expose pause reasons, remaining messages and prior uncertain attempts. Admins can create a distinct campaign with a recorded purpose/cap. The old automatic sender is paused in this draft's review mode pending the next configurable-sequence worker; current production is unchanged. Existing admin template create/upload, shared PDF catalog, template-default PDFs and app-wide custom upload buttons remain.

Review in an ordinary browser: http://127.0.0.1:5173/emails?preview=1&scenario=admin . Demo sends remain fictional with fetch blocked in contract tests. No rendered browser review is claimed. Lint/build and all employee/admin, contact, ownership, template/catalog, commission and new contact-outreach demo checks pass. No commits/pushes/deployments. See the paired backend docs/CONTACT_OUTREACH.md for release/migration requirements and feedback limits.


## Outreach usability pass, local draft (2026-11-08)

Replaced the flat nine-button outreach navigation with a Start here guide and task groups: Send emails, Replies & progress, Templates & PDFs, and Add contacts. Each screen explains its purpose. Existing tab URLs and school-selection entry links still resolve. Welcome shortcuts point to real controls; admin and rep library guidance reflects their permissions. Follow-up settings use readable reminder language and AM/PM hour choices without changing schedule values. Approval screens explain approval versus queueing, map blocking reasons to readable copy, and confirm permanent stopping. Navigation moves keyboard focus to the new screen heading.

PSA Command source has the corresponding Start here guide, grouped review/send tools, readable states, results summaries and contextual explanations. Manual API/Taskbar settings are secondary. The source-only tab distribution is updated in the backend integrations folder; activation still requires tab fingerprint approval/restart, and campaigns remain disabled pending rollout. No backend sending, authorization, quota or recipient logic changed in this usability pass.

Build/lint, admin/employee approval demos, templates, PDF catalog and follow-up demos pass; lint retains two existing warnings. Twelve native broker tests pass against the refreshed tab archive. Website guide-to-PDF navigation and the cancel/keep request confirmation were exercised through the contained browser with fictional data. Native renderer was reviewed in an isolated mock-API host, including a 390px child viewport; this is not signed-in acceptance inside the actual Kairos app. Website phone viewport review remains pending. No production data, real mailbox, actual send, commit, push or deployment was changed in this pass.

### AI-neutral terminology (local draft)

Outreach and connection setup now refer to AI assistants, AI requests and generic private integration settings. Website source/demo copy no longer assumes Kairos. Provider-specific actions remain only in the separate PSA Command custom tab. Existing request URLs, delegation and approval rules are unchanged. No source deployment or real sends were performed.
