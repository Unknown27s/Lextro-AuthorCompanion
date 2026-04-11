import React from 'react';

interface BottomNavProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
    const tabs = [
        { id: 'home', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { id: 'saved', label: 'Saved', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
        { id: 'editor', label: 'Editor', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
        { id: 'practice', label: 'Practice', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-card-bg border-t border-warm-gray-dark safe-area-bottom z-50 shadow-lg">
            <div className="flex items-center justify-around h-20 sm:h-24 w-full px-1 sm:px-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex flex-col items-center justify-center gap-1 px-2 sm:px-3 py-2.5 sm:py-3 flex-1 transition-all duration-200 rounded-lg ${activeTab === tab.id
                            ? 'text-accent-teal bg-accent-teal/5 scale-105'
                            : 'text-text-muted hover:text-text-secondary hover:bg-warm-gray/50'
                            }`}
                        aria-label={tab.label}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                        <svg
                            className={`transition-all duration-200 ${activeTab === tab.id ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-5 h-5 sm:w-6 sm:h-6'}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === tab.id ? 2.5 : 2} d={tab.icon} />
                        </svg>
                        <span className={`text-xs font-semibold transition-all duration-200 ${activeTab === tab.id ? 'text-accent-teal scale-110' : ''}`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>
        </nav>
    );
}
