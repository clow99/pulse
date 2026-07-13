import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runDueMonitors } from '@/lib/monitoring';
import { runDueBriefs } from '@/lib/daily-briefs';
import { generateInsights } from '@/app/api/insights/generate/route';

const JOB_LOCK_KEY = 7_561_001;

function authorized(request: Request) {
  const expected = process.env.PULSE_JOBS_SECRET;
  const actual = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(expected && actual === expected);
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  try {
    const result = await prisma.$transaction(async (tx) => {
      const lock = await tx.$queryRaw<Array<{ locked: boolean }>>`
        SELECT pg_try_advisory_xact_lock(${JOB_LOCK_KEY}) AS locked
      `;
      if (!lock[0]?.locked) return { skipped: true, reason: 'already_running' };

      const monitors = await runDueMonitors(now);
      const briefs = await runDueBriefs(now);
      const insights = now.getUTCMinutes() < 2 ? await generateInsights() : null;
      return {
        skipped: false,
        monitors: monitors.length,
        briefs: briefs.length,
        insights,
        ranAt: now.toISOString(),
      };
    }, { timeout: 120_000 });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Pulse jobs failed', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Job execution failed' }, { status: 500 });
  }
}
