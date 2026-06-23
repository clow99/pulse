import nodemailer from 'nodemailer';
import type { NotificationChannel } from '@prisma/client';

export interface NotificationPayload {
  event: 'incident.opened' | 'incident.resolved';
  site: {
    id: string;
    name: string;
    domain: string;
  };
  incident: {
    id: string;
    title: string;
    description: string | null;
    status: 'open' | 'resolved';
    startedAt: string;
    resolvedAt: string | null;
  };
  check?: {
    statusCode: number;
    responseTime: number;
    error: string | null;
  };
}

export async function sendNotification(
  channel: NotificationChannel,
  payload: NotificationPayload
) {
  if (!channel.enabled) return;

  if (channel.type === 'webhook') {
    await fetch(channel.target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return;
  }

  if (channel.type === 'email') {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    if (!host || !from) return;

    const port = Number(process.env.SMTP_PORT || 587);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });

    await transporter.sendMail({
      from,
      to: channel.target,
      subject: `[Pulse] ${payload.incident.title}`,
      text: [
        payload.incident.title,
        '',
        payload.incident.description,
        '',
        `Site: ${payload.site.name} (${payload.site.domain})`,
        `Status: ${payload.incident.status}`,
        payload.check ? `Last check: ${payload.check.statusCode || 'N/A'} in ${payload.check.responseTime}ms` : '',
        payload.check?.error ? `Error: ${payload.check.error}` : '',
      ].filter(Boolean).join('\n'),
    });
  }
}
