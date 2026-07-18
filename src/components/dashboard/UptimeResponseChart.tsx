'use client';

import { FadeIn } from '@/components/motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { UptimeTimeseriesPoint } from '@/types';

interface UptimeResponseChartProps {
  data: UptimeTimeseriesPoint[];
  height?: number;
  ariaLabel?: string;
  staticRender?: boolean;
}

export function UptimeResponseChart({
  data,
  height = 280,
  ariaLabel = 'Average uptime response time over time',
  staticRender = false,
}: UptimeResponseChartProps) {
  const chart = (
      <div style={{ height }} role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="responseTimeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#23232f" />
            <XAxis
              dataKey="date"
              stroke="#8888a0"
              tick={{ fill: '#8888a0', fontSize: 12 }}
              axisLine={{ stroke: '#23232f' }}
              tickLine={{ stroke: '#23232f' }}
            />
            <YAxis
              stroke="#8888a0"
              tick={{ fill: '#8888a0', fontSize: 12 }}
              axisLine={{ stroke: '#23232f' }}
              tickLine={{ stroke: '#23232f' }}
              tickFormatter={(v) => `${v}ms`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#16161f',
                border: '1px solid #23232f',
                borderRadius: '8px',
                color: '#f0f0f5',
              }}
              labelStyle={{ color: '#f0f0f5' }}
              itemStyle={{ color: '#8888a0' }}
              formatter={(value) => [`${Number(value ?? 0)}ms`, 'Avg Response']}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="avgResponseTime"
              stroke="#0ea5e9"
              fill="url(#responseTimeGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
  );

  return staticRender ? chart : <FadeIn>{chart}</FadeIn>;
}
