import { prisma } from './prisma';

export const EXPECTED_SCHEMA_VERSION =
  process.env.PULSE_SCHEMA_VERSION || '20260713010000_project_intelligence_v1';

export function releaseInfo() {
  return {
    release: process.env.PULSE_RELEASE_SHA || 'development',
    schema: EXPECTED_SCHEMA_VERSION,
  };
}

export async function readiness() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const migrations = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY finished_at DESC LIMIT 100'
    );
    const migrationReady = migrations.some((migration) => migration.migration_name === EXPECTED_SCHEMA_VERSION);
    return { ready: migrationReady, database: 'ok', migrations: migrationReady ? 'ok' : 'behind', ...releaseInfo() };
  } catch {
    return { ready: false, database: 'unavailable', migrations: 'unknown', ...releaseInfo() };
  }
}
