import { NextResponse } from 'next/server';
import { releaseInfo } from '@/lib/health';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString(), ...releaseInfo() });
}
