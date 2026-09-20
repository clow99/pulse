# Public-site review — 19 September 2026

Operator: Cameron Low personally, Ontario, Canada. Pulse is a brand. No employees or payment collection. Canonical source and live baseline: `1efa9a178b640da2b4baec3f2bcfd1f28f12f789`. Echo web image pinned to `sha256:60b69e83026f4bfcf21f30fa150585eedb47f51f694f497f337a03e84e4946d8`. Original checkout preserved; isolated branch `codex/public-site-review-20260919`.

## Findings and corrections

- Public copy said no public signup, but `/register`, the credential registration handler and new Google-account creation were open in source. Live registration form was reachable. Default server-side gate now rejects registration before parsing personal information; new Google accounts also require explicit operator opt-in and verified email. Existing verified Google and credential accounts remain usable. No schema migration, account purge or broader availability change.
- Live `/self-analytics.js` contained an active first-party tracker. Root loading is removed and that URL returns a no-op, including for cached pages with the old configured token. Independent participating sites' `/t.js` remains functional and honors Do Not Track.
- Ingestion used to persist referrer URLs with query strings and fragments. New records strip credentials, query and fragment; historical records are not silently rewritten. Site owners still must avoid personal information in event properties, paths and campaign tags.
- Public HTML privacy, terms and accessibility documents identify the operator, distinguish independent installations, explain logs, cookies/session storage, Google identity, AI/report sharing, retention and deletion limits. Global links and contextual authentication/AI notices are included.
- `hello@cameronlow.com` passed independent forwarding test CL-0919-01; Cameron confirmed inbox receipt on 19 September. Used for rights/support/security requests. No unverified preview-request CTA is introduced.

## Data inventory and operational limits

| Area | Data and purpose | Retention / control |
| --- | --- | --- |
| Public website | Hostinger U.S. hosting; IP/request/browser/referrer logs for delivery/security | nginx daily rotation, 14 rotated files; separate incidents can persist |
| Contact | Cloudflare Email Routing to Google; address/message/attachments for correspondence | Operator handling; no automatic mailbox purge |
| Account | PostgreSQL name/email/image/memberships, bcrypt password hash or Google provider identity/tokens; JWT/security cookies | No universal account expiry; operator-assisted account closure |
| Analytics | Site/host/path, random session-storage visit ID (30-minute idle limit), campaign/referrer/device/language/country, optional events/revenue/web vitals | Site/org deletion cascades related data; no automatic analytics TTL found |
| Sharing | Share-token report access, public status pages, email/webhook report recipients | Revocation/optional expiry prevents future link access; sent copies remain |
| Monitoring and agents | Targets/checks/incidents, scopes and audit records | Owner controls; no universal retention deadline |
| AI | Conversation and selected site's last 30 days of aggregate context, top pages/referrers/events to configured OpenAI/Anthropic/Perplexity | Provider terms apply; no verified uniform provider erasure promise |
| Backups | Separate operational copies; historical backup file metadata observed | Universal expiry/restore deletion-reconciliation procedure unverified; do not promise contractual erasure deadlines |

## Verification

Claims ledger validator, lint and production build passed. Prisma client generated with unchanged schema. Unit suite: 56 passed, including closed registration/verified Google identity and referrer-minimization cases. Public browser suite: 10 passed at 1440 and 320 pixels, with axe WCAG checks, keyboard skip/focus/reflow, policy access, closed registration API response and no public analytics requests. Synthetic registration payload was sent only to the isolated local preview and rejected before persistence. No live customer account was created or deleted.

Dependency audit: zero after Next.js 16.3.5, React 19.2.8, Auth.js beta.32, Nodemailer 9.1.1, Vitest 4.1.11 and transitive patches. Prisma major version remains 6; explicit deepmerge/effect/esbuild overrides address advisories and were checked by generation/build/tests. Node build/runtime and CI advance from 20 to 24.18.1.

Reproduce public checks after `npm ci`, `npm run db:generate`, `npm run build`, then serve the isolated production build at `127.0.0.1:3428` and run `npm run test:public`. No production environment is required for the public checks.

## Release and remaining review

The existing Phase 0 runbook requires exact-tip approval before merging to deployment-triggering main. Keep source on the review branch until that gate is satisfied. Build web and migrator images, preserve the previous immutable runtime, then verify exact deployed revision, public copy, policies, closed registration and no-op analytics. Do not apply a schema migration as part of this change.

Before expanding hosted evaluation: establish a retention schedule, full account export/closure and restore-reconciliation procedure, and identify enabled AI/SMTP processors and contracts. Ontario counsel should review analytics consent/processor roles, cross-border terms and proposed customer agreements. Full authenticated workflows, Google-provider console settings, AI-provider live calls and screen-reader coverage remain unverified in this batch; website tests do not prove those journeys.
