# Pulse Phase 0 truth-fix evidence — 2026-07-15

Linear issue: `AEL-31` (`PULSE-UI-001`)

Release decision: **not approved**. The candidate is review-ready, but it has not been merged or deployed. Cameron's explicit decision on this exact branch tip is still required immediately before merging `main`.

## Independent gates

| Gate | State | Evidence |
| --- | --- | --- |
| Source verified | Complete | Canonical repository `cam/pulse`; clean sibling worktree `C:\Users\clow9\Desktop\Notes\projects\pulse-phase0-truth`; branch `codex/phase0-pulse-truth`; candidate `fdbd9a99715bb162c992608b9e6083c81f962aea`. |
| Dependency ready | Blocked | The registered support-mail route could not be tested because the connected mailbox requires reauthentication. No message was sent, and no public contact CTA is present. |
| Documented | Complete | Claims ledger, validator, release/rollback runbook, and this dated evidence are committed with the candidate. |
| Implemented | Complete | Public source, hosted-plan, fixed-price, reusable-demo, and unverified-contact claims are removed; OCI labels and full-SHA image tags are implemented. |
| Live verified | Not started | Echo production was observed but intentionally not changed. |
| Accepted | Not started | Cameron approval and the shared twenty-four-hour observation window remain open. |

## Source and image attribution

- Repository: `https://git.cameronlow.com/cam/pulse`
- Candidate source SHA: `fdbd9a99715bb162c992608b9e6083c81f962aea`
- Candidate web tag: `pulse:phase0-fdbd9a99715bb162c992608b9e6083c81f962aea`
- Candidate web image: `sha256:e6dfecaeed23c8f448f01bcec72fb0ddc7a39a2119d1b8fe75057823f8feb05c`
- Candidate migration tag: `pulse-migrate:phase0-fdbd9a99715bb162c992608b9e6083c81f962aea`
- Candidate migration image: `sha256:d0b315301e075cb3f26bb3a382c4ad211848062f636ea6912a06baf15e819ac8`
- OCI source: `https://git.cameronlow.com/cam/pulse`
- OCI revision: `fdbd9a99715bb162c992608b9e6083c81f962aea`
- OCI created: `2026-07-15T00:44:02Z`

The Echo checkout observed at verification time was `cc91942ff5433f797a4f3d54dcba218befd6fb34`. The unchanged production container used mutable reference `10.0.0.2:5000/pulse:live`, image `sha256:e077cd91dfa582af667d363357aa158543950377aeacddb6d0360de897d42a92`, zero restarts, and had no usable OCI revision attribution. This image is the recorded functional rollback baseline, not proof of source parity.

## Verification

- `npm test`: 10 files and 44 tests passed.
- `npm run lint`: passed.
- `npm run claims:validate`: 4 claims passed; no `remove` or `gated` entries.
- `npx prisma validate`: passed.
- `npm run build`: passed; 67 static/dynamic routes enumerated.
- `docker compose config --no-interpolate --quiet`: passed.
- `git diff --check`: passed.
- Candidate web and migration Docker builds passed with immutable full-SHA tags and `source`, `revision`, and `created` labels.
- The migration candidate applied all six migrations to an isolated temporary PostgreSQL 16 preview database.
- The corrected container health contract uses IPv4 loopback. The exact candidate became healthy with zero restarts, and `GET /api/health/ready` returned `200`, `ready: true`, `database: ok`, `migrations: ok`, release `fdbd9a99715bb162c992608b9e6083c81f962aea`, and schema `20260713010000_project_intelligence_v1`.
- Browser checks covered `/`, `/pricing`, and `/demo`. Removed source, fixed-price, and reusable-credential markers were absent. Private-preview language was present. `/demo` emitted `noindex, nofollow, nocache`.
- Browser console: zero errors and zero warnings. Observed first-party navigation and session requests returned successful responses; no failed first-party request was observed.

## Identity screenshots

- `docs/portfolio/evidence/2026-07-14/pulse-home-phase0-1440.png` in the central portfolio evidence set — SHA-256 `5C53ACCAAA0D5B33726185147E8627887EC99588BBC300523F2CC546DBBA13CA`.
- `docs/portfolio/evidence/2026-07-14/pulse-home-phase0-390.png` in the central portfolio evidence set — SHA-256 `9462AB978B0A04CDC0F29FACDC7E8441C73CAB8F2FB0F3827EEC3BF3CCB87E96`.

Both captures preserve Pulse's near-black background, cyan accent, typography, product terminology, and navigation hierarchy.

## Support dependency

An outside-in test was attempted against the registered portfolio support route with unique test ID `PULSE-PHASE0-20260715T0027Z`. The connected mailbox returned an OAuth reauthentication requirement (`oauth_token_invalid_grant`); no test message was sent. Message-level retries were stopped. Reauthenticate the mailbox, send a new uniquely identified outside-in test, confirm receipt and reply ownership, and record only non-secret evidence before adding any public preview-request CTA.

Accounts required for the remaining release are Gitea review access, Echo deployment access, the reauthenticated registered support mailbox, and Cameron's explicit release decision. Provider identifiers and credentials remain in protected records only.

## Prohibited scope and rollback

Do not merge or deploy without Cameron's immediate approval of the exact candidate and evidence. Do not publish source, launch billing, expose reusable credentials, add a contact route before outside-in delivery succeeds, or include unrelated architecture.

If a later production promotion fails, restore the recorded functional image only behind truth-safe neutral copy. Do not restore public source links, fixed prices, public registration, reusable demo credentials, or an unverified contact CTA. The production deployment time for this candidate is intentionally blank because no production change occurred.
