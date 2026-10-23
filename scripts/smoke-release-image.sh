#!/usr/bin/env bash
set -euo pipefail

image="${1:?Expected image name}"
revision="${2:?Expected release SHA}"
candidate="pulse-ci-${GITHUB_RUN_ID:?}-${GITHUB_RUN_ATTEMPT:-1}"
network="$(docker inspect --format '{{range $name, $config := .NetworkSettings.Networks}}{{$name}}{{"\n"}}{{end}}' "${HOSTNAME:?}" | head -n 1)"
test -n "$network"
cleanup() { docker rm -f "$candidate" >/dev/null 2>&1 || true; }
trap cleanup EXIT
docker run --detach --name "$candidate" --network "$network" \
  --env DATABASE_URL --env NEXTAUTH_SECRET \
  --env NEXTAUTH_URL=http://localhost:3000 --env NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  --env PULSE_ALLOW_PUBLIC_REGISTRATION=false "$image" >/dev/null
docker exec -i "$candidate" node - "$revision" <<'NODE'
const revision = process.argv[2];
const origin = 'http://127.0.0.1:3000';
async function check() {
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    try {
      const response = await fetch(origin + '/api/health/ready', { signal: AbortSignal.timeout(3000) });
      const state = await response.json();
      if (response.ok && state.ready && state.release === revision && state.database === 'ok' && state.migrations === 'ok') { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error('Candidate image did not become ready on the expected revision');
  for (const [path, type] of [['/', 'text/html'], ['/login', 'text/html'], ['/logo.svg', 'image/svg+xml'], ['/opengraph-image', 'image/png']]) {
    const response = await fetch(origin + path, { signal: AbortSignal.timeout(10000) });
    if (!response.ok || !response.headers.get('content-type')?.startsWith(type)) throw new Error('Image smoke check failed: ' + path);
    await response.arrayBuffer();
  }
  const registration = await fetch(origin + '/register');
  const html = await registration.text();
  if (!registration.ok || !html.includes('Private preview') || /<input\b/.test(html)) throw new Error('Public registration must remain closed');
  console.log('Release image smoke checks passed for ' + revision);
}
check().catch((error) => { console.error(error.message); process.exitCode = 1; });
NODE
