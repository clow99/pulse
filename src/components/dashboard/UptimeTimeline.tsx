'use client';

import { useState, useRef } from 'react';
import type { UptimeTimeseriesPoint } from '@/types';

interface UptimeTimelineProps {
  data: UptimeTimeseriesPoint[];
}

export function UptimeTimeline({ data }: UptimeTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  if (data.length === 0) {
    return (
      <div className="pulse-uptime-timeline-container">
        <div className="pulse-section-header" style={{ marginBottom: '1rem' }}>
          <span className="pulse-section-title">Uptime History</span>
        </div>
        <div className="pulse-uptime-timeline-empty">
          No uptime data available
        </div>
      </div>
    );
  }

  const overallUptime = data.length > 0
    ? (data.reduce((sum, p) => sum + p.uptimePercentage, 0) / data.length).toFixed(2)
    : '0';

  return (
    <div className="pulse-uptime-timeline-container">
      <div className="pulse-section-header" style={{ marginBottom: '1rem' }}>
        <span className="pulse-section-title">Uptime History</span>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--pulse-text-primary)' }}>
          {overallUptime}% uptime
        </span>
      </div>

      <div className="pulse-uptime-bars" ref={barRef} role="img" aria-label="Uptime timeline">
        {data.map((point, i) => {
          const isUp = point.uptimePercentage >= 99;
          const isDegraded = point.uptimePercentage >= 90 && point.uptimePercentage < 99;

          let bgColor = 'var(--pulse-danger)';
          if (isUp) bgColor = 'var(--pulse-success)';
          else if (isDegraded) bgColor = 'var(--pulse-warning)';

          return (
            <div
              key={point.date}
              className="pulse-uptime-bar"
              style={{ backgroundColor: bgColor }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === i && (
                <div className="pulse-uptime-bar-tooltip">
                  <div style={{ fontWeight: 600, marginBottom: '0.125rem' }}>{point.date}</div>
                  <div style={{ color: 'var(--pulse-text-secondary)' }}>
                    {point.uptimePercentage}% &middot; {point.avgResponseTime}ms
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pulse-uptime-bars-footer">
        <span className="pulse-uptime-bars-date">{data[0].date}</span>
        <div className="pulse-uptime-bars-legend">
          <span className="pulse-uptime-bars-legend-item">
            <span className="pulse-uptime-bars-legend-dot" style={{ backgroundColor: 'var(--pulse-success)' }} />
            Operational
          </span>
          <span className="pulse-uptime-bars-legend-item">
            <span className="pulse-uptime-bars-legend-dot" style={{ backgroundColor: 'var(--pulse-warning)' }} />
            Degraded
          </span>
          <span className="pulse-uptime-bars-legend-item">
            <span className="pulse-uptime-bars-legend-dot" style={{ backgroundColor: 'var(--pulse-danger)' }} />
            Down
          </span>
        </div>
        <span className="pulse-uptime-bars-date">{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}
