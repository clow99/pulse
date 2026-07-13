import { NextResponse } from 'next/server';
import { runDueMonitors } from '@/lib/monitoring';

function verifySecret(request: Request): boolean {
  const secrets = [process.env.UPTIME_CHECK_SECRET, process.env.PULSE_JOBS_SECRET]
    .filter((value): value is string => Boolean(value));
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return Boolean(token && secrets.includes(token));
}

export async function POST(request: Request) {
  if (!verifySecret(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const results = await runDueMonitors();
    return NextResponse.json({ checked: results.length, results });
  } catch (error) {
    console.error('Pulse monitor run failed', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'Monitor execution failed' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
