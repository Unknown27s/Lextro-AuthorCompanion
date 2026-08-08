/**
 * Spaced Repetition Service (SM-2 Algorithm)
 *
 * Ported from web version — only change is importing the localStorage polyfill
 * instead of relying on the browser global. All SM-2 logic is identical.
 */

import { localStorage } from '../utils/storage';

export interface StudyItem {
  id: string;
  vocabId: string;
  word: string;
  interval: number; // days until next review
  easeFactor: number; // difficulty multiplier (starts at 2.5)
  repetitions: number; // number of times reviewed
  nextReview: number; // timestamp of next review
  lastReviewDate: number; // timestamp of last review
  difficulty: 'easy' | 'medium' | 'hard'; // word difficulty
  quality: number; // 0-5 rating from last review
  correctStreak: number; // consecutive correct answers
  totalAttempts: number; // total practice attempts
  correctAttempts: number; // total correct attempts
}

export interface ReviewSession {
  id: string;
  userId: string;
  startTime: number;
  endTime: number | null;
  mode: 'quick' | 'standard' | 'focused';
  totalQuestions: number;
  correctAnswers: number;
  results: ReviewResult[];
  duration: number; // milliseconds
}

export interface ReviewResult {
  studyItemId: string;
  word: string;
  quality: number; // 0-5: 0=blackout, 3=hard but correct, 5=perfect
  timeSpent: number; // milliseconds
  attempts: number;
  userAnswer: string;
  correctAnswer: string;
}

export interface Statistics {
  dueToday: number;
  totalItems: number;
  mastered: number;
  accuracy: number;
  totalSessions: number;
  lastSessionDate: number | null;
  streakDays: number;
  avgTimePerWord: number; // milliseconds
  improvementRate: number; // percentage change in accuracy
  estimatedMasteryDate: number | null;
}

const STUDY_QUEUE_KEY = 'studyQueue';
const REVIEW_SESSIONS_KEY = 'reviewSessions';
const STATS_CACHE_KEY = 'statsCache';

let idCounter = 0;
const nextId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${idCounter++}`;

export const spacedRepetitionService = {
  addToStudyQueue: (
    vocabId: string,
    word: string,
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  ): StudyItem => {
    const item: StudyItem = {
      id: nextId('study'),
      vocabId,
      word,
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: Date.now(),
      lastReviewDate: Date.now(),
      difficulty,
      quality: 0,
      correctStreak: 0,
      totalAttempts: 0,
      correctAttempts: 0,
    };

    const queue = getStudyQueue();
    queue.push(item);
    localStorage.setItem(STUDY_QUEUE_KEY, JSON.stringify(queue));

    return item;
  },

  getStudyQueue: (
    mode: 'quick' | 'standard' | 'focused' = 'standard',
  ): StudyItem[] => {
    const queue = getStudyQueue();
    const now = Date.now();

    const dueItems = queue.filter((item) => item.nextReview <= now);
    dueItems.sort((a, b) => a.nextReview - b.nextReview);

    const limits = { quick: 5, standard: 10, focused: 5 };
    let modeItems = dueItems.slice(0, limits[mode]);

    if (mode === 'focused') {
      const hardItems = dueItems
        .filter(
          (item) =>
            item.difficulty === 'hard' ||
            item.correctAttempts / Math.max(1, item.totalAttempts) < 0.6,
        )
        .slice(0, 5);
      modeItems = hardItems.length > 0 ? hardItems : modeItems;
    }

    return modeItems;
  },

  recordReview: (
    studyItemId: string,
    quality: number,
    timeSpent: number,
    attempts: number,
  ): StudyItem => {
    if (quality < 0 || quality > 5) {
      throw new Error('Quality must be 0-5');
    }

    const queue = getStudyQueue();
    const item = queue.find((i) => i.id === studyItemId);

    if (!item) {
      throw new Error('Study item not found');
    }

    item.totalAttempts += attempts;
    if (quality >= 3) {
      item.correctAttempts += 1;
      item.correctStreak += 1;
    } else {
      item.correctStreak = 0;
    }

    // SM-2 Algorithm
    item.quality = quality;
    item.lastReviewDate = Date.now();
    item.repetitions += 1;

    if (quality < 3) {
      item.interval = 1;
      item.repetitions = Math.max(0, item.repetitions - 1);
      item.easeFactor = Math.max(1.3, item.easeFactor - 0.2);
    } else {
      if (item.repetitions === 1) {
        item.interval = 1;
      } else if (item.repetitions === 2) {
        item.interval = 3;
      } else {
        item.interval = Math.round(item.interval * item.easeFactor);
      }

      const easeChange = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
      item.easeFactor = Math.max(1.3, item.easeFactor + easeChange);
    }

    item.nextReview = Date.now() + item.interval * 24 * 60 * 60 * 1000;

    const updated = queue.map((i) => (i.id === studyItemId ? item : i));
    localStorage.setItem(STUDY_QUEUE_KEY, JSON.stringify(updated));
    localStorage.removeItem(STATS_CACHE_KEY);

    return item;
  },

  saveReviewSession: (session: ReviewSession): void => {
    const sessions = localStorage.getItem(REVIEW_SESSIONS_KEY);
    const allSessions: ReviewSession[] = sessions ? JSON.parse(sessions) : [];

    session.duration = (session.endTime || Date.now()) - session.startTime;

    allSessions.push(session);
    localStorage.setItem(REVIEW_SESSIONS_KEY, JSON.stringify(allSessions));
    localStorage.removeItem(STATS_CACHE_KEY);
  },

  getStatistics: (): Statistics => {
    const cached = localStorage.getItem(STATS_CACHE_KEY);
    if (cached) {
      const cacheTime = JSON.parse(cached).timestamp;
      if (Date.now() - cacheTime < 60_000) {
        return JSON.parse(cached).data;
      }
    }

    const queue = getStudyQueue();
    const sessions = localStorage.getItem(REVIEW_SESSIONS_KEY);
    const allSessions: ReviewSession[] = sessions ? JSON.parse(sessions) : [];

    const now = Date.now();
    const dueToday = queue.filter((item) => item.nextReview <= now).length;
    const totalItems = queue.length;
    const mastered = queue.filter(
      (item) => item.repetitions >= 3 && item.quality >= 4,
    ).length;

    const totalReviewed = allSessions.reduce(
      (sum, s) => sum + s.totalQuestions,
      0,
    );
    const totalCorrect = allSessions.reduce(
      (sum, s) => sum + s.correctAnswers,
      0,
    );
    const accuracy =
      totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;

    const lastSessionDate =
      allSessions[allSessions.length - 1]?.endTime || null;
    const streakDays = lastSessionDate
      ? Math.floor((now - lastSessionDate) / (24 * 60 * 60 * 1000))
      : 0;

    const totalTime = allSessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0,
    );
    const avgTimePerWord =
      totalReviewed > 0 ? Math.round(totalTime / totalReviewed) : 0;

    let improvementRate = 0;
    if (allSessions.length >= 2) {
      const recentAccuracy =
        allSessions
          .slice(-5)
          .reduce((sum, s) => sum + s.correctAnswers / s.totalQuestions, 0) /
        Math.min(5, allSessions.length);
      const earlierAccuracy =
        allSessions
          .slice(0, 5)
          .reduce((sum, s) => sum + s.correctAnswers / s.totalQuestions, 0) /
        Math.min(5, allSessions.length);
      improvementRate = Math.round(
        ((recentAccuracy - earlierAccuracy) / earlierAccuracy) * 100,
      );
    }

    let estimatedMasteryDate: number | null = null;
    if (mastered < totalItems) {
      const unmasteredCount = totalItems - mastered;
      const avgDaysPerMastery =
        allSessions.length > 0
          ? Math.round(
              (now - allSessions[0].startTime) /
                (24 * 60 * 60 * 1000) /
                mastered,
            )
          : 7;
      estimatedMasteryDate =
        now + unmasteredCount * avgDaysPerMastery * 24 * 60 * 60 * 1000;
    }

    const stats: Statistics = {
      dueToday,
      totalItems,
      mastered,
      accuracy,
      totalSessions: allSessions.length,
      lastSessionDate,
      streakDays,
      avgTimePerWord,
      improvementRate,
      estimatedMasteryDate,
    };

    localStorage.setItem(
      STATS_CACHE_KEY,
      JSON.stringify({ data: stats, timestamp: now }),
    );

    return stats;
  },

  getPerformanceTrend: (): { date: string; accuracy: number }[] => {
    const sessions = localStorage.getItem(REVIEW_SESSIONS_KEY);
    const allSessions: ReviewSession[] = sessions ? JSON.parse(sessions) : [];

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentSessions = allSessions.filter(
      (s) => s.startTime >= sevenDaysAgo,
    );

    const byDay: { [key: string]: ReviewSession[] } = {};
    recentSessions.forEach((session) => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push(session);
    });

    return Object.entries(byDay)
      .map(([date, sessions]) => {
        const totalQuestions = sessions.reduce(
          (sum, s) => sum + s.totalQuestions,
          0,
        );
        const totalCorrect = sessions.reduce(
          (sum, s) => sum + s.correctAnswers,
          0,
        );
        return {
          date,
          accuracy:
            totalQuestions > 0
              ? Math.round((totalCorrect / totalQuestions) * 100)
              : 0,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  removeFromQueue: (studyItemId: string): void => {
    const queue = getStudyQueue();
    const filtered = queue.filter((i) => i.id !== studyItemId);
    localStorage.setItem(STUDY_QUEUE_KEY, JSON.stringify(filtered));
    localStorage.removeItem(STATS_CACHE_KEY);
  },

  clearAllData: (): void => {
    localStorage.removeItem(STUDY_QUEUE_KEY);
    localStorage.removeItem(REVIEW_SESSIONS_KEY);
    localStorage.removeItem(STATS_CACHE_KEY);
  },
};

const getStudyQueue = (): StudyItem[] => {
  const stored = localStorage.getItem(STUDY_QUEUE_KEY);
  return stored ? JSON.parse(stored) : [];
};
