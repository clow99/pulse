# Pulse Phase 0 truth-fix evidence — 2026-07-18

Linear issue: `AEL-31` (`PULSE-UI-001`)

Release decision: **not approved**. The reconciled candidate is validated in an isolated preview, but it has not been pushed, merged, or deployed. Production was observed read-only and remains unchanged by this work.

## Gate state

| Gate | State | Evidence |
| --- | --- | --- |
| Source verified | Complete | Canonical Gitea repository `cam/pulse`; local branch `codex/phase0-pulse-truth`; current `main` `d52647e0956dc4e7c4f74abe6c975ac8b6a7258d`; reconciled candidate `ee8093454de94dc0936c4caaa68b6f0c2fbdcbf2`. The remote review branch is still `19715284ef4adc89a178f84a7f22ff8692160310`. |
| Dependency ready | Complete with combined evidence | The verified connector identity was `cam@aellosoftware.com`. One uniquely identified Pulse test reached the registered company support route and received both `SENT` and `INBOX` labels. A previously received external message independently proves outside-Workspace ingress. Codex did not use a personal account and did not send a duplicate or a reply. |
| Documented | Complete | Claims ledger, validator, release/rollback runbook, this dated record, and browser artifacts are present. |
| Implemented | Complete | Public source, hosted-plan, fixed-price, reusable-demo, and unverified-contact claims are removed. OCI source/revision/created labels and immutable image tags are implemented. |
| Isolated preview verified | Complete | Exact candidate images, disposable migrations, readiness, desktop/mobile browser views, page copy, robots metadata, console, and first-party requests passed. |
| Production candidate verified | Not started | The candidate has not been promoted. Current production was inspected read-only and still exposes the old fixed-price and reusable-demo claims. |
| Accepted | Not started | Cameron has not approved release. The post-deployment outside-in checks and twenty-four-hour observation window have not started. |

## Source reconciliation

The earlier application candidate `fdbd9a99715bb162c992608b9e6083c81f962aea` had diverged from current `main`. The branch was reconciled locally with `main` and the five conflicts were resolved by preserving the current landing redesign and deployment workflow while retaining the truth contract in:

- `.gitea/workflows/build-deploy.yml`
- `src/app/demo/page.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/pricing/page.tsx`

The resulting exact application candidate is `ee8093454de94dc0936c4caaa68b6f0c2fbdcbf2`. It exists only in the local review branch at the time of this record. No Gitea or GitHub publication occurred.

## Mail-route evidence

- Connector identity: `cam@aellosoftware.com`
- Registered route: `support@aellosoftware.com`
- Unique test ID: `PULSE-PHASE0-20260718T025839Z`
- Observed at: `2026-07-17T19:58:48-07:00`
- Final observed labels: `UNREAD`, `SENT`, `INBOX`
- Test count in this run: one

The current Pulse-specific message was sent from the verified company mailbox to the company support route. It proves current route acceptance and Inbox placement, but it is not by itself an outside-Workspace test. Outside-Workspace ingress is evidenced by the previously received external support-route message recorded under AEL-15; that evidence is older and not Pulse-specific. No personal account was accessed or used during this work.

## Build and runtime attribution

- Repository: `https://git.cameronlow.com/cam/pulse`
- Candidate source SHA: `ee8093454de94dc0936c4caaa68b6f0c2fbdcbf2`
- Candidate web tag: `pulse:phase0-ee8093454de94dc0936c4caaa68b6f0c2fbdcbf2`
- Candidate web image: `sha256:96e957cf277fd8b5377eef48c2b8152cde08930e1d705b3e185f3a7a4a64784a`
- Candidate migration tag: `pulse-migrate:phase0-ee8093454de94dc0936c4caaa68b6f0c2fbdcbf2`
- Candidate migration image: `sha256:3520733a48e201f97dc1d3a1d18427560edaacc008fca66e60785b988dc27758`
- OCI source: `https://git.cameronlow.com/cam/pulse`
- OCI revision: `ee8093454de94dc0936c4caaa68b6f0c2fbdcbf2`
- OCI created: `2026-07-18T03:20:22Z`

Both images carried all three expected OCI labels. The migration image applied all six migrations to a disposable PostgreSQL 16 database. The exact web image became healthy with zero restarts, and `GET /api/health/ready` returned `200`, `ready: true`, database and migrations `ok`, release `ee8093454de94dc0936c4caaa68b6f0c2fbdcbf2`, and schema `20260713010000_project_intelligence_v1`.

## Source and browser verification

- Public-claims validator: 4 claims passed.
- Prisma: schema valid and client generated.
- Tests: 11 files and 51 tests passed.
- ESLint: passed.
- Production build: passed; 69 routes enumerated.
- Compose configuration: `docker compose config --no-interpolate --quiet` passed.
- Dependency audit: exited zero at the high threshold; two moderate PostCSS/Next.js advisories remain. The available forced remediation would be a breaking downgrade to Next.js 9.3.3 and was not applied.
- Browser pages: `/`, `/pricing`, and `/demo` each returned `200` from the exact candidate.
- Prohibited markers: no fixed prices, public registration, reusable demo, or public support CTA was present in rendered HTML.
- Robots contract: `/demo` emitted `<meta name="robots" content="noindex, nofollow, nocache"/>`.
- Responsive layout: the 1440px home, pricing, and demo views and the 390px home view rendered without visible clipping or horizontal overflow.
- Browser requests: every observed first-party route request returned `200`.
- Browser console: zero errors. One non-blocking warning remained for a preloaded Next.js CSS chunk that was not used shortly after load.

## Browser artifacts

| Artifact | SHA-256 |
| --- | --- |
| `artifacts/2026-07-18/pulse-home-1440.png` | `90A1FFA97416D23744FE5E0138A17C1FEDF295225BB59544D8C8B47BAC419A43` |
| `artifacts/2026-07-18/pulse-pricing-1440.png` | `5376473DE60A16E0B9D9457E924A49999B195BF9542B57074602D1DCB46C48EB` |
| `artifacts/2026-07-18/pulse-demo-1440.png` | `1545B20A8DE0F5C4885B904286ACCB37198AA918310480E96C51E88E34309F3D` |
| `artifacts/2026-07-18/pulse-home-390.png` | `B1D3094EC597B49FD32B1A676227BEE1609DF8E8440313167911B5D9F4EBB50E` |

The captures preserve Pulse's near-black/cyan visual system and current redesign while making the private-preview, hosted-plan, demo, and support boundaries truthful.

## Current production observation

Echo production was inspected read-only after the candidate was built:

- Configured image: `10.0.0.2:5000/pulse:live`
- Running image ID: `sha256:0bd39b42105ee2fa6e8d02365c4d267e41de502f4760cf6d7a2b7f4baf7f46c6`
- Release reported by readiness: `d52647e0956dc4e7c4f74abe6c975ac8b6a7258d`
- Health: running and healthy, zero restarts, database and migrations `ok`
- Attribution: no OCI labels on the running image
- Public edge: HTTPS `200` with TLS, HSTS, and expected security headers
- Homepage markers still live: `Private product telemetry`, `Try the live demo`
- Pricing markers still live: `$19/mo`, `$49/mo`, `Start hosted`, `Start team plan`
- Demo still live: reusable product sandbox; no no-index response header was observed

Production therefore remains operational but does not yet satisfy AEL-31. This inspection did not change it.

## Remaining risks

- The candidate has not been built by Gitea Actions or exercised on Echo; production-specific routing, image-pull, and runtime behavior remain unverified.
- Production currently exposes the claims AEL-31 removes and its running image has no OCI attribution.
- The current Pulse-specific support test was company-internal. Outside-Workspace delivery evidence exists, but it is older and belongs to AEL-15 rather than this exact Pulse test.
- One non-blocking browser warning remains for an unused preloaded CSS chunk.
- Two moderate dependency advisories remain; the available automated forced fix is breaking and was not applied.
- The existing production image is operational but not a truth-safe rollback on its own.
- The local candidate is not yet on canonical Gitea, and the post-deployment twenty-four-hour observation window has not started.

## Exact release and rollback decision

Cameron's explicit approval must name this AEL-31 release before any remote mutation. Approval would authorize, in order: push only the review branch to canonical Gitea; merge the reviewed candidate into `main`; require Gitea Actions to build immutable web and migration images; verify their OCI revision against the resulting `main` SHA; capture the current Echo binding and database state; bind Echo to the immutable candidate image; then run readiness, public browser, and outside-in support checks.

The current production image is a functional fallback but contains the claims AEL-31 removes and has no source attribution. Rollback may use that image only behind truth-safe neutral copy; it must not restore fixed prices, public registration, reusable demo access, public source publication, or an unverified contact CTA. If truth-safe rollback cannot be guaranteed, hold the deployment and repair the candidate instead.

No public GitHub repository creation, visibility change, mirror, tag, release, or publication is part of this release. Gitea remains canonical. A future GitHub surface would require separate explicit approval and would be snapshot-only with no contribution intake.
