# PSA workspace review

The new workspace is local on `design/psa-sales-platform`. Its backend changes and database migrations live in the sibling `psa-due-followups` checkout on `feature/psa-sales-platform`.

Run `npm run dev` and open `http://localhost:5173/?preview=1&scenario=admin` for a fictional team workspace. Use `scenario=employee` or `scenario=new` to check employee and first-use states. Demo edits reset on refresh. Sending is disabled. Regular development requests use the local Flask proxy, rather than production, unless `VITE_API_BASE_URL` is set explicitly.

The overview, searchable school records, bulk updates, pipeline, tasks, school activity, focused outreach views, discovery saving, persistent map, and settings are implemented against backend routes. The demo is an isolated exercise of those views; it is not evidence of a production migration or a real mailbox check.

The latest pass restyles the app in a dark theme and adds an Accounts page (schools grouped by sales rep, active and former clients), a rep-colored territory map, a rebuilt Find schools page, a rebuilt Outreach flow, and an admin toggle on the Team page. Two new migrations, `20261029_accounts_portfolio.sql` and `20261029_outreach_batches.sql`, are not applied.

Build checks: `npm run lint`, `npm run build`, `node scripts/check-demo.mjs`, and `node scripts/check-demo.mjs --admin`.

See `psa-due-followups/docs/SALES_WORKSPACE_RELEASE.md` for migrations, release order, the independent mailbox command, verification, and remaining operational limits. No draft changes have been committed or deployed. A rendered browser check is still needed because the computer tool had no connected browser during implementation.
