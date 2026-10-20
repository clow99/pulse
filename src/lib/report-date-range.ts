import {
  endOfDay,
  format,
  isValid,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';

export const DATE_PRESETS = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
] as const;

export function dateInputValue(value: string): string {
  const date = parseISO(value);
  return isValid(date) ? format(date, 'yyyy-MM-dd') : '';
}

export function presetDateRange(days = 30, now = new Date()) {
  return {
    from: format(subDays(now, days - 1), 'yyyy-MM-dd'),
    to: format(now, 'yyyy-MM-dd'),
  };
}

export function validDateRange(from: string, to: string) {
  return Boolean(
    dateInputValue(from) &&
    dateInputValue(to) &&
    dateInputValue(from) <= dateInputValue(to),
  );
}

export function reportDateRange(from: string, to: string) {
  return {
    from: startOfDay(parseISO(from)).toISOString(),
    to: endOfDay(parseISO(to)).toISOString(),
  };
}
