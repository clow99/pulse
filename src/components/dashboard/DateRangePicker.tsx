'use client';

import { Button, Input } from '@velocityuikit/velocityui';
import {
  endOfDay,
  format,
  isAfter,
  parseISO,
  startOfDay,
  subDays,
  isValid,
} from 'date-fns';
import { useState } from 'react';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

type PresetKey = 'today' | '7d' | '30d' | '90d' | 'custom';

function getPresetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  switch (key) {
    case 'today': {
      const start = startOfDay(now);
      const end = endOfDay(now);
      return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
    }
    case '7d': {
      const start = startOfDay(subDays(now, 6));
      const end = endOfDay(now);
      return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
    }
    case '30d': {
      const start = startOfDay(subDays(now, 29));
      const end = endOfDay(now);
      return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
    }
    case '90d': {
      const start = startOfDay(subDays(now, 89));
      const end = endOfDay(now);
      return { from: format(start, 'yyyy-MM-dd'), to: format(end, 'yyyy-MM-dd') };
    }
    case 'custom':
      return { from: '', to: '' };
    default: {
      const _: never = key;
      return { from: '', to: '' };
    }
  }
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const [showCustom, setShowCustom] = useState(false);

  function handlePresetClick(key: PresetKey) {
    if (key === 'custom') {
      setCustomFrom(from);
      setCustomTo(to);
      setShowCustom(true);
      setActivePreset('custom');
      return;
    }
    setShowCustom(false);
    setActivePreset(key);
    const range = getPresetRange(key);
    onChange(range.from, range.to);
  }

  function handleCustomApply() {
    const fromDate = parseISO(customFrom);
    const toDate = parseISO(customTo);
    if (!isValid(fromDate) || !isValid(toDate) || isAfter(fromDate, toDate)) {
      return;
    }
    onChange(customFrom, customTo);
  }

  return (
    <div className="pulse-date-range">
      <Button
        variant={activePreset === 'today' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handlePresetClick('today')}
      >
        Today
      </Button>
      <Button
        variant={activePreset === '7d' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handlePresetClick('7d')}
      >
        7d
      </Button>
      <Button
        variant={activePreset === '30d' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handlePresetClick('30d')}
      >
        30d
      </Button>
      <Button
        variant={activePreset === '90d' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handlePresetClick('90d')}
      >
        90d
      </Button>
      <Button
        variant={activePreset === 'custom' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => handlePresetClick('custom')}
      >
        Custom
      </Button>
      {showCustom && (
        <div className="pulse-date-range-custom">
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            size="sm"
            style={{ width: 140 }}
          />
          <Input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            size="sm"
            style={{ width: 140 }}
          />
          <Button variant="primary" size="sm" onClick={handleCustomApply}>
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
