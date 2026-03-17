import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { collectPayloadSchema } from '@/lib/validation';
import { parseUserAgent } from '@/lib/ua-parser';
import { deriveCountry, deriveLanguage } from '@/lib/geo';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = collectPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { token, type, name, properties, url, referrer, utm_source, utm_medium, utm_campaign } =
      parsed.data;

    const site = await prisma.site.findUnique({
      where: { token },
      select: { id: true, active: true },
    });

    if (!site || !site.active) {
      return NextResponse.json(
        { error: 'Invalid or inactive site token' },
        { status: 403, headers: corsHeaders }
      );
    }

    const ua = parseUserAgent(request.headers.get('user-agent'));
    const acceptLanguage = request.headers.get('accept-language');
    const country = deriveCountry(acceptLanguage);
    const language = deriveLanguage(acceptLanguage);

    let pathname = '/';
    try {
      pathname = new URL(url).pathname;
    } catch {
      pathname = url;
    }

    if (type === 'pageview') {
      await prisma.pageview.create({
        data: {
          siteId: site.id,
          pathname,
          referrer: referrer || '',
          utmSource: utm_source || '',
          utmMedium: utm_medium || '',
          utmCampaign: utm_campaign || '',
          browser: ua.browser,
          os: ua.os,
          device: ua.device,
          country,
          language,
        },
      });
    } else if (type === 'event') {
      if (!name) {
        return NextResponse.json(
          { error: 'Event name is required' },
          { status: 400, headers: corsHeaders }
        );
      }
      await prisma.event.create({
        data: {
          siteId: site.id,
          name,
          properties: properties || {},
          pathname,
          referrer: referrer || '',
          browser: ua.browser,
          os: ua.os,
          device: ua.device,
          country,
          language,
        },
      });
    }

    return new NextResponse(null, { status: 202, headers: corsHeaders });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
