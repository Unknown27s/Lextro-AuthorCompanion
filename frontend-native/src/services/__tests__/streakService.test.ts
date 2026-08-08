/**
 * Unit tests for the daily practice streak service (freeze protection).
 *
 * Pure logic over the localStorage-compatible storage layer, tested with
 * fake timers so "today" is deterministic.
 */

import { streakService } from '../streakService';
import { localStorage } from '../../utils/storage';

const DAY_MS = 24 * 60 * 60 * 1000;

const setNow = (iso: string) => {
  jest.setSystemTime(new Date(iso).getTime());
};

describe('streakService — recordSessionComplete', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts a 1-day streak on first completion', () => {
    setNow('2026-01-01T12:00:00.000Z');
    const info = streakService.recordSessionComplete();

    expect(info.current).toBe(1);
    expect(info.best).toBe(1);
    expect(info.freezesUsedThisMonth).toBe(0);
  });

  it('does not double-count the same day', () => {
    setNow('2026-01-01T12:00:00.000Z');
    streakService.recordSessionComplete();
    streakService.recordSessionComplete();

    expect(streakService.getStreak().current).toBe(1);
  });

  it('grows the streak on consecutive days', () => {
    setNow('2026-01-01T12:00:00.000Z');
    streakService.recordSessionComplete();

    setNow('2026-01-02T12:00:00.000Z');
    streakService.recordSessionComplete();

    const info = streakService.getStreak();
    expect(info.current).toBe(2);
    expect(info.best).toBe(2);
  });
});

describe('streakService — freeze protection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('bridges a single missed day with a freeze', () => {
    setNow('2026-01-01T12:00:00.000Z');
    streakService.recordSessionComplete();

    // Skip Jan 2 — play again on Jan 3
    setNow('2026-01-03T12:00:00.000Z');
    const info = streakService.recordSessionComplete();

    expect(info.current).toBe(3);
    expect(info.freezesUsedThisMonth).toBe(1);
    expect(info.freezeJustUsed).toBe(true);
  });

  it('shows a freeze in the 7-day pips', () => {
    setNow('2026-01-01T12:00:00.000Z');
    streakService.recordSessionComplete();
    setNow('2026-01-03T12:00:00.000Z');
    streakService.recordSessionComplete();

    const info = streakService.getStreak();
    const frozenDay = info.last7.find((d) => d.state === 'freeze');
    expect(frozenDay).toBeDefined();
  });

  it('does not apply more than 2 freezes in a month', () => {
    setNow('2026-01-01T12:00:00.000Z');
    streakService.recordSessionComplete();

    // Miss Jan 2 and Jan 4, play Jan 3 and Jan 5 — two freezes used
    setNow('2026-01-03T12:00:00.000Z');
    streakService.recordSessionComplete();
    setNow('2026-01-05T12:00:00.000Z');
    streakService.recordSessionComplete();
    expect(streakService.getStreak().freezesUsedThisMonth).toBe(2);

    // Miss Jan 6, play Jan 7 — third gap cannot be frozen; streak breaks to 1
    setNow('2026-01-07T12:00:00.000Z');
    const info = streakService.recordSessionComplete();
    expect(info.freezesUsedThisMonth).toBe(2);
    expect(info.current).toBe(1);
  });

  it('resets the freeze budget at month rollover', () => {
    setNow('2026-01-01T12:00:00.000Z');
    streakService.recordSessionComplete();
    setNow('2026-01-03T12:00:00.000Z');
    streakService.recordSessionComplete();
    expect(streakService.getStreak().freezesUsedThisMonth).toBe(1);

    setNow('2026-02-01T12:00:00.000Z');
    expect(streakService.getStreak().freezesUsedThisMonth).toBe(0);
  });
});

describe('streakService — clearAllData', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('wipes streak state', () => {
    setNow('2026-01-01T12:00:00.000Z');
    streakService.recordSessionComplete();
    streakService.clearAllData();

    expect(streakService.getStreak().current).toBe(0);
  });
});
