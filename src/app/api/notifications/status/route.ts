import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const EMAIL_ENV_KEYS = ['SMTP_HOST', 'SMTP_FROM'] as const;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const missingEmailEnv = EMAIL_ENV_KEYS.filter((key) => !process.env[key]);

    return NextResponse.json({
      emailConfigured: missingEmailEnv.length === 0,
      missingEmailEnv,
      smtpAuthConfigured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASS),
      uptimeCheckSecretConfigured: Boolean(process.env.UPTIME_CHECK_SECRET),
      insightsCronSecretConfigured: Boolean(process.env.INSIGHTS_CRON_SECRET),
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
