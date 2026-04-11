import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { localStorageApi } from '../api/client';
import { notificationService } from '../services/notificationService';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [wordStyle, setWordStyle] = useState<'serif' | 'sans-serif'>(() =>
        localStorage.getItem('wordStyle') as 'serif' | 'sans-serif' || 'serif'
    );
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);
    const [dailyWordTime, setDailyWordTime] = useState('08:00');
    const [practiceRemindersEnabled, setPracticeRemindersEnabled] = useState(false);
    const username = authService.getCurrentUser()?.name || '';

    useEffect(() => {
        // Load notification settings
        const settings = notificationService.getSettings();
        setNotificationsEnabled(settings.dailyWordEnabled);
        setPracticeRemindersEnabled(settings.practiceRemindersEnabled);
        const time = `${String(settings.dailyWordTime.hour).padStart(2, '0')}:${String(settings.dailyWordTime.minute).padStart(2, '0')}`;
        setDailyWordTime(time);
    }, [isOpen]);

    const handleWordStyleChange = (newStyle: 'serif' | 'sans-serif') => {
        setWordStyle(newStyle);
        localStorage.setItem('wordStyle', newStyle);
    };

    const handleExportVocabulary = () => {
        const vocab = localStorageApi.getUserVocab();
        const dataStr = JSON.stringify(vocab, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lextro-vocabulary-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleLogout = () => {
        authService.logout();
        window.location.reload();
    };

    const handleNotificationToggle = async (enabled: boolean) => {
        if (enabled) {
            const granted = await notificationService.requestPermission();
            if (granted) {
                setNotificationsEnabled(true);
                const [hour, minute] = dailyWordTime.split(':').map(Number);
                await notificationService.scheduleDailyWordNotification(hour, minute);
            }
        } else {
            setNotificationsEnabled(false);
            await notificationService.disableAllNotifications();
        }
    };

    const handleDailyWordTimeChange = async (newTime: string) => {
        setDailyWordTime(newTime);
        if (notificationsEnabled) {
            const [hour, minute] = newTime.split(':').map(Number);
            await notificationService.scheduleDailyWordNotification(hour, minute);
        }
    };

    const handlePracticeRemindersToggle = async (enabled: boolean) => {
        if (enabled) {
            const granted = await notificationService.requestPermission();
            if (granted) {
                setPracticeRemindersEnabled(true);
                await notificationService.schedulePracticeReminders(true, 2);
            }
        } else {
            setPracticeRemindersEnabled(false);
            await notificationService.schedulePracticeReminders(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
            <div className="bg-white w-full rounded-t-2xl p-6 max-w-lg mx-auto animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-serif text-2xl font-semibold text-text-primary">Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-warm-gray rounded-lg transition-colors"
                        aria-label="Close settings"
                    >
                        <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-6 max-h-96 overflow-y-auto">
                    {/* Profile Section */}
                    <div className="pb-6 border-b border-warm-gray">
                        <h3 className="font-serif text-lg font-semibold text-text-primary mb-3">Profile</h3>
                        <p className="text-sm text-text-secondary mb-1">NAME</p>
                        <p className="font-medium text-text-primary mb-4">{username}</p>
                        <button
                            onClick={handleLogout}
                            className="w-full py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                        >
                            Logout
                        </button>
                    </div>

                    {/* Notification Section */}
                    <div className="pb-6 border-b border-warm-gray">
                        <h3 className="font-serif text-lg font-semibold text-text-primary mb-4">📬 Notifications</h3>
                        <div className="space-y-4">
                            {/* Daily Word Notification */}
                            <div className="flex items-center justify-between p-3 bg-warm-gray rounded-lg">
                                <div>
                                    <p className="font-medium text-text-primary">Daily Word</p>
                                    <p className="text-xs text-text-secondary">Get a new word every day</p>
                                </div>
                                <button
                                    onClick={() => handleNotificationToggle(!notificationsEnabled)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${notificationsEnabled
                                            ? 'bg-accent-teal text-white'
                                            : 'bg-warm-gray-dark text-text-secondary'
                                        }`}
                                >
                                    {notificationsEnabled ? 'On' : 'Off'}
                                </button>
                            </div>

                            {/* Daily Word Time */}
                            {notificationsEnabled && (
                                <div className="pl-3 border-l-2 border-accent-teal">
                                    <label className="text-xs text-text-secondary">Notification Time</label>
                                    <input
                                        type="time"
                                        value={dailyWordTime}
                                        onChange={(e) => handleDailyWordTimeChange(e.target.value)}
                                        className="w-full mt-1 px-3 py-2 border border-warm-gray rounded-lg focus:outline-none focus:border-accent-teal"
                                    />
                                </div>
                            )}

                            {/* Practice Reminders */}
                            <div className="flex items-center justify-between p-3 bg-warm-gray rounded-lg">
                                <div>
                                    <p className="font-medium text-text-primary">Practice Reminders</p>
                                    <p className="text-xs text-text-secondary">2 reminders daily</p>
                                </div>
                                <button
                                    onClick={() => handlePracticeRemindersToggle(!practiceRemindersEnabled)}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${practiceRemindersEnabled
                                            ? 'bg-accent-teal text-white'
                                            : 'bg-warm-gray-dark text-text-secondary'
                                        }`}
                                >
                                    {practiceRemindersEnabled ? 'On' : 'Off'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Word Style Section */}
                    <div className="pb-6 border-b border-warm-gray">
                        <h3 className="font-serif text-lg font-semibold text-text-primary mb-4">Word Display Style</h3>
                        <div className="space-y-3">
                            <button
                                onClick={() => handleWordStyleChange('serif')}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-all border-2 text-left ${wordStyle === 'serif'
                                    ? 'border-accent-teal bg-accent-teal/5'
                                    : 'border-warm-gray hover:border-accent-teal'
                                    }`}
                            >
                                <p className="font-serif text-lg text-text-primary">Serif Style</p>
                                <p className="text-sm text-text-secondary font-sans">Classic, elegant appearance</p>
                            </button>
                            <button
                                onClick={() => handleWordStyleChange('sans-serif')}
                                className={`w-full py-3 px-4 rounded-lg font-medium transition-all border-2 text-left ${wordStyle === 'sans-serif'
                                    ? 'border-accent-teal bg-accent-teal/5'
                                    : 'border-warm-gray hover:border-accent-teal'
                                    }`}
                            >
                                <p className="font-sans text-lg text-text-primary">Sans-Serif Style</p>
                                <p className="text-sm text-text-secondary font-sans">Modern, clean appearance</p>
                            </button>
                        </div>
                    </div>

                    {/* Export Section */}
                    <div>
                        <h3 className="font-serif text-lg font-semibold text-text-primary mb-3">Data</h3>
                        <button
                            onClick={handleExportVocabulary}
                            className="w-full py-3 px-4 bg-accent-teal text-white rounded-lg font-medium hover:bg-accent-teal-dark transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export Vocabulary
                        </button>
                        <p className="text-xs text-text-muted mt-2 text-center">Download all your saved words as JSON</p>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full mt-6 py-3 border-2 border-warm-gray rounded-lg font-medium text-text-primary hover:bg-warm-gray transition-colors"
                >
                    Done
                </button>
            </div>
        </div>
    );
}
