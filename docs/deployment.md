# Automatic deployments to Echo

Routine pushes to `main` deploy Pulse through Gitea Actions and Echo's existing Watchtower. Pull requests and workflow dispatches run validation without promoting production. No CI SSH key, new service, or production credential export is needed.

## Release flow

1. Tests, release-claims validation, production dependency audit, lint and the Next.js build must pass.
2. Build web and migrator images carrying the full source SHA. Smoke-test the actual web image against the disposable CI database, including readiness, public assets and closed registration.
3. Publish immutable `pulse:sha-<full SHA>` and `pulse-migrate:sha-<full SHA>` images to `10.0.0.2:5000`.
4. The final release gate checks that the commit is still current `main`, verifies image digests and canonical revision metadata, and compares schema/migration history with the ready production release.
5. Promote the tested web manifest to `pulse:live`. Echo's Watchtower checks every 300 seconds and recreates only opted-in containers when their tracked image changes.
6. CI waits up to 11 minutes for public readiness to report the exact new SHA, database and migrations `ok`, then verifies the homepage, sign-in, SVG logo and share image. The release step succeeds only after these checks pass.

Pulse runs as `pulse` on Echo with `10.0.0.2:5000/pulse:live`, label `com.centurylinklabs.watchtower.enable=true`, binding `127.0.0.1:3042`, and network `pulsewebanalyticscom_default`. The existing runtime environment stays on Echo. Watchtower preserves runtime overrides while taking default release metadata from the new image. The database container is outside this app-update path.

The generic repository Compose file remains manual by default. It is not the authoritative production definition and must not be used to replace Echo's existing protected runtime settings.

## Rollback and concurrency

If the new release never becomes ready or its public smoke checks fail, the CI gate restores the previous web manifest to `live` and waits for Watchtower to roll it back. The Gitea run still fails, clearly reporting the rollback. If recovery cannot be verified, it reports that operator action is required. Both update and rollback can take a Watchtower polling interval.

A stale build skips promotion. Rollback compares the current live digest with the failed candidate and never overwrites a concurrent newer promotion. Immutable full-SHA web and migration tags remain available for a controlled manual rollback. Docker health checks alone do not perform rollback; the CI release gate provides it.

## Schema changes

Automatic application releases do not run production migrations. A changed Prisma schema, changed migration files, or a different expected schema version blocks promotion. Use a separately approved migration release, verify database compatibility, then promote its exact web image. CI migrations affect only its disposable test database.

## Bootstrap or repair

`deploy/echo/enable-auto-deploy.py --expected-release <current SHA>` opts the existing Echo container into Watchtower. First pull `10.0.0.2:5000/pulse:live` and verify it is the same image as the current healthy release. The helper validates host, container configuration and readiness, copies runtime settings only in memory, retains the previous container for rollback, and verifies the database container was not restarted. It changes only the app's image reference and Watchtower opt-in label. It never prints or writes credential values.

To pause automatic releases, opt Pulse out of Watchtower and pin its image through a controlled container replacement; do not stop the shared Watchtower service or change other apps.
