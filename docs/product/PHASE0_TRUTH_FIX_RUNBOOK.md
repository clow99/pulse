# Pulse Phase 0 truth-fix runbook

Linear issue: `AEL-31`

Canonical repository: `cam/pulse`

Implementation branch: `codex/phase0-pulse-truth`

Production host: Echo

Public route: `https://pulsewebanalytics.com/`

## Scope boundary

This tranche corrects public source, plan, demo, credential, and support claims while preserving Pulse's near-black and cyan identity. It does not launch billing, publish source, redesign analytics, change production credentials, migrate data, or merge unreviewed architecture.

The claims ledger is `docs/product/public-claims.json`. Run `npm run claims:validate`; release validation fails while any entry is `remove` or `gated`.

## Support contact gate

Do not publish a preview-request email address or contact call to action until the registered support route has passed an outside-in message test from outside the receiving system. Evidence must include a unique test ID, send time, received time, final mailbox, and reply-path owner without copying provider identifiers or credentials into the repository.

If the mail connector or provider requires reauthentication, record the blocker and keep the public CTA absent. Connector success, a configured alias, or a provider dashboard alone is not delivery evidence.

## Pre-merge verification

1. Use a clean sibling worktree from current `main`.
2. Run the claims validator, prohibited-copy and credential tests, full repository tests, lint, Prisma validation, and production build.
3. Build the web and migration images with full-SHA immutable tags and OCI `source`, `revision`, and `created` labels.
4. Run the web candidate on a preview-only loopback port with non-production test configuration.
5. Verify `/`, `/pricing`, and `/demo` at 390px and 1440px, including the noindex preview metadata, console, first-party requests, intended Pulse copy, and absence of removed claims.
6. Record the previous production image ID and prepare truth-safe fallback content. Never restore public source links, fixed prices, or reusable credentials during rollback.

## Approval and promotion

Merging `main` publishes the production image. Immediately before merge, Cameron must explicitly approve the exact branch tip and evidence set. A passing build, a pushed branch, or an agent recommendation is not approval.

After approval, merge the reviewed commit, require the Gitea Actions release to push both immutable and compatibility tags, and bind the Echo container to the full-SHA image. Then verify loopback readiness, running OCI revision, restart count, public DNS/TLS, exact public copy, noindex demo response, desktop/mobile screenshots, console/network behavior, and support contact only if mail delivery has passed.

## Rollback

Retain the previous functional image by immutable ID. If the candidate fails, use a corrected prior application image or neutral branded maintenance content that contains no public-source, hosted-plan, fixed-price, credential, or unverified contact claim. Do not roll misleading content back into public view.

Record source SHA, web and migration image IDs, previous image, test output, screenshots, deployment time, rollback reference, mail evidence, and Cameron's decision in dated evidence. Keep `accepted` false until the shared twenty-four-hour observation window also passes.
