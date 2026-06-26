'use client';

import { Badge } from '@velocityuikit/velocityui';
import { motion } from 'framer-motion';
import { FadeIn } from '@/components/motion';

interface SiteRow {
  id: string;
  name: string;
  domain: string;
  visitors: number;
  pageviews: number;
  active: boolean;
  createdAt: string;
}

interface SitesTableProps {
  sites: SiteRow[];
  loading?: boolean;
}

export function SitesTable({ sites, loading = false }: SitesTableProps) {
  return (
    <FadeIn>
      <div className="pulse-sites-table-container">
        <div className="pulse-section-header" style={{ marginBottom: '1rem' }}>
          <h3 className="pulse-section-title">My Sites</h3>
        </div>

        {loading && (
          <div className="pulse-sites-loading">
            <div className="pulse-spinner" />
          </div>
        )}

        <div className="pulse-sites-table-wrapper">
          <table className="pulse-sites-table">
            <thead>
              <tr>
                <th>Site</th>
                <th>Domain</th>
                <th>Est. Visitors</th>
                <th>Pageviews</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site, i) => (
                <motion.tr
                  key={site.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <td>
                    <div className="pulse-sites-cell-site">
                      <div className="pulse-sites-avatar">
                        {site.name.charAt(0).toUpperCase()}
                      </div>
                      <span>{site.name}</span>
                    </div>
                  </td>
                  <td className="pulse-sites-cell-domain">{site.domain}</td>
                  <td>{site.visitors.toLocaleString()}</td>
                  <td>{site.pageviews.toLocaleString()}</td>
                  <td>
                    <Badge variant={site.active ? 'success' : 'danger'} size="sm">
                      {site.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </motion.tr>
              ))}
              {sites.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="pulse-sites-empty">
                    No sites found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </FadeIn>
  );
}
