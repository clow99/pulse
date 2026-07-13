import { NextResponse } from 'next/server';
import { recordHeartbeat } from '@/lib/monitoring';

interface Context { params: Promise<{ token: string }> }

export async function POST(_request: Request, context: Context) {
  const { token } = await context.params;
  const result = await recordHeartbeat(token, false);
  if (!result) return NextResponse.json({ error: 'Heartbeat not found' }, { status: 404 });
  return NextResponse.json(result, { status: 202 });
}

export const GET = POST;
