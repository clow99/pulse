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
  displayValue?: string;
  formatFn?: (n: number) => string;
  hideChange?: boolean;
  detail?: string;
}

interface StatsCardsProps {
  stats: StatItem[];
  className?: string;
  staticValues?: boolean;
}

export function StatsCards({
  stats,
  className,
  staticValues = false,
}: StatsCardsProps) {
  const gridClassName = ['pulse-grid', 'pulse-grid-4', className]
    .filter(Boolean)
    .join(' ');

  const cards = stats.map((stat) => (
    <Card key={stat.label} variant="shadow" className="pulse-stat-card">
      <Card.Body>
        <div className="pulse-stat-label">{stat.label}</div>
        <div className="pulse-stat-value">
          {staticValues
            ? (stat.displayValue ?? stat.formatFn?.(stat.value) ?? stat.value.toLocaleString())
            : (
                <AnimatedCounter
                  value={stat.value}
                  formatFn={stat.formatFn}
                />
              )}
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
        {stat.detail ? <div className="pulse-stat-detail">{stat.detail}</div> : null}
      </Card.Body>
    </Card>
  ));

  if (staticValues) {
    return <div className={gridClassName}>{cards}</div>;
  }

  return (
    <StaggerContainer className={gridClassName}>
      {stats.map((stat, index) => (
        <StaggerItem key={stat.label}>
          <motion.div whileHover={{ y: -2 }}>
            {cards[index]}
          </motion.div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
