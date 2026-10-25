'use client';

import { useId, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { DashboardIcon } from './DashboardIcon';
import {
  DATE_PRESETS,
  dateInputValue,
  presetDateRange,
  validDateRange,
} from '@/lib/report-date-range';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  showSummary?: boolean;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  showSummary = true,
}: DateRangePickerProps) {
  const id = useId();
  const customButton = useRef<HTMLButtonElement>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [error, setError] = useState('');
  const hasValidRange = validDateRange(from, to);
  const selectedRange = hasValidRange
    ? `${format(parseISO(from), 'MMM d, yyyy')} – ${format(parseISO(to), 'MMM d, yyyy')}`
    : 'Choose a date range';
  const active = DATE_PRESETS.find(({ days }) => {
    const range = presetDateRange(days);
    return (
      dateInputValue(from) === range.from && dateInputValue(to) === range.to
    );
  });

  return (
    <div className="pulse-date-picker">
      {showSummary && (
        <div className="pulse-range-summary">
          <DashboardIcon name="calendar" width={16} height={16} />
          <span>{selectedRange}</span>
        </div>
      )}
      <div
        className="pulse-range-presets"
        role="group"
        aria-label="Reporting period"
      >
        {DATE_PRESETS.map(({ key, label, days }) => (
          <button
            key={key}
            type="button"
            aria-pressed={active?.key === key && !showCustom}
            onClick={() => {
              const range = presetDateRange(days);
              setShowCustom(false);
              onChange(range.from, range.to);
            }}
          >
            {label}
          </button>
        ))}
        <button
          ref={customButton}
          type="button"
          aria-pressed={!active || showCustom}
          aria-expanded={showCustom}
          aria-controls={id}
          onClick={() => {
            setCustomFrom(dateInputValue(from));
            setCustomTo(dateInputValue(to));
            setError('');
            setShowCustom(!showCustom);
          }}
        >
          Custom
        </button>
      </div>
      {showCustom && (
        <form
          id={id}
          className="pulse-range-custom"
          aria-label="Custom reporting period"
          noValidate
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setShowCustom(false);
              customButton.current?.focus();
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            if (!validDateRange(customFrom, customTo)) {
              setError(
                'Choose both dates, with the end on or after the start.',
              );
              return;
            }
            onChange(customFrom, customTo);
            setShowCustom(false);
            customButton.current?.focus();
          }}
        >
          <label>
            From
            <input
              autoFocus
              type="date"
              required
              value={customFrom}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setError('');
              }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              required
              value={customTo}
              aria-invalid={!!error}
              aria-describedby={error ? `${id}-error` : undefined}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setError('');
              }}
            />
          </label>
          <button className="pulse-action-button primary" type="submit">
            Apply range
          </button>
          <button
            className="pulse-action-button"
            type="button"
            onClick={() => {
              setShowCustom(false);
              customButton.current?.focus();
            }}
          >
            Cancel
          </button>
          {error && (
            <p id={`${id}-error`} className="pulse-range-error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
