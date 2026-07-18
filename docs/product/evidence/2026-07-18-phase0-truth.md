# Pulse Phase 0 truth-fix evidence — 2026-07-18

Linear issue: `AEL-31` (`PULSE-UI-001`)

Release decision: **approved and deployed**. Cameron separately approved the review-branch push, the exact `main` fast-forward, and the Echo deployment of the verified web and migration digests. Production verification passed. Final acceptance remains open until the shared twenty-four-hour observation window passes.

## Gate state

| Gate | State | Evidence |
| --- | --- | --- |
| Source verified | Complete | Canonical Gitea repository `cam/pulse`; local and remote `main` and review branch at release revision `1efa9a178b640da2b4baec3f2bcfd1f28f12f789`; reconciled application candidate `ee8093454de94dc0936c4caaa68b6f0c2fbdcbf2`. |
| Dependency ready | Complete with combined evidence | The verified connector identity was `cam@aellosoftware.com`. One uniquely identified Pulse test reached the registered company support route and received both `SENT` and `INBOX` labels. A previously received external message independently proves outside-Workspace ingress. Codex did not use a personal account and did not send a duplicate or a reply. |
| Documented | Complete | Claims ledger, validator, release/rollback runbook, this dated record, and browser artifacts are present. |
| Implemented | Complete | Public source, hosted-plan, fixed-price, reusable-demo, and unverified-contact claims are removed. OCI source/revision/created labels and immutable image tags are implemented. |
| Isolated preview verified | Complete | Exact candidate images, disposable migrations, readiness, desktop/mobile browser views, page copy, robots metadata, console, and first-party requests passed. |
| Production candidate verified | Complete | Echo is pinned to the exact web manifest digest for revision `1efa9a1`; migrator, readiness, attribution, restart count, public HTTP/TLS, desktop/mobile browser, console/network, copy, robots, and support-route checks passed. |
| Accepted | Pending observation | Cameron approved and the release is live. The twenty-four-hour observation window started with the cutover at `2026-07-18T15:11:10Z`; AEL-31 must not be marked Done before it passes. |

## Source reconciliation

The earlier application candidate `fdbd9a99715bb162c992608b9e6083c81f962aea` had diverged from current `main`. The branch was reconciled locally with `main` and the five conflicts were resolved by preserving the current landing redesign and deployment workflow while retaining the truth contract in:

- `.gitea/workflows/build-deploy.yml`
- `src/app/demo/page.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/pricing/page.tsx`

The resulting exact application candidate was `ee8093454de94dc0936c4caaa68b6f0c2fbdcbf2`. The complete evidence tip `1efa9a178b640da2b4baec3f2bcfd1f28f12f789` was pushed to the canonical Gitea review branch and fast-forwarded to `main` after separate approvals. No GitHub publication occurred.

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

## Gitea release images

- Release revision: `1efa9a178b640da2b4baec3f2bcfd1f28f12f789`
- Immutable web tag: `pulse:sha-1efa9a178b640da2b4baec3f2bcfd1f28f12f789`
- Web manifest digest: `sha256:60b69e83026f4bfcf21f30fa150585eedb47f51f694f497f337a03e84e4946d8`
- Immutable migration tag: `pulse-migrate:sha-1efa9a178b640da2b4baec3f2bcfd1f28f12f789`
- Migration manifest digest: `sha256:c5ca4f43aed21c86de452ad887ab042badc018164b87e09771208ce691c8c4d9`
- OCI source: `https://git.cameronlow.com/cam/pulse`
- OCI revision: `1efa9a178b640da2b4baec3f2bcfd1f28f12f789`
- OCI created: `2026-07-18T14:46:31Z`

Atlas registry verification showed that each immutable tag and its corresponding compatibility `live` tag resolved to the same manifest. Echo pulled both exact digests and independently verified their local image IDs and OCI labels before promotion.

## Source and browser verification

- Public-claims validator: 4 claims passed.
- Prisma: schema valid and client generated.
- Tests: 11 files and 51 tests passed.
- ESLint: passed.
- Production build: passed; 69 routes enumerated.
- Compose configuration: `docker compose config --no-interpolate --quiet` passed.
- Dependency audit: exited zero at the high threshold; two moderate PostCSS/Next.js advisories remain. The available forced remediation would be a breaking downgrade to Next.js 9.3.3 and was not applied.
- Browser pages: `/`, `/pricing`, and `/demo` each returned `200` from the isolated candidate and the deployed public release.
- Prohibited markers: no fixed prices, public registration, reusable demo, or public support CTA was present in rendered HTML.
- Robots contract: `/demo` emitted `<meta name="robots" content="noindex, nofollow, nocache"/>`.
- Responsive layout: the 1440px home, pricing, and demo views and the 390px home view rendered without visible clipping or horizontal overflow.
- Browser requests: every observed first-party route request returned `200`.
- Browser console: zero errors. The live home page emitted two non-blocking preload warnings, one for an initially unused responsive overview image and one for an initially unused Next.js CSS chunk.

## Browser artifacts

| Artifact | SHA-256 |
| --- | --- |
| `artifacts/2026-07-18/pulse-home-1440.png` | `90A1FFA97416D23744FE5E0138A17C1FEDF295225BB59544D8C8B47BAC419A43` |
| `artifacts/2026-07-18/pulse-pricing-1440.png` | `5376473DE60A16E0B9D9457E924A49999B195BF9542B57074602D1DCB46C48EB` |
| `artifacts/2026-07-18/pulse-demo-1440.png` | `1545B20A8DE0F5C4885B904286ACCB37198AA918310480E96C51E88E34309F3D` |
| `artifacts/2026-07-18/pulse-home-390.png` | `B1D3094EC597B49FD32B1A676227BEE1609DF8E8440313167911B5D9F4EBB50E` |

The captures preserve Pulse's near-black/cyan visual system and current redesign while making the private-preview, hosted-plan, demo, and support boundaries truthful. The post-deployment desktop and mobile captures were byte-identical to these isolated-preview artifacts, confirming visual parity at all four recorded SHA-256 values.

## Production promotion and verification

- Cutover start: `2026-07-18T15:11:10Z`
- Running container: `957624427c45727f96a1bf6a2a466f36cebbff8a014605ad1f6a7fbdbfbeb17b`
- Configured image: `10.0.0.2:5000/pulse@sha256:60b69e83026f4bfcf21f30fa150585eedb47f51f694f497f337a03e84e4946d8`
- Running image ID: `sha256:60b69e83026f4bfcf21f30fa150585eedb47f51f694f497f337a03e84e4946d8`
- Release reported by readiness: `1efa9a178b640da2b4baec3f2bcfd1f28f12f789`
- Health: running and healthy, zero restarts, database and migrations `ok`
- Schema: `20260713010000_project_intelligence_v1`
- Watchtower: explicitly disabled for Pulse
- Persistent Compose SHA-256: `d50e2f27cfdc896223e77729815020c135e1b50c3a3f2772abd4a436fcc5e27b`
- Pre-release Compose backup: `/var/compose/pulsewebanalytics.com/docker-compose.yaml.ael31-pre-1efa9a1-20260718T150845Z.bak`
- Backup SHA-256: `f9772e41ce16e11998033d2c9f5eae89bd0fe995297f17d257c32ccda3be1692`
- Previous image retained: `sha256:0bd39b42105ee2fa6e8d02365c4d267e41de502f4760cf6d7a2b7f4baf7f46c6`

The exact migration image found all six migrations and reported `No pending migrations to apply`. Only the Pulse `app` service was recreated; PostgreSQL remained healthy with zero restarts and retained volume `pulse-postgres-data`.

The first cutover wrapper stopped on a shell syntax error after updating the persistent image line but before Compose validation or container recreation. The existing `d52647e` container remained healthy and unchanged. The pinned configuration, backup hashes, and running image were reverified before the corrected fail-closed wrapper resumed and completed the cutover.

Outside-in verification resolved `pulsewebanalytics.com` to Echo at `85.209.95.8`. Home, pricing, and demo returned HTTPS `200`; HSTS and CSP were present; private-preview copy was live; demo emitted `noindex, nofollow, nocache`; and no fixed prices, public registration, reusable demo, or public support CTA was found. Browser checks covered the three 1440px routes and the 390px home page with no visible clipping or horizontal overflow. Every observed first-party route request returned `200`.

The delayed check at `2026-07-18T15:21:36Z`, roughly ten minutes after cutover, still reported the exact image healthy with zero restarts, readiness release `1efa9a1`, database and migrations `ok`, and all three public routes at HTTPS `200`.

## Remaining risks

- The current Pulse-specific support test was company-internal. Outside-Workspace delivery evidence exists, but it is older and belongs to AEL-15 rather than this exact Pulse test.
- Two non-blocking browser preload warnings remain.
- Two moderate dependency advisories remain; the available automated forced fix is breaking and was not applied.
- The retained previous image is operational but not a truth-safe rollback on its own because it contains the claims AEL-31 removes.
- The twenty-four-hour production observation window has not completed, so acceptance and AEL-31 Done remain blocked.

## Exact release and rollback decision

Cameron approved the review-branch push, `main` fast-forward, and exact Echo digest deployment as separate actions. The release completed in that order, and the image, readiness, public browser, and support-route evidence above passed.

The previous production image is retained as a functional fallback but contains the claims AEL-31 removes and has no source attribution. Rollback may use that image only behind truth-safe neutral copy; it must not restore fixed prices, public registration, reusable demo access, public source publication, or an unverified contact CTA. The fail-closed deployment path was configured to stop the candidate and restore only the Compose file on failure, leaving the public route unavailable rather than restoring misleading content.

No public GitHub repository creation, visibility change, mirror, tag, release, or publication is part of this release. Gitea remains canonical. A future GitHub surface would require separate explicit approval and would be snapshot-only with no contribution intake.
