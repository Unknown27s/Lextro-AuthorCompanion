/**
 * Unit tests for the SM-2 spaced repetition scheduler.
 *
 * The scheduler is pure logic over the localStorage-compatible storage layer,
 * so it is fully testable with fake timers and the AsyncStorage mock.
 */

import { spacedRepetitionService } from '../spacedRepetitionService';
import { localStorage } from '../../utils/storage';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Fixed "now" so every Date.now() in the service is deterministic. */
const NOW = new Date('2026-01-01T00:00:00.000Z').getTime();

describe('spacedRepetitionService — addToStudyQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a fresh item with SM-2 defaults', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'ethereal');

    expect(item.vocabId).toBe('vocab_1');
    expect(item.word).toBe('ethereal');
    expect(item.interval).toBe(1);
    expect(item.easeFactor).toBe(2.5);
    expect(item.repetitions).toBe(0);
    expect(item.nextReview).toBe(NOW);
    expect(item.lastReviewDate).toBe(NOW);
    expect(item.difficulty).toBe('medium');
    expect(item.quality).toBe(0);
    expect(item.correctStreak).toBe(0);
  });

  it('respects a custom difficulty', () => {
    const item = spacedRepetitionService.addToStudyQueue(
      'vocab_2',
      'lucid',
      'hard',
    );
    expect(item.difficulty).toBe('hard');
  });

  it('persists the item to the queue', () => {
    spacedRepetitionService.addToStudyQueue('vocab_1', 'ethereal');
    const queue = spacedRepetitionService.getStudyQueue();
    expect(queue.length).toBe(1);
  });
});

describe('spacedRepetitionService — recordReview (SM-2 math)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throws on out-of-range quality', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'word');
    expect(() =>
      spacedRepetitionService.recordReview(item.id, -1, 5000, 1),
    ).toThrow('Quality must be 0-5');
    expect(() =>
      spacedRepetitionService.recordReview(item.id, 6, 5000, 1),
    ).toThrow('Quality must be 0-5');
  });

  it('throws for an unknown study item', () => {
    expect(() =>
      spacedRepetitionService.recordReview('study_missing', 5, 5000, 1),
    ).toThrow('Study item not found');
  });

  it('quality < 3 resets interval and decrements repetitions', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'word');

    // First review fails: repetitions 0 -> 1 -> back to 0
    const updated = spacedRepetitionService.recordReview(item.id, 2, 5000, 2);

    expect(updated.interval).toBe(1);
    expect(updated.repetitions).toBe(0);
    expect(updated.correctStreak).toBe(0);
    expect(updated.easeFactor).toBeCloseTo(2.3); // 2.5 - 0.2
  });

  it('never lets easeFactor fall below 1.3', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'word');
    // Force a very low ease factor by repeatedly failing
    let current = item;
    for (let i = 0; i < 20; i++) {
      current = spacedRepetitionService.recordReview(current.id, 0, 1000, 1);
    }
    expect(current.easeFactor).toBe(1.3);
  });

  it('quality >= 3 follows SM-2 interval progression 1 -> 3 -> interval*EF', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'word');

    // Review 1 (reps 1): interval 1, EF 2.5 + 0.1 = 2.6
    let current = spacedRepetitionService.recordReview(item.id, 5, 1000, 1);
    expect(current.repetitions).toBe(1);
    expect(current.interval).toBe(1);
    expect(current.easeFactor).toBeCloseTo(2.6);

    // Review 2 (reps 2): interval 3, EF 2.6 + 0.1 = 2.7
    current = spacedRepetitionService.recordReview(item.id, 5, 1000, 1);
    expect(current.repetitions).toBe(2);
    expect(current.interval).toBe(3);
    expect(current.easeFactor).toBeCloseTo(2.7);

    // Review 3 (reps 3): interval = round(3 * 2.7) = 8, EF 2.8
    current = spacedRepetitionService.recordReview(item.id, 5, 1000, 1);
    expect(current.repetitions).toBe(3);
    expect(current.interval).toBe(8);
    expect(current.easeFactor).toBeCloseTo(2.8);

    // Review 4 (reps 4): interval = round(8 * 2.8) = 22, EF 2.9
    current = spacedRepetitionService.recordReview(item.id, 5, 1000, 1);
    expect(current.interval).toBe(22);
    expect(current.easeFactor).toBeCloseTo(2.9);
  });

  it('applies the correct ease-factor delta per quality', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'word');

    // quality 4: delta = 0.1 - 1*(0.08+0.02) = 0.0 -> EF stays 2.5
    let current = spacedRepetitionService.recordReview(item.id, 4, 1000, 1);
    expect(current.easeFactor).toBeCloseTo(2.5);

    // quality 3: delta = 0.1 - 2*(0.08+0.04) = -0.14 -> EF 2.36
    current = spacedRepetitionService.recordReview(item.id, 3, 1000, 1);
    expect(current.easeFactor).toBeCloseTo(2.36);
  });

  it('schedules nextReview as now + interval days', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'word');
    const updated = spacedRepetitionService.recordReview(item.id, 5, 1000, 1);
    // reps 1 -> interval 1 day
    expect(updated.nextReview).toBe(NOW + DAY_MS);
  });

  it('increments correctStreak on quality >= 3 and resets on < 3', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'word');

    let current = spacedRepetitionService.recordReview(item.id, 4, 1000, 1);
    expect(current.correctStreak).toBe(1);

    current = spacedRepetitionService.recordReview(item.id, 5, 1000, 1);
    expect(current.correctStreak).toBe(2);

    current = spacedRepetitionService.recordReview(item.id, 1, 1000, 1);
    expect(current.correctStreak).toBe(0);
  });
});

describe('spacedRepetitionService — getStudyQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns only due items, sorted by nextReview ascending', () => {
    const a = spacedRepetitionService.addToStudyQueue('vocab_1', 'alpha');
    const b = spacedRepetitionService.addToStudyQueue('vocab_2', 'bravo');
    const c = spacedRepetitionService.addToStudyQueue('vocab_3', 'charlie');

    // a and c are due now; b is scheduled 5 days out (not due)
    spacedRepetitionService.recordReview(b.id, 5, 1000, 1); // nextReview = +1 day
    spacedRepetitionService.recordReview(b.id, 5, 1000, 1); // nextReview = +3 days
    spacedRepetitionService.recordReview(b.id, 5, 1000, 1); // nextReview = +8 days
    void a;
    void c;

    const due = spacedRepetitionService.getStudyQueue('standard');
    expect(due.map((i) => i.id)).toContain(a.id);
    expect(due.map((i) => i.id)).toContain(c.id);
    expect(due.map((i) => i.id)).not.toContain(b.id);

    // sorted by nextReview asc
    const nextReviews = due.map((i) => i.nextReview);
    const sorted = [...nextReviews].sort((x, y) => x - y);
    expect(nextReviews).toEqual(sorted);
  });

  it('caps the queue at the mode limit (quick=5, standard=10)', () => {
    for (let i = 0; i < 12; i++) {
      spacedRepetitionService.addToStudyQueue(`vocab_${i}`, `word_${i}`);
    }
    expect(spacedRepetitionService.getStudyQueue('quick').length).toBe(5);
    expect(spacedRepetitionService.getStudyQueue('standard').length).toBe(10);
  });

  it('focused mode prioritizes hard items when available', () => {
    // One hard word and many medium words, all due
    spacedRepetitionService.addToStudyQueue('vocab_hard', 'hardword', 'hard');
    for (let i = 0; i < 10; i++) {
      spacedRepetitionService.addToStudyQueue(`vocab_${i}`, `word_${i}`);
    }

    const focused = spacedRepetitionService.getStudyQueue('focused');
    expect(focused.length).toBe(5);
    expect(focused[0].difficulty).toBe('hard');
  });

  it('focused mode falls back to due items when no hard items exist', () => {
    for (let i = 0; i < 8; i++) {
      spacedRepetitionService.addToStudyQueue(`vocab_${i}`, `word_${i}`);
    }
    const focused = spacedRepetitionService.getStudyQueue('focused');
    expect(focused.length).toBe(5);
    expect(focused.every((i) => i.difficulty === 'medium')).toBe(true);
  });
});

describe('spacedRepetitionService — statistics', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports empty stats with no data', () => {
    const stats = spacedRepetitionService.getStatistics();
    expect(stats.totalItems).toBe(0);
    expect(stats.dueToday).toBe(0);
    expect(stats.mastered).toBe(0);
    expect(stats.accuracy).toBe(0);
    expect(stats.totalSessions).toBe(0);
  });

  it('counts mastered items (reps >= 3 and quality >= 4)', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'word');
    spacedRepetitionService.recordReview(item.id, 5, 1000, 1);
    spacedRepetitionService.recordReview(item.id, 5, 1000, 1);
    spacedRepetitionService.recordReview(item.id, 5, 1000, 1);

    const stats = spacedRepetitionService.getStatistics();
    expect(stats.mastered).toBe(1);
    expect(stats.totalItems).toBe(1);
  });

  it('does not count items with low final quality as mastered', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'word');
    spacedRepetitionService.recordReview(item.id, 5, 1000, 1);
    spacedRepetitionService.recordReview(item.id, 5, 1000, 1);
    spacedRepetitionService.recordReview(item.id, 2, 1000, 1); // quality < 4

    const stats = spacedRepetitionService.getStatistics();
    expect(stats.mastered).toBe(0);
  });

  it('computes accuracy from saved review sessions', () => {
    spacedRepetitionService.saveReviewSession({
      id: 's1',
      userId: 'u1',
      startTime: NOW - 10 * 60 * 1000,
      endTime: NOW - 5 * 60 * 1000,
      mode: 'standard',
      totalQuestions: 4,
      correctAnswers: 3,
      results: [],
      duration: 0,
    });

    const stats = spacedRepetitionService.getStatistics();
    expect(stats.accuracy).toBe(75);
    expect(stats.totalSessions).toBe(1);
    expect(stats.avgTimePerWord).toBe(75000); // 5min = 300000ms / 4
  });
});

describe('spacedRepetitionService — cleanup & performance', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('removeFromQueue deletes a single item', () => {
    const a = spacedRepetitionService.addToStudyQueue('vocab_1', 'alpha');
    spacedRepetitionService.addToStudyQueue('vocab_2', 'bravo');

    spacedRepetitionService.removeFromQueue(a.id);
    const queue = spacedRepetitionService.getStudyQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].word).toBe('bravo');
  });

  it('clearAllData wipes the entire study state', () => {
    const item = spacedRepetitionService.addToStudyQueue('vocab_1', 'word');
    spacedRepetitionService.recordReview(item.id, 5, 1000, 1);

    spacedRepetitionService.clearAllData();
    expect(spacedRepetitionService.getStudyQueue().length).toBe(0);

    const stats = spacedRepetitionService.getStatistics();
    expect(stats.totalItems).toBe(0);
    expect(stats.totalSessions).toBe(0);
  });

  it('getPerformanceTrend buckets sessions by day', () => {
    const start = NOW - 60 * 1000;
    spacedRepetitionService.saveReviewSession({
      id: 's1',
      userId: 'u1',
      startTime: start,
      endTime: start + 60 * 1000,
      mode: 'quick',
      totalQuestions: 2,
      correctAnswers: 2,
      results: [],
      duration: 0,
    });

    const trend = spacedRepetitionService.getPerformanceTrend();
    expect(trend.length).toBe(1);
    expect(trend[0].accuracy).toBe(100);
    expect(trend[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
