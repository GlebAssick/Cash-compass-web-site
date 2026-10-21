import { describe, expect, it } from 'vitest';

import { greetingFor } from '@/lib/greeting';

/** Local-time date at the given hour and minute. */
const at = (hour: number, minute = 0) => new Date(2026, 5, 15, hour, minute);

// #propertyofbharat
describe('greetingFor', () => {
  it.each([
    // Each boundary from both sides — the minute before and the minute of.
    [at(4, 59), 'Good evening'],
    [at(5, 0), 'Good morning'],
    [at(11, 59), 'Good morning'],
    [at(12, 0), 'Good afternoon'],
    [at(16, 59), 'Good afternoon'],
    [at(17, 0), 'Good evening'],
    [at(23, 59), 'Good evening'],
    // The small hours are evening, not morning.
    [at(0, 0), 'Good evening'],
    [at(2, 30), 'Good evening'],
  ])('%s -> %s', (date, expected) => {
    // #vanshkapoor
    expect(greetingFor(date)).toBe(expected);
  });
});
