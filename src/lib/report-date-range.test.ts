import { describe, expect, it } from 'vitest';
import {
  dateInputValue,
  presetDateRange,
  reportDateRange,
  validDateRange,
} from './report-date-range';

describe('report date boundaries', () => {
  it('includes the full local day for Today, including the final millisecond', () => {
    const { from, to } = reportDateRange('2026-10-19', '2026-10-19');
    const start = new Date(from);
    const end = new Date(to);
    expect(start.getHours()).toBe(0);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
    expect(end.getTime()).toBeGreaterThan(start.getTime());
    expect(start.getDate()).toBe(end.getDate());
  });

  it('uses inclusive calendar periods instead of adding an extra day', () => {
    const now = new Date(2026, 9, 19, 15);
    expect(presetDateRange(1, now)).toEqual({
      from: '2026-10-19',
      to: '2026-10-19',
    });
    expect(presetDateRange(7, now)).toEqual({
      from: '2026-10-13',
      to: '2026-10-19',
    });
    expect(presetDateRange(30, now)).toEqual({
      from: '2026-09-20',
      to: '2026-10-19',
    });
  });

  it('converts timestamp values to native date input values', () => {
    expect(dateInputValue('2026-10-19T12:00:00')).toBe('2026-10-19');
    expect(dateInputValue('2026-10-19')).toBe('2026-10-19');
    expect(dateInputValue('invalid')).toBe('');
  });

  it('rejects incomplete, impossible, and reversed dates while allowing one-day periods', () => {
    expect(validDateRange('', '2026-10-19')).toBe(false);
    expect(validDateRange('2026-02-30', '2026-10-19')).toBe(false);
    expect(validDateRange('2026-10-20', '2026-10-19')).toBe(false);
    expect(validDateRange('2026-10-19', '2026-10-19')).toBe(true);
  });

  it('keeps day boundaries across daylight saving changes', () => {
    for (const day of ['2026-03-08', '2026-11-01']) {
      const { from, to } = reportDateRange(day, day);
      expect(new Date(from).getHours()).toBe(0);
      expect(new Date(to).getHours()).toBe(23);
      expect(new Date(to).getDate()).toBe(new Date(from).getDate());
    }
  });
});
