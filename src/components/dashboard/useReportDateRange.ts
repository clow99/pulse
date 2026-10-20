'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  dateInputValue,
  presetDateRange,
  validDateRange,
} from '@/lib/report-date-range';

export function useReportDateRange() {
  const params = useSearchParams();
  const [fallback] = useState(() => presetDateRange());
  const queryFrom = params.get('from') || '';
  const queryTo = params.get('to') || '';
  const range = validDateRange(queryFrom, queryTo)
    ? { from: dateInputValue(queryFrom), to: dateInputValue(queryTo) }
    : fallback;

  function setRange(from: string, to: string) {
    if (!validDateRange(from, to)) return;
    const next = new URLSearchParams(window.location.search);
    next.set('from', dateInputValue(from));
    next.set('to', dateInputValue(to));
    window.history.pushState(null, '', `${window.location.pathname}?${next}`);
  }

  return { ...range, setRange };
}
