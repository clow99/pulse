import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const root = process.cwd();

describe('public claims', () => {
  it('passes the fail-closed release ledger', async () => {
    const { stdout } = await run(process.execPath, [
      path.join(root, 'scripts', 'validate-public-claims.mjs'),
      '--release',
    ]);
    expect(stdout).toContain('Validated 4 public claims.');
  });

  it('removes source, hosted-plan, fixed-price, and reusable-demo claims', async () => {
    const files = await Promise.all([
      readFile(path.join(root, 'src', 'app', 'page.tsx'), 'utf8'),
      readFile(path.join(root, 'src', 'app', 'pricing', 'page.tsx'), 'utf8'),
      readFile(path.join(root, 'src', 'app', 'demo', 'page.tsx'), 'utf8'),
      readFile(path.join(root, 'README.md'), 'utf8'),
      readFile(path.join(root, 'prisma', 'seed.ts'), 'utf8'),
    ]);
    const publicSurfaces = files.slice(0, 3).join('\n');
    const allReviewedFiles = files.join('\n');

    for (const unsupported of [
      'Open-source',
      'Open Source',
      'Source code',
      'View source',
      'Hosted plans ready',
      '$19/mo',
      '$49/mo',
      'Get Started Free',
      'Open Demo Login',
      'Demo credentials',
    ]) {
      expect(publicSurfaces).not.toContain(unsupported);
    }
    expect(allReviewedFiles).not.toContain('demo@pulse.dev');
    expect(allReviewedFiles).not.toContain('password123');
  });

  it('keeps the preview notice noindex and omits an unverified contact CTA', async () => {
    const preview = await readFile(path.join(root, 'src', 'app', 'demo', 'page.tsx'), 'utf8');
    expect(preview).toContain('index: false');
    expect(preview).toContain('follow: false');
    expect(preview).not.toMatch(/mailto:|Request Preview|Request Access/i);
  });
});
