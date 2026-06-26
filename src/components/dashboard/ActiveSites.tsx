'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FadeIn } from '@/components/motion';

interface SiteStats {
  id: string;
  name: string;
  domain: string;
  visitors: number;
  pageviews: number;
  pageviewTarget: number;
}

interface ActiveSitesProps {
  sites: SiteStats[];
  siteId?: string;
}

export function ActiveSites({ sites, siteId }: ActiveSitesProps) {
  const displaySites = sites.slice(0, 2);

  if (displaySites.length === 0) return null;

  return (
    <FadeIn>
      <div className="pulse-section">
        <div className="pulse-section-header">
          <h2 className="pulse-section-title">Active Sites</h2>
          <Link
            href={`/settings/sites${siteId ? `?siteId=${siteId}` : ''}`}
            className="pulse-view-more"
          >
            View more
          </Link>
        </div>
        <div className="pulse-active-sites-grid">
          {displaySites.map((site, i) => {
            const progress = site.pageviewTarget > 0
              ? Math.min(100, Math.round((site.pageviews / site.pageviewTarget) * 100))
              : 0;
            const colors = [
              { bg: 'rgba(14, 165, 233, 0.1)', border: 'rgba(14, 165, 233, 0.2)', bar: 'var(--pulse-accent)' },
              { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)', bar: 'var(--pulse-success)' },
            ];
            const color = colors[i % colors.length];

            return (
              <motion.div
                key={site.id}
                whileHover={{ y: -2 }}
                className="pulse-active-site-card"
                style={{ background: color.bg, borderColor: color.border }}
              >
                <div className="pulse-active-site-icon" style={{ background: color.bar }}>
                  {site.name.charAt(0).toUpperCase()}
                </div>
                <div className="pulse-active-site-info">
                  <div className="pulse-active-site-name">{site.name}</div>
                  <div className="pulse-active-site-domain">{site.domain}</div>
                  <div className="pulse-active-site-stats">
                    <span>{site.visitors.toLocaleString()} est. visitors</span>
                    <span style={{ color: 'var(--pulse-text-secondary)' }}>&middot;</span>
                    <span>{site.pageviews.toLocaleString()} pageviews</span>
                  </div>
                  <div className="pulse-progress-container">
                    <div className="pulse-progress-header">
                      <span className="pulse-progress-label">Traffic</span>
                      <span className="pulse-progress-value">{progress}%</span>
                    </div>
                    <div className="pulse-progress-track">
                      <motion.div
                        className="pulse-progress-bar"
                        style={{ backgroundColor: color.bar }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </FadeIn>
  );
}
