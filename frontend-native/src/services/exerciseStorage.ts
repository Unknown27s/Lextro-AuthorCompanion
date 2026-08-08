/**
 * Exercise Storage
 *
 * Ported from web version — only change is importing the localStorage polyfill.
 */

import { WritingExercise } from './exerciseGenerator';
import { localStorage } from '../utils/storage';

export interface ExerciseProgress {
  exercise_id: string;
  difficulty: 'easy' | 'medium' | 'hard';
  user_answers: { [key: number]: string };
  score: { correct: number; total: number } | null;
  completed_at: string | null;
  time_spent: number;
}

export const exerciseStorageApi = {
  saveProgress: (
    exercise: WritingExercise,
    progress: ExerciseProgress,
  ): void => {
    const exercises = exerciseStorageApi.getProgressList();
    const exists = exercises.find((e) => e.exercise_id === exercise.id);

    if (exists) {
      Object.assign(exists, progress);
    } else {
      exercises.push(progress);
    }

    localStorage.setItem('exerciseProgress', JSON.stringify(exercises));
  },

  getProgressList: (): ExerciseProgress[] => {
    const data = localStorage.getItem('exerciseProgress');
    return data ? JSON.parse(data) : [];
  },

  getProgress: (exerciseId: string): ExerciseProgress | undefined => {
    return exerciseStorageApi
      .getProgressList()
      .find((e) => e.exercise_id === exerciseId);
  },

  getStats: (): {
    totalExercises: number;
    completedExercises: number;
    averageScore: number;
    difficultyStats: {
      easy: { completed: number; average: number };
      medium: { completed: number; average: number };
      hard: { completed: number; average: number };
    };
  } => {
    const exercises = exerciseStorageApi.getProgressList();
    const completed = exercises.filter((e) => e.score !== null);

    const stats = {
      easy: { completed: 0, total: 0, scores: [] as number[] },
      medium: { completed: 0, total: 0, scores: [] as number[] },
      hard: { completed: 0, total: 0, scores: [] as number[] },
    };

    exercises.forEach((ex) => {
      const key = ex.difficulty as keyof typeof stats;
      stats[key].total++;

      if (ex.score) {
        stats[key].completed++;
        const percentage = (ex.score.correct / ex.score.total) * 100;
        stats[key].scores.push(percentage);
      }
    });

    const allScores = [
      ...stats.easy.scores,
      ...stats.medium.scores,
      ...stats.hard.scores,
    ];
    const averageScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;

    return {
      totalExercises: exercises.length,
      completedExercises: completed.length,
      averageScore,
      difficultyStats: {
        easy: {
          completed: stats.easy.completed,
          average:
            stats.easy.scores.length > 0
              ? Math.round(
                  stats.easy.scores.reduce((a, b) => a + b, 0) /
                    stats.easy.scores.length,
                )
              : 0,
        },
        medium: {
          completed: stats.medium.completed,
          average:
            stats.medium.scores.length > 0
              ? Math.round(
                  stats.medium.scores.reduce((a, b) => a + b, 0) /
                    stats.medium.scores.length,
                )
              : 0,
        },
        hard: {
          completed: stats.hard.completed,
          average:
            stats.hard.scores.length > 0
              ? Math.round(
                  stats.hard.scores.reduce((a, b) => a + b, 0) /
                    stats.hard.scores.length,
                )
              : 0,
        },
      },
    };
  },

  clearProgress: (): void => {
    localStorage.removeItem('exerciseProgress');
  },
};
