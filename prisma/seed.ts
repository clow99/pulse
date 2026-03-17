import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash('password123', 12);

  const user = await prisma.user.upsert({
    where: { email: 'demo@pulse.dev' },
    update: {},
    create: {
      email: 'demo@pulse.dev',
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

  const siteToken = randomBytes(32).toString('hex');
  const site = await prisma.site.upsert({
    where: { token: siteToken },
    update: {},
    create: {
      name: 'Demo Site',
      domain: 'example.com',
      token: siteToken,
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
        name,
        properties: { button: pick(['hero', 'nav', 'footer']), page: pick(pages) },
        pathname: pick(pages),
        referrer: pick(referrers),
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

  console.log(`Seeded: user=${user.email}, org=${org.slug}, site=${site.domain} (token: ${site.token})`);
  console.log(`Created ${pageviewData.length} pageviews and ${eventData.length} events`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
