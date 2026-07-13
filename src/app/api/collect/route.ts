import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { collectPayloadSchema } from '@/lib/validation';
import { parseUserAgent } from '@/lib/ua-parser';
import { deriveCountry, deriveLanguage } from '@/lib/geo';
import { domainMatches, getWebVitalRating, parseRevenueProperties } from '@/lib/tracking';
import { checkRateLimit } from '@/lib/rate-limit';

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
    const declaredLength = Number(request.headers.get('content-length') || 0);
    if (declaredLength > 32_768) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413, headers: corsHeaders });
    }
    const rawBody = await request.text();
    if (rawBody.length > 32_768) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413, headers: corsHeaders });
    }
    let body: unknown;
    try { body = JSON.parse(rawBody); } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: corsHeaders });
    }
    const parsed = collectPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { token, type, visitId, name, properties, url, referrer, utm_source, utm_medium, utm_campaign, value, rating } =
      parsed.data;

    const site = await prisma.site.findUnique({
      where: { token },
      select: { id: true, domain: true, active: true, collectWebVitals: true },
    });

    if (!site || !site.active) {
      return NextResponse.json(
        { error: 'Invalid or inactive site token' },
        { status: 403, headers: corsHeaders }
      );
    }

    const ua = parseUserAgent(request.headers.get('user-agent'));
    const acceptLanguage = request.headers.get('accept-language');
    const country = deriveCountry(request.headers);
    const language = deriveLanguage(acceptLanguage);

    let hostname = '';
    let pathname = '/';
    try {
      const parsedUrl = new URL(url);
      hostname = parsedUrl.hostname;
      pathname = parsedUrl.pathname;
    } catch {
      pathname = url;
    }

    if (!domainMatches(site.domain, hostname)) {
      return NextResponse.json(
        { error: 'Tracked URL does not match this site' },
        { status: 403, headers: corsHeaders }
      );
    }

    const source = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const sourceHash = createHash('sha256').update(`${site.id}:${source}`).digest('hex').slice(0, 24);
    if (!checkRateLimit(`collect:${site.id}:${sourceHash}`, { limit: 600, windowMs: 60_000 }).allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: corsHeaders });
    }

    if (type === 'pageview') {
      await prisma.pageview.create({
        data: {
          siteId: site.id,
          visitId: visitId || null,
          hostname,
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
      const revenue = parseRevenueProperties(properties);
      const eventData = {
        siteId: site.id,
        visitId: visitId || null,
        name,
        properties: properties || {},
        hostname,
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
        revenueValue: revenue.revenueValue,
        revenueCurrency: revenue.revenueCurrency,
        orderId: revenue.orderId,
      };

      if (revenue.orderId) {
        const existing = await prisma.event.findFirst({
          where: {
            siteId: site.id,
            name,
            orderId: revenue.orderId,
          },
          select: { id: true },
        });
        if (!existing) {
          await prisma.event.create({ data: eventData });
        }
      } else {
        await prisma.event.create({ data: eventData });
      }
    } else if (type === 'web_vital') {
      if (!site.collectWebVitals || !name) {
        return new NextResponse(null, { status: 202, headers: corsHeaders });
      }
      const metricValue = typeof value === 'number'
        ? value
        : typeof properties?.value === 'number'
          ? properties.value
          : Number(properties?.value ?? NaN);
      if (!Number.isFinite(metricValue)) {
        return NextResponse.json(
          { error: 'Metric value is required' },
          { status: 400, headers: corsHeaders }
        );
      }
      await prisma.webVital.create({
        data: {
          siteId: site.id,
          visitId: visitId || null,
          name: name.toUpperCase(),
          value: metricValue,
          rating: rating || String(properties?.rating || getWebVitalRating(name, metricValue)),
          hostname,
          pathname,
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
