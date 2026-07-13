import { describe, expect, it } from 'vitest';
import { briefTime } from './daily-briefs';

describe('daily brief time windows', () => {
  it('uses local calendar dates across time zones', () => {
    const parts = briefTime.partsInZone(new Date('2026-07-13T01:00:00Z'), 'America/Toronto');
    expect(parts.date).toBe('2026-07-12');
    expect(briefTime.shiftLocalDate(parts.date, -1)).toBe('2026-07-11');
  });

  it('converts Toronto midnight to UTC', () => {
    expect(briefTime.zonedMidnightUtc('2026-07-12', 'America/Toronto').toISOString()).toBe('2026-07-12T04:00:00.000Z');
  });
});
