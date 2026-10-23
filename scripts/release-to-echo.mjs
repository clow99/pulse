import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const manifestTypes = 'application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json';
const validSha = (value) => /^[a-f0-9]{40}$/.test(value || '');

export function registryClient(origin, request = fetch) {
  const base = `${origin.replace(/\/$/, '')}/v2/pulse`;
  async function get(path) {
    const response = await request(`${base}${path}`, {
      headers: { Accept: manifestTypes, 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Registry GET ${path} failed: HTTP ${response.status}`);
    return response;
  }
  return {
    async read(tag) {
      const response = await get(`/manifests/${tag}`);
      const raw = await response.text();
      const digest = `sha256:${createHash('sha256').update(raw).digest('hex')}`;
      if (response.headers.get('Docker-Content-Digest') !== digest) throw new Error('Registry manifest digest mismatch');
      const manifest = JSON.parse(raw);
      if (!/^sha256:[a-f0-9]{64}$/.test(manifest.config?.digest || '')) throw new Error('Expected a single-platform image manifest');
      const config = await (await get(`/blobs/${manifest.config.digest}`)).json();
      const revision = config.config?.Labels?.['org.opencontainers.image.revision'];
      const source = config.config?.Labels?.['org.opencontainers.image.source'];
      const schema = config.config?.Env?.find((item) => item.startsWith('PULSE_SCHEMA_VERSION='))?.slice('PULSE_SCHEMA_VERSION='.length);
      if (!validSha(revision) || source !== 'https://git.cameronlow.com/cam/pulse' || !schema) {
        throw new Error('Image is missing the canonical Pulse source, revision, or schema metadata');
      }
      return { raw, digest, revision, schema, type: manifest.mediaType || response.headers.get('Content-Type') };
    },
    async promote(image) {
      const response = await request(`${base}/manifests/live`, {
        method: 'PUT', headers: { 'Content-Type': image.type }, body: image.raw,
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`Live promotion failed: HTTP ${response.status}`);
    },
  };
}

export async function waitForRelease(revision, { probe, delay, timeoutMs, pollMs }) {
  const attempts = Math.max(1, Math.ceil(timeoutMs / pollMs));
  const deadline = Date.now() + timeoutMs;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const health = await probe();
      if (health.ready === true && health.release === revision && health.database === 'ok' && health.migrations === 'ok') return health;
    } catch { /* The single app container may briefly be restarting. */ }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    if (attempt + 1 < attempts) await delay(Math.min(pollMs, remaining));
  }
  throw new Error(`Echo did not become ready on release ${revision}`);
}

export async function releaseToEcho({
  sha, registry, head, checkSchema, probe, smoke, log = console.log,
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 660_000, pollMs = 10_000,
}) {
  if (!validSha(sha)) throw new Error('A full release SHA is required');
  if (await head() !== sha) {
    log('Skipped promotion: a newer main commit exists.');
    return { status: 'superseded' };
  }
  const candidate = await registry.read(`sha-${sha}`);
  if (candidate.revision !== sha) throw new Error('Candidate image revision does not match this build');
  const previous = await registry.read('live');
  const options = { probe, delay, timeoutMs, pollMs };
  const baseline = await waitForRelease(previous.revision, options);
  if (baseline.schema !== candidate.schema) throw new Error('Production schema differs; deploy migrations explicitly before automatic promotion');
  await checkSchema(baseline.release, sha);
  if (candidate.digest === previous.digest) {
    await smoke();
    return { status: 'already-deployed', release: sha, digest: candidate.digest };
  }
  if (await head() !== sha) return { status: 'superseded' };
  if ((await registry.read('live')).digest !== previous.digest) throw new Error('Live changed during preflight; retry after the in-flight release completes');
  // A timed-out PUT may still have committed, so recovery checks the current digest.
  try {
    await registry.promote(candidate);
    if ((await registry.read('live')).digest !== candidate.digest) throw new Error('Published live digest differs from the tested candidate');
    log(`Promoted ${sha}; waiting for Echo's Watchtower rollout.`);
    await waitForRelease(sha, options);
    await smoke();
    log(`Echo verified on ${sha} (${candidate.digest}).`);
    return { status: 'deployed', release: sha, digest: candidate.digest };
  } catch (error) {
    if ((await registry.read('live')).digest !== candidate.digest) {
      throw new Error('Release failed; live changed concurrently, so rollback did not overwrite it', { cause: error });
    }
    await registry.promote(previous);
    log(`Rollout failed. Restored live to ${previous.revision}; waiting for recovery.`);
    try {
      await waitForRelease(previous.revision, options);
      log(`Rollback verified on ${previous.revision}.`);
    } catch (recoveryError) {
      throw new Error('Rollback image published, but Echo recovery was not verified; operator action is required', { cause: recoveryError });
    }
    throw new Error(`Rollout failed; Echo rolled back to ${previous.revision}`, { cause: error });
  }
}

export function checkSchemaHistory(from, to) {
  if (!validSha(from) || !validSha(to)) throw new Error('Invalid schema comparison revisions');
  try {
    execFileSync('git', ['diff', '--quiet', from, to, '--', 'prisma/schema.prisma', 'prisma/migrations'], { stdio: 'pipe' });
  } catch (error) {
    if (error.status === 1) throw new Error('Schema or migration files changed since production; a controlled migration release is required');
    throw new Error('Could not compare production schema history; promotion was not attempted');
  }
}

async function main() {
  const production = (process.env.PULSE_PRODUCTION_URL || 'https://pulsewebanalytics.com').replace(/\/$/, '');
  const request = (path) => fetch(`${production}${path}${path.includes('?') ? '&' : '?'}release-check=${Date.now()}`, {
    headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10_000),
  });
  const result = await releaseToEcho({
    sha: process.env.GITHUB_SHA,
    registry: registryClient(process.env.PULSE_REGISTRY_ORIGIN || 'http://10.0.0.2:5000'),
    head: () => {
      const value = execFileSync('git', ['ls-remote', 'origin', 'refs/heads/main'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim().split(/\s/)[0];
      if (!validSha(value)) throw new Error('Could not establish current main');
      return value;
    },
    checkSchema: checkSchemaHistory,
    probe: async () => {
      const response = await request('/api/health/ready');
      if (!response.ok) throw new Error('Production is not ready');
      return response.json();
    },
    smoke: async () => {
      for (const [path, contentType] of [['/', 'text/html'], ['/login', 'text/html'], ['/logo.svg', 'image/svg+xml'], ['/opengraph-image', 'image/png']]) {
        const response = await request(path);
        if (!response.ok || !response.headers.get('content-type')?.startsWith(contentType)) throw new Error(`Public smoke check failed: ${path}`);
        await response.arrayBuffer();
      }
    },
  });
  console.log(JSON.stringify(result));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
