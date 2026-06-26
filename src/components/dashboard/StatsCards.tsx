'use client';

import { Badge, Card } from '@velocityuikit/velocityui';
import { motion } from 'framer-motion';
import {
  AnimatedCounter,
  StaggerContainer,
  StaggerItem,
} from '@/components/motion';

export interface StatItem {
  label: string;
  value: number;
  change: number;
  formatFn?: (n: number) => string;
  hideChange?: boolean;
}

interface StatsCardsProps {
  stats: StatItem[];
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <StaggerContainer className="pulse-grid pulse-grid-4">
      {stats.map((stat) => (
        <StaggerItem key={stat.label}>
          <motion.div whileHover={{ y: -2 }}>
            <Card variant="shadow" className="pulse-stat-card">
              <Card.Body>
                <div className="pulse-stat-label">{stat.label}</div>
                <div className="pulse-stat-value">
                  <AnimatedCounter
                    value={stat.value}
                    formatFn={stat.formatFn}
                  />
                </div>
                {!stat.hideChange && (
                  <div className="pulse-stat-change">
                    <Badge
                      variant={stat.change >= 0 ? 'success' : 'danger'}
                      size="sm"
                    >
                      {stat.change >= 0 ? '\u2191' : '\u2193'}{' '}
                      {Math.abs(stat.change).toFixed(1)}%
                    </Badge>
                  </div>
                )}
              </Card.Body>
            </Card>
          </motion.div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
