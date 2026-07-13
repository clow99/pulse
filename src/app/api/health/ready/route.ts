import { NextResponse } from 'next/server';
import { readiness } from '@/lib/health';

export async function GET() {
  const state = await readiness();
  return NextResponse.json(
    { status: state.ready ? 'ok' : 'not_ready', timestamp: new Date().toISOString(), ...state },
    { status: state.ready ? 200 : 503 }
  );
}
