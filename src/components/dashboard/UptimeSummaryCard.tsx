'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/motion';
import type { UptimeSummary } from '@/types';

interface UptimeSummaryCardProps {
  data: UptimeSummary | null;
  siteId: string;
  loading?: boolean;
}

const STATUS_CONFIG = {
  up: { color: 'var(--pulse-success)', label: 'Operational' },
  down: { color: 'var(--pulse-danger)', label: 'Down' },
  unknown: { color: 'var(--pulse-text-secondary)', label: 'No data' },
} as const;

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function UptimeSummaryCard({ data, siteId, loading }: UptimeSummaryCardProps) {
  const status = data?.currentStatus ?? 'unknown';
  const config = STATUS_CONFIG[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="pulse-uptime-summary-card"
    >
      <div className="pulse-uptime-summary-header">
        <div className="pulse-uptime-summary-title-row">
          <span className="pulse-uptime-status-dot" style={{ backgroundColor: config.color }} />
          <span className="pulse-uptime-summary-label">Uptime</span>
        </div>
        <Link
          href={`/uptime?siteId=${siteId}`}
          className="pulse-view-more"
        >
          View details
        </Link>
      </div>

      {loading ? (
        <div className="pulse-uptime-summary-loading">
          <div className="pulse-spinner" style={{ width: 20, height: 20 }} />
        </div>
      ) : (
        <div className="pulse-uptime-summary-body">
          <div className="pulse-uptime-summary-metric">
            <span className="pulse-uptime-summary-value">
              {data ? (
                <AnimatedCounter
                  value={data.uptimePercentage}
                  formatFn={(v) => `${v.toFixed(2)}%`}
                />
              ) : (
                '--'
              )}
            </span>
            <span className="pulse-uptime-summary-status" style={{ color: config.color }}>
              {config.label}
            </span>
          </div>
          <div className="pulse-uptime-summary-details">
            <div className="pulse-uptime-summary-detail">
              <span className="pulse-uptime-summary-detail-label">Avg Response</span>
              <span className="pulse-uptime-summary-detail-value">
                {data ? `${data.avgResponseTime}ms` : '--'}
              </span>
            </div>
            <div className="pulse-uptime-summary-detail">
              <span className="pulse-uptime-summary-detail-label">Last Check</span>
              <span className="pulse-uptime-summary-detail-value">
                {data?.lastCheck ? formatTimeAgo(data.lastCheck.checkedAt) : '--'}
              </span>
            </div>
            <div className="pulse-uptime-summary-detail">
              <span className="pulse-uptime-summary-detail-label">Checks (30d)</span>
              <span className="pulse-uptime-summary-detail-value">
                {data ? data.totalChecks.toLocaleString() : '--'}
              </span>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
