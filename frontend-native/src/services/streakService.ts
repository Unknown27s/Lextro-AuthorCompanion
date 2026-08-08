/**
 * Streak Service — daily practice streaks with freeze protection.
 *
 * One completed practice session in ANY mode counts the day. If a single day
 * is missed, up to 2 streak freezes per calendar month bridge the gap so the
 * streak survives. Data is persisted in localStorage (AsyncStorage-backed).
 */

import { localStorage } from '../utils/storage';

const STREAK_KEY = 'practiceStreak';
const FREEZE_LIMIT_PER_MONTH = 2;

export interface StreakDay {
  date: string; // YYYY-MM-DD
  state: 'done' | 'freeze' | 'miss' | 'future';
}

export interface StreakInfo {
  current: number;
  best: number;
  freezesUsedThisMonth: number;
  freezeLimit: number;
  freezeJustUsed: boolean;
  last7: StreakDay[];
}

interface StreakData {
  days: string[]; // YYYY-MM-DD, days with completed practice
  frozenDays: string[]; // YYYY-MM-DD, days bridged by a freeze
  freezesUsed: Record<string, number>; // 'YYYY-MM' -> count
  best: number;
}

const toDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const monthKey = (dateKey: string): string => dateKey.slice(0, 7);

const addDays = (dateKey: string, days: number): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
};

const load = (): StreakData => {
  const raw = localStorage.getItem(STREAK_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      return {
        days: Array.isArray(parsed.days) ? parsed.days : [],
        frozenDays: Array.isArray(parsed.frozenDays) ? parsed.frozenDays : [],
        freezesUsed: parsed.freezesUsed || {},
        best: typeof parsed.best === 'number' ? parsed.best : 0,
      };
    } catch {
      // corrupt data — fall through to fresh state
    }
  }
  return { days: [], frozenDays: [], freezesUsed: {}, best: 0 };
};

const save = (data: StreakData): void => {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data));
};

/**
 * Walk backwards from today (or yesterday when today isn't done yet — the
 * streak isn't broken until the day is over), counting done/frozen days.
 * When `apply` is true, gap days consume a freeze and the applied freeze
 * bookkeeping is returned so the caller can persist it.
 */
const walk = (
  data: StreakData,
  today: string,
  apply: boolean,
): {
  current: number;
  freezeJustUsed: boolean;
  appliedFreezeDates: string[];
  freezesUsed: Record<string, number>;
} => {
  const done = new Set(data.days);
  const frozen = new Set(data.frozenDays);
  const freezesUsed = { ...data.freezesUsed };
  const appliedFreezeDates: string[] = [];
  const oldestDone = data.days.length
    ? data.days.reduce((a, b) => (a < b ? a : b))
    : null;

  let cursor = done.has(today) ? today : addDays(today, -1);
  let current = 0;
  let freezeJustUsed = false;

  while (true) {
    if (done.has(cursor)) {
      current += 1;
      cursor = addDays(cursor, -1);
      continue;
    }
    if (frozen.has(cursor)) {
      current += 1;
      freezeJustUsed = true;
      cursor = addDays(cursor, -1);
      continue;
    }

    // A gap only consumes a freeze when it connects to a real done day
    // behind it — never into the empty past.
    const connectsToDone = oldestDone !== null && cursor > oldestDone;
    const mk = monthKey(cursor);
    const used = freezesUsed[mk] || 0;
    if (apply && connectsToDone && used < FREEZE_LIMIT_PER_MONTH) {
      freezesUsed[mk] = used + 1;
      appliedFreezeDates.push(cursor);
      current += 1;
      freezeJustUsed = true;
      cursor = addDays(cursor, -1);
      continue;
    }
    break;
  }

  return { current, freezeJustUsed, appliedFreezeDates, freezesUsed };
};

const buildLast7 = (
  data: StreakData,
  today: string,
): StreakDay[] => {
  const done = new Set(data.days);
  const frozen = new Set(data.frozenDays);
  const result: StreakDay[] = [];

  for (let i = 6; i >= 0; i--) {
    const key = addDays(today, -i);
    if (done.has(key)) {
      result.push({ date: key, state: 'done' });
    } else if (frozen.has(key)) {
      result.push({ date: key, state: 'freeze' });
    } else if (i === 0) {
      result.push({ date: key, state: 'future' }); // today not done yet
    } else {
      result.push({ date: key, state: 'miss' });
    }
  }

  return result;
};

export const streakService = {
  recordSessionComplete: (): StreakInfo => {
    const data = load();
    const today = toDateKey(new Date());

    if (!data.days.includes(today)) {
      data.days.push(today);
    }

    const { appliedFreezeDates, freezesUsed } = walk(data, today, true);
    data.frozenDays = Array.from(
      new Set([...data.frozenDays, ...appliedFreezeDates]),
    );
    data.freezesUsed = freezesUsed;

    const { current } = walk(data, today, false);
    if (current > data.best) {
      data.best = current;
    }

    save(data);
    return streakService.getStreak();
  },

  getStreak: (): StreakInfo => {
    const data = load();
    const today = toDateKey(new Date());
    const { current, freezeJustUsed } = walk(data, today, false);
    const freezesUsedThisMonth = data.freezesUsed[monthKey(today)] || 0;

    return {
      current,
      best: data.best,
      freezesUsedThisMonth,
      freezeLimit: FREEZE_LIMIT_PER_MONTH,
      freezeJustUsed,
      last7: buildLast7(data, today),
    };
  },

  clearAllData: (): void => {
    localStorage.removeItem(STREAK_KEY);
  },
};
