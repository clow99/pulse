import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const demoEmail = 'demo@pulse.local';
  const demoPassword = randomBytes(18).toString('base64url');
  const passwordHash = await hash(demoPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: { passwordHash },
    create: {
      email: demoEmail,
      name: 'Demo User',
      passwordHash,
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'demo-org' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo-org',
    },
  });

  await prisma.orgMembership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: {
      userId: user.id,
      orgId: org.id,
      role: 'owner',
    },
  });

  const siteToken = process.env.DEMO_SITE_TOKEN || randomBytes(32).toString('hex');
  const site = await prisma.site.upsert({
    where: { token: siteToken },
    update: { collectWebVitals: true },
    create: {
      name: 'Demo Site',
      domain: 'example.com',
      token: siteToken,
      collectWebVitals: true,
      orgId: org.id,
    },
  });

  const now = new Date();
  const pageviewData = [];
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
  const oses = ['Windows', 'macOS', 'Linux', 'iOS', 'Android'];
  const devices = ['desktop', 'mobile', 'tablet'];
  const countries = ['US', 'GB', 'DE', 'FR', 'CA', 'JP', 'AU'];
  const languages = ['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP'];
  const pages = ['/', '/about', '/pricing', '/blog', '/docs', '/contact', '/features', '/blog/intro', '/blog/getting-started', '/docs/api'];
  const referrers = ['', 'https://google.com', 'https://twitter.com', 'https://github.com', 'https://reddit.com', 'https://news.ycombinator.com', ''];
  const utmSources = ['', 'google', 'twitter', 'newsletter', ''];
  const utmMediums = ['', 'cpc', 'social', 'email', ''];
  const utmCampaigns = ['', 'launch', 'beta', ''];

  function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const dailyViews = 20 + Math.floor(Math.random() * 80);
    for (let j = 0; j < dailyViews; j++) {
      const timestamp = new Date(
        now.getTime() - daysAgo * 86400000 - Math.random() * 86400000
      );
      pageviewData.push({
        siteId: site.id,
        visitId: `seed-${daysAgo}-${j}`,
        hostname: 'example.com',
        pathname: pick(pages),
        referrer: pick(referrers),
        utmSource: pick(utmSources),
        utmMedium: pick(utmMediums),
        utmCampaign: pick(utmCampaigns),
        browser: pick(browsers),
        os: pick(oses),
        device: pick(devices),
        country: pick(countries),
        language: pick(languages),
        timestamp,
      });
    }
  }

  await prisma.pageview.createMany({ data: pageviewData });

  const eventData = [];
  const eventNames = ['click_cta', 'signup_start', 'signup_complete', 'download', 'video_play'];

  for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
    const dailyEvents = 5 + Math.floor(Math.random() * 15);
    for (let j = 0; j < dailyEvents; j++) {
      const timestamp = new Date(
        now.getTime() - daysAgo * 86400000 - Math.random() * 86400000
      );
      const name = pick(eventNames);
      eventData.push({
        siteId: site.id,
        visitId: `seed-${daysAgo}-${j}`,
        name,
        properties: { button: pick(['hero', 'nav', 'footer']), page: pick(pages) },
        hostname: 'example.com',
        pathname: pick(pages),
        referrer: pick(referrers),
        utmSource: pick(utmSources),
        utmMedium: pick(utmMediums),
        utmCampaign: pick(utmCampaigns),
        browser: pick(browsers),
        os: pick(oses),
        device: pick(devices),
        country: pick(countries),
        language: pick(languages),
        timestamp,
      });
    }
  }

  await prisma.event.createMany({ data: eventData });

  const pricingGoal = await prisma.goal.create({
    data: {
      siteId: site.id,
      name: 'Viewed pricing',
      type: 'pageview',
      matchType: 'exact',
      path: '/pricing',
    },
  });
  const signupGoal = await prisma.goal.create({
    data: {
      siteId: site.id,
      name: 'Completed signup',
      type: 'event',
      eventName: 'signup_complete',
    },
  });
  await prisma.funnel.create({
    data: {
      siteId: site.id,
      name: 'Pricing to signup',
      mode: 'sequential',
      steps: {
        create: [
          { goalId: pricingGoal.id, position: 1 },
          { goalId: signupGoal.id, position: 2 },
        ],
      },
    },
  });

  const funnelPageviews = [];
  const funnelEvents = [];
  for (let i = 0; i < 40; i++) {
    const visitId = `demo-funnel-${i}`;
    const timestamp = new Date(now.getTime() - i * 3600000);
    funnelPageviews.push({
      siteId: site.id,
      visitId,
      hostname: 'example.com',
      pathname: '/pricing',
      referrer: 'https://google.com',
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'launch',
      browser: pick(browsers),
      os: pick(oses),
      device: pick(devices),
      country: pick(countries),
      language: pick(languages),
      timestamp,
    });
    if (i % 3 !== 0) {
      funnelEvents.push({
        siteId: site.id,
        visitId,
        name: 'signup_complete',
        properties: { plan: pick(['starter', 'pro']) },
        hostname: 'example.com',
        pathname: '/register',
        referrer: 'https://google.com',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'launch',
        browser: pick(browsers),
        os: pick(oses),
        device: pick(devices),
        country: pick(countries),
        language: pick(languages),
        timestamp: new Date(timestamp.getTime() + 120000),
      });
    }
  }
  await prisma.pageview.createMany({ data: funnelPageviews });
  await prisma.event.createMany({ data: funnelEvents });

  const revenueEvents = Array.from({ length: 25 }).map((_, i) => {
    const value = 29 + Math.floor(Math.random() * 170);
    return {
      siteId: site.id,
      visitId: `demo-order-${i}`,
      name: 'purchase',
      properties: { value, currency: 'USD', orderId: `demo-order-${i}` },
      hostname: 'example.com',
      pathname: '/checkout/complete',
      referrer: pick(referrers),
      utmSource: pick(['google', 'newsletter', 'twitter']),
      utmMedium: pick(['cpc', 'email', 'social']),
      utmCampaign: pick(['launch', 'beta']),
      browser: pick(browsers),
      os: pick(oses),
      device: pick(devices),
      country: pick(countries),
      language: pick(languages),
      revenueValue: value,
      revenueCurrency: 'USD',
      orderId: `demo-order-${i}`,
      timestamp: new Date(now.getTime() - i * 7200000),
    };
  });
  await prisma.event.createMany({ data: revenueEvents, skipDuplicates: true });

  await prisma.webVital.createMany({
    data: Array.from({ length: 120 }).map((_, i) => {
      const name = pick(['LCP', 'CLS', 'INP', 'FCP', 'TTFB']);
      const value = name === 'CLS'
        ? Math.round(Math.random() * 0.35 * 1000) / 1000
        : 100 + Math.floor(Math.random() * 4500);
      const rating = name === 'CLS'
        ? value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
        : value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor';
      return {
        siteId: site.id,
        visitId: `seed-vital-${i}`,
        name,
        value,
        rating,
        hostname: 'example.com',
        pathname: pick(pages),
        browser: pick(browsers),
        os: pick(oses),
        device: pick(devices),
        country: pick(countries),
        language: pick(languages),
        timestamp: new Date(now.getTime() - i * 1800000),
      };
    }),
  });

  await prisma.uptimeCheck.createMany({
    data: Array.from({ length: 40 }).map((_, i) => ({
      siteId: site.id,
      statusCode: i === 4 || i === 5 ? 500 : 200,
      responseTime: 120 + Math.floor(Math.random() * 300),
      isUp: !(i === 4 || i === 5),
      error: i === 4 || i === 5 ? 'Demo outage' : null,
      checkedAt: new Date(now.getTime() - i * 3600000),
    })),
  });

  const channel = await prisma.notificationChannel.create({
    data: {
      orgId: org.id,
      type: 'email',
      name: 'Demo alerts',
      target: 'alerts@example.com',
    },
  });
  await prisma.alertRule.create({
    data: {
      siteId: site.id,
      notificationChannelId: channel.id,
      consecutiveFailures: 2,
      recoveryChecks: 1,
    },
  });
  await prisma.statusPage.upsert({
    where: { slug: 'demo-status' },
    update: {},
    create: {
      orgId: org.id,
      slug: 'demo-status',
      name: 'Demo Status',
      description: 'Public uptime status for the demo site.',
      components: {
        create: [{ siteId: site.id, name: 'Demo Site', sortOrder: 0 }],
      },
    },
  });
  await prisma.insight.create({
    data: {
      siteId: site.id,
      type: 'demo',
      severity: 'info',
      title: 'Demo data is ready',
      body: 'Pulse has sample funnels, revenue, uptime, and web-vital data for this site.',
      evidence: { seeded: true },
    },
  });

  console.log(`Seeded local demo user: ${user.email}`);
  console.log(`One-time local demo password (rotated on every seed): ${demoPassword}`);
  console.log(`Seeded org=${org.slug}, site=${site.domain} (token: ${site.token})`);
  console.log(`Created ${pageviewData.length + funnelPageviews.length} pageviews and ${eventData.length + funnelEvents.length + revenueEvents.length} events`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
