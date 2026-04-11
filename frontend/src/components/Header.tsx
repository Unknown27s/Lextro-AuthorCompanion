import React from 'react';

interface HeaderProps {
    onSearchClick: () => void;
    onSettingsClick: () => void;
}

export default function Header({ onSearchClick, onSettingsClick }: HeaderProps) {
    return (
        <header className="sticky top-0 z-40 bg-warm-white backdrop-blur-sm border-b border-warm-gray-dark safe-area-top">
            <div className="flex items-center justify-between h-16 sm:h-20 px-4 sm:px-6 w-full">
                {/* Logo */}
                <div className="flex items-center space-x-2">
                    <h1 className="font-serif text-2xl sm:text-3xl text-text-primary font-semibold tracking-tight">Lextro</h1>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                    <button
                        onClick={onSearchClick}
                        className="p-2.5 active:bg-warm-gray hover:bg-warm-gray rounded-lg transition-colors touch-target"
                        aria-label="Search words"
                    >
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>

                    <button
                        onClick={onSettingsClick}
                        className="p-2.5 active:bg-warm-gray hover:bg-warm-gray rounded-lg transition-colors touch-target"
                        aria-label="Settings"
                    >
                        <svg className="w-6 h-6 sm:w-7 sm:h-7 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </div>
        </header>
    );
}
