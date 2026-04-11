import React, { useState, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import VocabFeed from './components/VocabFeed';
import WordClassifier from './components/WordClassifier';
import SettingsModal from './components/SettingsModal';
import PracticeModal from './components/PracticeModal';
import WordSearch from './components/WordSearch';
import WritingPractice from './components/WritingPractice';
import SingleWordView from './components/SingleWordView';
import WordDetailsModal from './components/WordDetailsModal';
import { spacedRepetitionService, ReviewSession } from './services/spacedRepetitionService';
import { responsiveService } from './services/responsiveService';
import { storageService } from './services/storageService';
import './styles/index.css';

function AppContent() {
    const [isPracticeOpen, setIsPracticeOpen] = useState(false);
    const [isUseInDocOpen, setIsUseInDocOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [selectedVocabId, setSelectedVocabId] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [activeTab, setActiveTab] = useState('home');
    const [showSearch, setShowSearch] = useState(false);
    const [activePracticeMode, setActivePracticeMode] = useState<'quick' | 'standard' | 'focused' | null>(null);
    const [stats, setStats] = useState(spacedRepetitionService.getStatistics());
    const [isSingleWordViewOpen, setIsSingleWordViewOpen] = useState(false);

    useEffect(() => {
        // Initialize PWA service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js')
                .then(() => console.log('✅ Service Worker registered'))
                .catch((err) => console.log('Service Worker registration failed:', err));
        }
    }, []);

    const handlePracticeClick = (vocabId: string) => {
        setSelectedVocabId(vocabId);
        setIsPracticeOpen(true);
    };

    const handleUseInDocumentClick = (vocabId: string) => {
        setSelectedVocabId(vocabId);
        setIsUseInDocOpen(true);
    };

    const handleWordAdded = () => {
        setRefreshKey(prev => prev + 1);
        setShowSearch(false);
    };

    const handlePracticeComplete = (session: ReviewSession) => {
        console.log('Practice session complete:', session);
        setStats(spacedRepetitionService.getStatistics());
        setActivePracticeMode(null);
    };

    return (
        <div className="min-h-screen bg-warm-white flex flex-col safe-area">
            <Header
                onSearchClick={() => setShowSearch(!showSearch)}
                onSettingsClick={() => setIsSettingsOpen(true)}
            />

            <main className="flex-1 overflow-y-auto pb-28 w-full px-0">
                {showSearch && (
                    <div className="px-4 pt-2 pb-3 sm:pt-4 sm:pb-4 animate-fade-up">
                        <WordSearch
                            onWordAdded={handleWordAdded}
                            onClose={() => setShowSearch(false)}
                            onPractice={handlePracticeClick}
                            onUseInDocument={handleUseInDocumentClick}
                        />
                    </div>
                )}

                {activeTab === 'home' && (
                    <div className="pt-0">
                        <VocabFeed
                            key={refreshKey}
                            onPractice={handlePracticeClick}
                            onUseInDocument={handleUseInDocumentClick}
                            onWordAdded={handleWordAdded}
                            showOnlySaved={true}
                            onOpenSingleWordView={() => setIsSingleWordViewOpen(true)}
                        />
                    </div>
                )}

                {activeTab === 'saved' && (
                    <div className="px-4 py-4">
                        <WordClassifier
                            key={refreshKey}
                            onOpenSingleWordView={() => setIsSingleWordViewOpen(true)}
                        />
                    </div>
                )}

                {activeTab === 'editor' && (
                    <div className="px-4 py-4">
                        <WritingPractice />
                    </div>
                )}

                {activeTab === 'practice' && (
                    <div className="px-4 py-4 space-y-3">
                        <div className="bg-gradient-to-br from-accent-teal/10 to-accent-teal/5 rounded-card p-4 border border-accent-teal/20">
                            <h3 className="font-serif text-lg text-text-primary mb-3">Today's Stats</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/50 rounded-lg p-3">
                                    <p className="text-xs text-text-muted font-semibold uppercase">Due Today</p>
                                    <p className="font-serif text-2xl text-accent-teal font-bold mt-1">{stats.dueToday}</p>
                                </div>
                                <div className="bg-white/50 rounded-lg p-3">
                                    <p className="text-xs text-text-muted font-semibold uppercase">Accuracy</p>
                                    <p className="font-serif text-2xl text-accent-teal font-bold mt-1">{stats.accuracy}%</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <button
                                onClick={() => setActivePracticeMode('quick')}
                                className="w-full bg-white border border-warm-gray-dark rounded-card p-4 text-left hover:border-accent-teal hover:bg-accent-teal/5 transition-all active:scale-95"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-serif text-base text-text-primary font-semibold mb-0.5">⚡ Quick Practice</h4>
                                        <p className="text-xs text-text-muted">5 words • 2-3 min</p>
                                    </div>
                                    <svg className="w-5 h-5 text-accent-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>

                            <button
                                onClick={() => setActivePracticeMode('standard')}
                                className="w-full bg-white border border-warm-gray-dark rounded-card p-4 text-left hover:border-accent-teal hover:bg-accent-teal/5 transition-all active:scale-95"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-serif text-base text-text-primary font-semibold mb-0.5">📚 Standard Practice</h4>
                                        <p className="text-xs text-text-muted">10 words • 10-15 min</p>
                                    </div>
                                    <svg className="w-5 h-5 text-accent-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>

                            <button
                                onClick={() => setActivePracticeMode('focused')}
                                className="w-full bg-white border border-warm-gray-dark rounded-card p-4 text-left hover:border-accent-teal hover:bg-accent-teal/5 transition-all active:scale-95"
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h4 className="font-serif text-base text-text-primary font-semibold mb-0.5">🎯 Focused Practice</h4>
                                        <p className="text-xs text-text-muted">5 hard words • 8-10 min</p>
                                    </div>
                                    <svg className="w-5 h-5 text-accent-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
            </main>

            <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

            <PracticeModal
                isOpen={isPracticeOpen}
                vocabId={selectedVocabId}
                onClose={() => setIsPracticeOpen(false)}
                onSubmit={(result) => console.log('Practice result:', result)}
            />

            <UseInDocumentOverlay
                isOpen={isUseInDocOpen}
                onClose={() => setIsUseInDocOpen(false)}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            <SingleWordView
                isOpen={isSingleWordViewOpen}
                onClose={() => setIsSingleWordViewOpen(false)}
            />

            {activePracticeMode && (
                <EnhancedPracticeMode
                    mode={activePracticeMode}
                    onComplete={handlePracticeComplete}
                    onClose={() => setActivePracticeMode(null)}
                />
            )}

            {/* Test button for single word view */}
            {activeTab === 'home' && (
                <button
                    onClick={() => setIsSingleWordViewOpen(true)}
                    className="fixed bottom-36 right-4 w-14 h-14 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-card-elevated transition-all duration-200 flex items-center justify-center z-40"
                    aria-label="View one by one"
                    title="View Words One by One"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>
            )}

            <button
                onClick={() => setShowSearch(!showSearch)}
                className="fixed bottom-24 right-4 w-14 h-14 bg-accent-teal hover:bg-accent-teal-dark text-white rounded-full shadow-card-elevated transition-all duration-200 flex items-center justify-center z-40"
                aria-label="Add custom word"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
            </button>
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
