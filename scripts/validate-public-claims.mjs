import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_STATUSES = new Set(['verified', 'qualified', 'remove', 'gated']);
const REQUIRED_FIELDS = [
  'id',
  'surface',
  'category',
  'statement',
  'status',
  'evidence',
  'owner',
  'reviewedAt',
  'reviewBy',
];

export function validateClaims(claims, { release = false } = {}) {
  const errors = [];
  const ids = new Set();

  if (!Array.isArray(claims) || claims.length === 0) {
    return ['Claims ledger must be a non-empty array.'];
  }

  claims.forEach((claim, index) => {
    const label = claim?.id || `claim[${index}]`;
    if (!claim || typeof claim !== 'object' || Array.isArray(claim)) {
      errors.push(`${label}: must be an object.`);
      return;
    }

    if (JSON.stringify(Object.keys(claim).sort()) !== JSON.stringify([...REQUIRED_FIELDS].sort())) {
      errors.push(`${label}: fields must exactly match the public-claims contract.`);
    }
    for (const field of REQUIRED_FIELDS) {
      if (typeof claim[field] !== 'string' || claim[field].trim() === '') {
        errors.push(`${label}: ${field} must be a non-empty string.`);
      }
    }

    if (!/^PULSE-CLAIM-[0-9]{3}$/.test(claim.id || '')) {
      errors.push(`${label}: id must match PULSE-CLAIM-NNN.`);
    }
    if (ids.has(claim.id)) errors.push(`${label}: id must be unique.`);
    ids.add(claim.id);

    if (!ALLOWED_STATUSES.has(claim.status)) {
      errors.push(`${label}: unsupported status ${claim.status}.`);
    }
    if (release && ['remove', 'gated'].includes(claim.status)) {
      errors.push(`${label}: ${claim.status} claims cannot pass the release gate.`);
    }

    const reviewedAt = Date.parse(claim.reviewedAt);
    const reviewBy = Date.parse(claim.reviewBy);
    if (!Number.isFinite(reviewedAt)) errors.push(`${label}: reviewedAt must be ISO-8601.`);
    if (!Number.isFinite(reviewBy)) errors.push(`${label}: reviewBy must be ISO-8601.`);
    if (Number.isFinite(reviewedAt) && Number.isFinite(reviewBy) && reviewBy <= reviewedAt) {
      errors.push(`${label}: reviewBy must be after reviewedAt.`);
    }
  });

  return errors;
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const ledger = JSON.parse(
    await readFile(path.join(root, 'docs', 'product', 'public-claims.json'), 'utf8'),
  );
  const errors = validateClaims(ledger, { release: process.argv.includes('--release') });
  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(`Validated ${ledger.length} public claims.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
