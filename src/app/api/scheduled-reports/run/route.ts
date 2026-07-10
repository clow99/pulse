import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import type { ScheduledReport } from '@prisma/client';
import { defaultDateRange, getReportData, type ReportKind } from '@/lib/reports';
import { normalizeProductReport } from '@/lib/report-catalog';
import { prisma } from '@/lib/prisma';

function verifySecret(request: Request) {
  const secret = process.env.SCHEDULED_REPORT_SECRET || process.env.INSIGHTS_CRON_SECRET;
  if (!secret) return false;
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return token === secret;
}

export async function POST(request: Request) {
  try {
    if (!verifySecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const due = await prisma.scheduledReport.findMany({
      where: {
        enabled: true,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: new Date() } }],
      },
      include: { site: true, org: true },
      take: 25,
      orderBy: { nextRunAt: 'asc' },
    });

    const results = [];
    for (const report of due) {
      try {
        const payload = await buildScheduledPayload(report);
        await deliverScheduledReport(report, payload);
        await prisma.scheduledReport.update({
          where: { id: report.id },
          data: { lastSentAt: new Date(), nextRunAt: nextRunDate(report.frequency) },
        });
        results.push({ id: report.id, status: 'sent' });
      } catch (error) {
        results.push({
          id: report.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({ evaluated: due.length, results });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function buildScheduledPayload(report: ScheduledReport & { site: { name: string; domain: string } }) {
  const range = defaultDateRange();
  const reports = report.reports
    .map(normalizeProductReport)
    .filter((kind): kind is ReportKind => Boolean(kind));
  const data = Object.fromEntries(
    await Promise.all(
      reports.map(async (kind) => [kind, await getReportData(kind, report.siteId, range)] as const)
    )
  );
  return {
    name: report.name,
    site: report.site,
    range: { from: range.fromDate.toISOString(), to: range.toDate.toISOString() },
    reports,
    data,
  };
}

async function deliverScheduledReport(report: ScheduledReport, payload: unknown) {
  if (report.channelType === 'webhook') {
    const res = await fetch(report.target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Webhook delivery failed with HTTP ${res.status}`);
    return;
  }

  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) {
    throw new Error(`Email report delivery is not configured. Missing ${[!host ? 'SMTP_HOST' : null, !from ? 'SMTP_FROM' : null].filter(Boolean).join(', ')}.`);
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  await transporter.sendMail({
    from,
    to: report.target,
    subject: `[Pulse] ${report.name}`,
    text: JSON.stringify(payload, null, 2),
  });
}

function nextRunDate(frequency: string) {
  const date = new Date();
  if (frequency === 'daily') date.setDate(date.getDate() + 1);
  else if (frequency === 'monthly') date.setMonth(date.getMonth() + 1);
  else date.setDate(date.getDate() + 7);
  return date;
}
