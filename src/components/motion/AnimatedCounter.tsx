'use client';

import {
  animate,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from 'framer-motion';
import { useEffect, useState } from 'react';

const defaultFormatFn = (v: number) => Math.round(v).toLocaleString();

interface AnimatedCounterProps {
  value: number;
  formatFn?: (v: number) => string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  formatFn = defaultFormatFn,
  duration = 1.5,
  className,
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, formatFn);
  const [displayValue, setDisplayValue] = useState(() => formatFn(0));

  useMotionValueEvent(rounded, 'change', (latest) => setDisplayValue(latest));

  useEffect(() => {
    animate(motionValue, value, { duration });
  }, [value, duration, motionValue]);

  return <span className={className}>{displayValue}</span>;
}
