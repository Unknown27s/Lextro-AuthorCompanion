import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import VocabFeed from './components/VocabFeed';
import WordClassifier from './components/WordClassifier';
import SettingsModal from './components/SettingsModal';
import PracticeModal from './components/PracticeModal';
import WritingPractice from './components/WritingPractice';
import WordDetailsModal from './components/WordDetailsModal';
import InlineWordSuggestion from './components/InlineWordSuggestion';
import { spacedRepetitionService, ReviewSession } from './services/spacedRepetitionService';
import { localStorageApi, VocabItem } from './api/client';
import './styles/index.css';

function AppContent() {
    const [isPracticeOpen, setIsPracticeOpen] = useState(false);
    const [selectedVocabId, setSelectedVocabId] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeTab, setActiveTab] = useState('home');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [activePracticeMode, setActivePracticeMode] = useState<'quick' | 'standard' | 'focused' | null>(null);
    const [stats, setStats] = useState(spacedRepetitionService.getStatistics());
    const [completedPractices, setCompletedPractices] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Initialize PWA service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then(() => console.log('✅ Service Worker registered'))
                .catch((err) => console.log('Service Worker registration failed:', err));
        }

        // Load completed practices
        const saved = localStorage.getItem('completedPractices');
        if (saved) {
            setCompletedPractices(new Set(JSON.parse(saved)));
        }
    }, []);

    const handlePracticeClick = (vocabId: string) => {
        setSelectedVocabId(vocabId);
        setIsPracticeOpen(true);
    };

    const handleWordAdded = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handlePracticeComplete = (session: ReviewSession) => {
        console.log('Practice session complete:', session);
        setStats(spacedRepetitionService.getStatistics());

        // Mark as completed
        const newCompleted = new Set(completedPractices);
        newCompleted.add(selectedVocabId);
        setCompletedPractices(newCompleted);
        localStorage.setItem('completedPractices', JSON.stringify(Array.from(newCompleted)));

        setActivePracticeMode(null);
    };

    const handleWordSave = (word: string) => {
        handleWordAdded();
    };

    return (
        <div className="min-h-screen bg-warm-white flex flex-col safe-area">
            <Header
                onSettingsClick={() => setIsSettingsOpen(true)}
            />

            <main className="flex-1 overflow-y-auto pb-28 w-full px-0">
                {/* Home Tab with Inline Word Suggestion */}
                {activeTab === 'home' && (
                    <div className="pt-0">
                        <div className="px-4 py-4 sticky top-0 bg-warm-white z-40 border-b border-warm-gray">
                            <InlineWordSuggestion
                                onWordSelect={(word, vocabItem) => {
                                    const wordId = `${word}-${word}`;
                                    localStorageApi.saveVocab(wordId, vocabItem, 'saved');
                                    handleWordSave(word);
                                }}
                                onSave={(word) => {
                                    handleWordSave(word);
                                }}
                                placeholder="🔍 Search words or add new..."
                            />
                        </div>
                        <VocabFeed
                            key={refreshKey}
                            onPractice={handlePracticeClick}
                            onUseInDocument={(word) => console.log('Use in document:', word)}
                            onWordAdded={handleWordAdded}
                            showOnlySaved={true}
                        />
                    </div>
                )}

                {/* Saved Tab */}
                {activeTab === 'saved' && (
                    <div className="px-4 py-4">
                        <WordClassifier
                            key={refreshKey}
                            onOpenSingleWordView={() => {}}
                        />
                    </div>
                )}

                {/* Writing Practice Tab */}
                {activeTab === 'editor' && (
                    <div className="px-4 py-4">
                        <WritingPractice />
                    </div>
                )}

                {/* Practice Tab with Completion Tracking */}
                {activeTab === 'practice' && (
                    <div className="px-4 py-4 space-y-3">
                        {/* Stats Card */}
                        <div className="bg-gradient-to-br from-accent-teal/10 to-accent-teal/5 rounded-card p-4 border border-accent-teal/20">
                            <h3 className="font-serif text-lg text-text-primary mb-3">Today's Stats</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white/50 rounded-lg p-3">
                                    <p className="text-xs text-text-muted font-semibold uppercase">Due</p>
                                    <p className="font-serif text-2xl text-accent-teal font-bold">{stats.dueToday}</p>
                                </div>
                                <div className="bg-white/50 rounded-lg p-3">
                                    <p className="text-xs text-text-muted font-semibold uppercase">Done</p>
                                    <p className="font-serif text-2xl text-green-600 font-bold">{completedPractices.size}</p>
                                </div>
                                <div className="bg-white/50 rounded-lg p-3">
                                    <p className="text-xs text-text-muted font-semibold uppercase">Accuracy</p>
                                    <p className="font-serif text-2xl text-accent-teal font-bold">{stats.accuracy}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Practice Modes */}
                        <div className="space-y-2">
                            {[
                                { mode: 'quick', icon: '⚡', title: 'Quick Practice', desc: '5 words • 2-3 min' },
                                { mode: 'standard', title: '📚 Standard Practice', desc: '10 words • 10-15 min', icon: '📚' },
                                { mode: 'focused', icon: '🎯', title: 'Focused Practice', desc: '20 words • 30+ min' }
                            ].map(({ mode, icon, title, desc }) => (
                                <button
                                    key={mode}
                                    onClick={() => setActivePracticeMode(mode as any)}
                                    className="w-full bg-white border border-warm-gray-dark rounded-card p-4 text-left hover:border-accent-teal hover:bg-accent-teal/5 transition-all active:scale-95"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-serif text-base text-text-primary font-semibold mb-0.5">
                                                {icon} {title}
                                            </h4>
                                            <p className="text-xs text-text-muted">{desc}</p>
                                        </div>
                                        <svg className="w-5 h-5 text-accent-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Completed Indicator */}
                        {completedPractices.size > 0 && (
                            <div className="text-center py-4 text-green-600 font-semibold">
                                ✓ {completedPractices.size} practice session(s) completed today!
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Modals */}
            <PracticeModal
                isOpen={isPracticeOpen}
                vocabId={selectedVocabId}
                onClose={() => setIsPracticeOpen(false)}
                onSubmit={handlePracticeComplete}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {activePracticeMode && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                        <h2 className="text-xl font-serif font-bold mb-2 capitalize">{activePracticeMode} Practice</h2>
                        <p className="text-gray-600 mb-4">
                            {activePracticeMode === 'quick' && 'Practice 5 words quickly'}
                            {activePracticeMode === 'standard' && 'Practice 10 words at your pace'}
                            {activePracticeMode === 'focused' && 'Deep focus on 20 words'}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActivePracticeMode(null)}
                                className="flex-1 px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setIsPracticeOpen(true);
                                    setActivePracticeMode(null);
                                }}
                                className="flex-1 px-4 py-2 bg-accent-teal text-white rounded hover:bg-accent-teal-dark"
                            >
                                Start ✓
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
}

function App() {
    return (
        <Provider store={store}>
            <AppContent />
        </Provider>
    );
}

export default App;
