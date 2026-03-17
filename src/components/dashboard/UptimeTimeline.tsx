'use client';

import { useState } from 'react';
import type { UptimeTimeseriesPoint } from '@/types';

interface UptimeTimelineProps {
  data: UptimeTimeseriesPoint[];
}

export function UptimeTimeline({ data }: UptimeTimelineProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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

  return (
    <div className="pulse-uptime-timeline-container">
      <div className="pulse-section-header" style={{ marginBottom: '1rem' }}>
        <span className="pulse-section-title">Uptime History</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--pulse-text-secondary)' }}>
          {data.length} {data.length === 1 ? 'period' : 'periods'}
        </span>
      </div>

      <div className="pulse-uptime-timeline-bar" role="img" aria-label="Uptime timeline">
        {data.map((point, i) => {
          const isUp = point.uptimePercentage >= 99;
          const isDegraded = point.uptimePercentage >= 90 && point.uptimePercentage < 99;

          let bgColor = 'var(--pulse-danger)';
          if (isUp) bgColor = 'var(--pulse-success)';
          else if (isDegraded) bgColor = 'var(--pulse-warning)';

          return (
            <div
              key={point.date}
              className="pulse-uptime-timeline-segment"
              style={{
                backgroundColor: bgColor,
                opacity: hoveredIndex !== null && hoveredIndex !== i ? 0.4 : 1,
              }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === i && (
                <div className="pulse-uptime-timeline-tooltip">
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{point.date}</div>
                  <div>Uptime: {point.uptimePercentage}%</div>
                  <div>Avg: {point.avgResponseTime}ms</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pulse-uptime-timeline-legend">
        <span className="pulse-uptime-timeline-date">{data[0].date}</span>
        <div className="pulse-uptime-timeline-legend-items">
          <span className="pulse-uptime-timeline-legend-item">
            <span className="pulse-uptime-timeline-legend-dot" style={{ backgroundColor: 'var(--pulse-success)' }} />
            Operational
          </span>
          <span className="pulse-uptime-timeline-legend-item">
            <span className="pulse-uptime-timeline-legend-dot" style={{ backgroundColor: 'var(--pulse-warning)' }} />
            Degraded
          </span>
          <span className="pulse-uptime-timeline-legend-item">
            <span className="pulse-uptime-timeline-legend-dot" style={{ backgroundColor: 'var(--pulse-danger)' }} />
            Down
          </span>
        </div>
        <span className="pulse-uptime-timeline-date">{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}
