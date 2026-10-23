import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { registryClient, releaseToEcho } from '../../scripts/release-to-echo.mjs';

const oldSha = 'a'.repeat(40);
const newSha = 'b'.repeat(40);
const otherSha = 'c'.repeat(40);
const image = (revision: string) => ({ revision, digest: `sha256:${revision}`, schema: 'existing-schema', raw: revision, type: 'application/vnd.docker.distribution.manifest.v2+json' });
const healthy = (release: string) => ({ release, schema: 'existing-schema', ready: true, database: 'ok', migrations: 'ok' });

function fixture() {
  const state = { live: image(oldSha), writes: [] as string[], failedCandidate: false, smokeFailure: false, concurrent: false };
  const options = {
    sha: newSha,
    registry: {
      read: async (tag: string) => tag === 'live' ? state.live : image(newSha),
      promote: async (value: ReturnType<typeof image>) => { state.live = value; state.writes.push(value.revision); },
    },
    head: async () => newSha,
    checkSchema: async () => {},
    probe: async () => {
      if (state.live.revision === newSha && state.concurrent) { state.live = image(otherSha); return healthy(otherSha); }
      return { ...healthy(state.live.revision), ready: !(state.failedCandidate && state.live.revision === newSha) };
    },
    smoke: async () => { if (state.smokeFailure) throw new Error('Public asset failed'); },
    timeoutMs: 2, pollMs: 1, delay: async () => {}, log: () => {},
  };
  return { state, options };
}

describe('Echo automatic release gate', () => {
  it('promotes only the immutable build image and verifies its running revision', async () => {
    const { state, options } = fixture();
    expect(await releaseToEcho(options)).toMatchObject({ status: 'deployed', release: newSha });
    expect(state.writes).toEqual([newSha]);
  });

  it('skips a stale successful build when main has moved forward', async () => {
    const { state, options } = fixture();
    options.head = async () => otherSha;
    expect(await releaseToEcho(options)).toEqual({ status: 'superseded' });
    expect(state.writes).toEqual([]);
  });

  it('blocks schema-changing releases before modifying live', async () => {
    const { state, options } = fixture();
    options.checkSchema = async () => { throw new Error('Controlled migration required'); };
    await expect(releaseToEcho(options)).rejects.toThrow('Controlled migration required');
    expect(state.writes).toEqual([]);
  });

  it('restores and verifies the previous release if the candidate never becomes ready', async () => {
    const { state, options } = fixture();
    state.failedCandidate = true;
    await expect(releaseToEcho(options)).rejects.toThrow(`Echo rolled back to ${oldSha}`);
    expect(state.writes).toEqual([newSha, oldSha]);
  });

  it('rolls back a ready image whose public assets fail the smoke check', async () => {
    const { state, options } = fixture();
    state.smokeFailure = true;
    await expect(releaseToEcho(options)).rejects.toThrow(`Echo rolled back to ${oldSha}`);
    expect(state.writes).toEqual([newSha, oldSha]);
  });

  it('does not overwrite a newer promotion during rollback', async () => {
    const { state, options } = fixture();
    state.concurrent = true;
    await expect(releaseToEcho(options)).rejects.toThrow('rollback did not overwrite it');
    expect(state.live.revision).toBe(otherSha);
    expect(state.writes).toEqual([newSha]);
  });

  it('does not promote an image with incorrect source revision metadata', async () => {
    const { state, options } = fixture();
    options.registry.read = async (tag: string) => tag === 'live' ? state.live : image(otherSha);
    await expect(releaseToEcho(options)).rejects.toThrow('revision does not match');
    expect(state.writes).toEqual([]);
  });

  it('rejects registry bytes that do not match their advertised digest', async () => {
    const raw = JSON.stringify({ config: { digest: `sha256:${'d'.repeat(64)}` } });
    const response = async () => new Response(raw, { headers: { 'Docker-Content-Digest': `sha256:${'0'.repeat(64)}` } });
    await expect(registryClient('http://registry.invalid', response).read('live')).rejects.toThrow('digest mismatch');
  });

  it('reads canonical source and schema metadata after validating registry bytes', async () => {
    const raw = JSON.stringify({ config: { digest: `sha256:${'d'.repeat(64)}` }, mediaType: 'application/vnd.docker.distribution.manifest.v2+json' });
    const digest = `sha256:${createHash('sha256').update(raw).digest('hex')}`;
    const response = async (url: RequestInfo | URL) => String(url).includes('/manifests/')
      ? new Response(raw, { headers: { 'Docker-Content-Digest': digest } })
      : Response.json({ config: { Labels: { 'org.opencontainers.image.revision': newSha, 'org.opencontainers.image.source': 'https://git.cameronlow.com/cam/pulse' }, Env: ['PULSE_SCHEMA_VERSION=existing-schema'] } });
    expect(await registryClient('http://registry.invalid', response).read('live')).toMatchObject({ revision: newSha, schema: 'existing-schema', digest });
  });
});
