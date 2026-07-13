'use client';

import { FadeIn } from '@/components/motion';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export interface BarChartDataPoint {
  name: string;
  value: number;
  percentage: number;
}

interface BarChartProps {
  data: BarChartDataPoint[];
  height?: number;
  color?: string;
}

const defaultFormat = (n: number) => n.toLocaleString();

export function BarChart({
  data,
  height = 280,
  color = '#0ea5e9',
}: BarChartProps) {
  return (
    <FadeIn>
      <div className="pulse-chart-container" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#23232f" vertical={false} />
            <XAxis
              dataKey="name"
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
              formatter={(value, _name, item) => {
                const payload = item.payload as BarChartDataPoint | undefined;
                const pct = payload?.percentage ?? 0;
                return [`${defaultFormat(Number(value ?? 0))} (${pct.toFixed(1)}%)`, ''];
              }}
              labelFormatter={(label) => label}
            />
            <Bar
              dataKey="value"
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </FadeIn>
  );
}
