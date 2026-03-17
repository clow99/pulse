import { randomBytes } from 'crypto';

export { generateSlug } from './slugify';

export function generateSiteToken(): string {
  return randomBytes(32).toString('hex');
}
