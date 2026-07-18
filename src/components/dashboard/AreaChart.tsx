'use client';

import { FadeIn } from '@/components/motion';
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface AreaChartDataPoint {
  date: string;
  pageviews: number;
  visitors: number;
}

interface AreaChartProps {
  data: AreaChartDataPoint[];
  height?: number;
  ariaLabel?: string;
  staticRender?: boolean;
}

const defaultFormat = (n: number) => n.toLocaleString();

export function AreaChart({
  data,
  height = 320,
  ariaLabel = 'Visitors and pageviews over time',
  staticRender = false,
}: AreaChartProps) {
  const chart = (
      <div
        className="pulse-chart-container"
        style={{ height }}
        role="img"
        aria-label={ariaLabel}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGradientPageviews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="areaGradientVisitors" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
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
              tickFormatter={defaultFormat}
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
              formatter={(value, name) => [defaultFormat(Number(value ?? 0)), String(name)]}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="pageviews"
              name="Pageviews"
              stroke="#0ea5e9"
              fill="url(#areaGradientPageviews)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              name="Visitors"
              stroke="#22c55e"
              fill="url(#areaGradientVisitors)"
              strokeWidth={2}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
  );

  return staticRender ? chart : <FadeIn>{chart}</FadeIn>;
}
