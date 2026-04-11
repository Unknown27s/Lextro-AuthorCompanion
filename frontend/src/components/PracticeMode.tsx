import React, { useState } from 'react';
import { ChevronRight, SkipForward } from 'lucide-react';
import { spacedRepetitionService, StudyItem, ReviewSession, ReviewResult } from '../services/spacedRepetitionService';

interface PracticeModeProps {
    mode: 'quick' | 'standard' | 'focused';
    onComplete: (session: ReviewSession) => void;
    onClose: () => void;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({ mode, onComplete, onClose }) => {
    const [studyQueue] = useState<StudyItem[]>(() => spacedRepetitionService.getStudyQueue(mode));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userAnswer, setUserAnswer] = useState('');
    const [showHints, setShowHints] = useState(false);
    const [hintLevel, setHintLevel] = useState(0);
    const [sessionResults, setSessionResults] = useState<ReviewResult[]>([]);
    const [isCompleted, setIsCompleted] = useState(false);
    const [loading] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [itemStartTime, setItemStartTime] = useState(Date.now());
    const [startTime] = useState(Date.now());
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string; hints: string[] }>({ type: null, message: '', hints: [] });

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-xl p-8 text-center">
                    <div className="animate-spin h-8 w-8 border-4 border-accent-teal border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="font-inter text-warm-charcoal">Loading study queue...</p>
                </div>
            </div>
        );
    }

    if (studyQueue.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl p-8 text-center max-w-md w-full">
                    <div className="text-4xl mb-4">📚</div>
                    <h3 className="font-serif text-xl text-text-primary mb-3">No words to review today</h3>
                    <p className="text-text-muted text-sm mb-4">
                        Add some words first and come back tomorrow. Each word needs time between reviews.
                    </p>
                    <p className="text-text-muted text-xs mb-6 bg-warm-gray p-3 rounded-lg">
                        💡 Tip: Save words from the Home tab to start practicing
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full bg-accent-teal text-white py-3 rounded-lg font-medium hover:bg-accent-teal-dark transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    if (isCompleted) {
        const correctCount = sessionResults.filter((r) => r.quality >= 3).length;
        const accuracy = Math.round((correctCount / sessionResults.length) * 100);

        return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl p-8 max-w-md w-full">
                    <h3 className="font-crimson text-2xl text-warm-charcoal mb-4">Session Complete!</h3>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                            <div className="font-crimson text-3xl text-green-700 font-semibold">{correctCount}</div>
                            <div className="text-xs text-green-700 font-inter">Correct</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-4 text-center">
                            <div className="font-crimson text-3xl text-amber-700 font-semibold">{accuracy}%</div>
                            <div className="text-xs text-amber-700 font-inter">Accuracy</div>
                        </div>
                    </div>

                    {/* Missed Words */}
                    {sessionResults.some((r) => r.quality < 3) && (
                        <div className="mb-6">
                            <h4 className="font-inter font-medium text-warm-charcoal mb-2">Review these words:</h4>
                            <div className="space-y-1">
                                {sessionResults
                                    .filter((r) => r.quality < 3)
                                    .map((result) => (
                                        <div key={result.studyItemId} className="text-sm font-inter text-warm-taupe">
                                            • {result.word}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="w-full bg-accent-teal text-white py-3 rounded-lg font-inter font-medium hover:bg-opacity-90"
                    >
                        Done
                    </button>
                </div>
            </div>
        );
    }

    const currentItem = studyQueue[currentIndex];

    // Generate hints
    const hints = [
        `Definition: ${currentItem.word} is a(n) ${currentItem.difficulty} word`,
        `First letter: ${currentItem.word.charAt(0).toUpperCase()}...`,
        `Length: ${currentItem.word.length} characters`,
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const isCorrect = userAnswer.toLowerCase().trim() === currentItem.word.toLowerCase().trim();
        const quality = isCorrect ? 5 : attempts >= 2 ? 1 : 3;

        const result: ReviewResult = {
            studyItemId: currentItem.id,
            word: currentItem.word,
            quality,
            timeSpent: Date.now() - itemStartTime,
            attempts: attempts + 1,
            userAnswer,
            correctAnswer: currentItem.word,
        };

        setSessionResults([...sessionResults, result]);
        spacedRepetitionService.recordReview(currentItem.id, quality, result.timeSpent, result.attempts);

        if (currentIndex + 1 >= studyQueue.length) {
            const session: ReviewSession = {
                id: `session_${Date.now()}`,
                userId: 'local_user',
                startTime,
                endTime: Date.now(),
                mode,
                totalQuestions: sessionResults.length + 1,
                correctAnswers: sessionResults.filter((r) => r.quality >= 3).length + (isCorrect ? 1 : 0),
                results: [...sessionResults, result],
                duration: Date.now() - startTime,
            };
            spacedRepetitionService.saveReviewSession(session);
            onComplete(session);
            setIsCompleted(true);
        } else {
            setCurrentIndex(currentIndex + 1);
            setUserAnswer('');
            setFeedback({ type: null, message: '', hints: [] });
            setShowHints(false);
            setHintLevel(0);
            setAttempts(0);
            setItemStartTime(Date.now());
        }
    };

    const handleRevealHint = () => {
        setShowHints(true);
        setHintLevel(Math.min(hintLevel + 1, hints.length - 1));
    };

    const handleSkip = () => {
        const result: ReviewResult = {
            studyItemId: currentItem.id,
            word: currentItem.word,
            quality: 0, // Failed - skipped
            timeSpent: Date.now() - itemStartTime,
            attempts,
            userAnswer: '',
            correctAnswer: currentItem.word,
        };

        setSessionResults([...sessionResults, result]);
        spacedRepetitionService.recordReview(currentItem.id, 0, result.timeSpent, result.attempts);

        if (currentIndex + 1 >= studyQueue.length) {
            const session: ReviewSession = {
                id: `session_${Date.now()}`,
                userId: 'local_user',
                startTime,
                endTime: Date.now(),
                mode,
                totalQuestions: sessionResults.length + 1,
                correctAnswers: sessionResults.filter((r) => r.quality >= 3).length,
                results: [...sessionResults, result],
                duration: Date.now() - startTime,
            };
            spacedRepetitionService.saveReviewSession(session);
            onComplete(session);
            setIsCompleted(true);
        } else {
            setCurrentIndex(currentIndex + 1);
            setUserAnswer('');
            setFeedback({ type: null, message: '', hints: [] });
            setShowHints(false);
            setHintLevel(0);
            setAttempts(0);
            setItemStartTime(Date.now());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-3 overflow-y-auto">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[95vh] overflow-y-auto flex flex-col my-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-accent-teal to-accent-teal-dark text-white px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
                    <div className="flex-1">
                        <h3 className="font-serif text-sm sm:text-base font-semibold">
                            {mode === 'quick' ? '⚡ Quick' : mode === 'standard' ? '📚 Standard' : '🎯 Focused'}
                        </h3>
                        <p className="text-xs text-white/80">
                            {currentIndex + 1} of {studyQueue.length}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white text-xl p-1"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-3 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto">
                    {/* Progress Bar */}
                    <div className="w-full bg-warm-gray rounded-full h-2">
                        <div
                            className="bg-accent-teal h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentIndex + 1) / studyQueue.length) * 100}%` }}
                        ></div>
                    </div>

                    {/* Word Card */}
                    <div className="bg-gradient-to-br from-accent-teal/10 to-accent-teal/5 rounded-card p-3 sm:p-4 text-center">
                        <p className="text-xs text-text-muted font-semibold uppercase mb-2">Word #{currentIndex + 1}</p>
                        <h2 className="font-serif text-2xl sm:text-3xl text-text-primary font-bold mb-2 break-words">{currentItem.word}</h2>
                        <span className="inline-block text-xs font-semibold px-3 py-1 bg-accent-teal/20 text-accent-teal rounded-full">
                            {currentItem.difficulty}
                        </span>
                    </div>

                    {/* Question */}
                    <div className="bg-white border border-warm-gray-dark rounded-card p-3 sm:p-4">
                        <p className="text-xs text-text-muted font-semibold uppercase mb-3">Question</p>
                        <p className="text-text-primary font-medium text-sm">What does <strong>{currentItem.word}</strong> mean?</p>
                    </div>

                    {/* Answer Form */}
                    <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-3">
                        <div>
                            <input
                                type="text"
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                placeholder="Type your answer..."
                                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-warm-gray-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-teal/50"
                                autoFocus
                            />
                        </div>

                        {/* Feedback */}
                        {feedback.type && (
                            <div
                                className={`p-2.5 sm:p-3 rounded-lg text-sm font-medium ${feedback.type === 'success'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                    }`}
                            >
                                {feedback.type === 'success' ? '✓ Correct!' : '✗ Not quite right'}
                            </div>
                        )}

                        {/* Hints */}
                        {showHints && hintLevel > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 sm:p-3">
                                <p className="text-xs text-amber-900 font-semibold mb-1">Hint {hintLevel}:</p>
                                <p className="text-xs text-amber-800 break-words">{hints[hintLevel - 1]}</p>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="submit"
                                disabled={!userAnswer.trim()}
                                className="bg-accent-teal text-white py-2.5 rounded-lg font-medium text-sm sm:text-base hover:bg-accent-teal-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
                            >
                                Submit
                            </button>
                            <button
                                type="button"
                                onClick={handleRevealHint}
                                className="bg-warm-gray text-text-secondary py-2.5 rounded-lg font-medium text-sm sm:text-base hover:bg-warm-gray-dark transition-colors touch-target"
                            >
                                💡 Hint
                            </button>
                        </div>
                    </form>

                    {/* Skip Button */}
                    <button
                        onClick={handleSkip}
                        className="w-full text-accent-teal text-sm font-medium py-2.5 hover:bg-warm-gray/50 rounded-lg transition-colors touch-target"
                    >
                        Skip →
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PracticeMode;
