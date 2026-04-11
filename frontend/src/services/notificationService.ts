/**
 * Push Notification Service
 * Handles push notifications for word of the day and practice reminders
 */

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, any>;
}

class NotificationService {
    private static instance: NotificationService;
    private readonly STORAGE_KEY = 'notification_settings';

    private constructor() {
        this.initializeServiceWorker();
    }

    static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Initialize service worker for push notifications
     */
    private async initializeServiceWorker() {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                console.log('Service Worker ready for notifications');
            } catch (error) {
                console.error('Service Worker initialization failed:', error);
            }
        }
    }

    /**
     * Request notification permission from user
     */
    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.warn('This browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            try {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            } catch (error) {
                console.error('Failed to request notification permission:', error);
                return false;
            }
        }

        return false;
    }

    /**
     * Send a local notification
     */
    async sendNotification(payload: NotificationPayload): Promise<boolean> {
        try {
            if (Notification.permission !== 'granted') {
                const granted = await this.requestPermission();
                if (!granted) return false;
            }

            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.ready;
                await registration.showNotification(payload.title, {
                    body: payload.body,
                    icon: payload.icon || '/icon-192.png',
                    badge: payload.badge || '/icon-192.png',
                    tag: payload.tag || 'default',
                    data: payload.data,
                    actions: [
                        {
                            action: 'open',
                            title: 'Open',
                            icon: '/icon-192.png',
                        },
                        {
                            action: 'close',
                            title: 'Close',
                            icon: '/icon-192.png',
                        },
                    ],
                });

                return true;
            } else {
                // Fallback for browsers without service worker support
                new Notification(payload.title, {
                    body: payload.body,
                    icon: payload.icon || '/icon-192.png',
                });
                return true;
            }
        } catch (error) {
            console.error('Failed to send notification:', error);
            return false;
        }
    }

    /**
     * Schedule daily word of the day notification
     */
    async scheduleDailyWordNotification(hour: number = 8, minute: number = 0): Promise<boolean> {
        try {
            const settings = this.getSettings();
            settings.dailyWordTime = { hour, minute };
            settings.dailyWordEnabled = true;
            this.saveSettings(settings);

            // Set up alarm using a background task
            this.setupDailyAlarm(hour, minute);

            return true;
        } catch (error) {
            console.error('Failed to schedule daily notification:', error);
            return false;
        }
    }

    /**
     * Schedule practice reminder notifications
     */
    async schedulePracticeReminders(enabled: boolean = true, frequency: number = 2): Promise<boolean> {
        try {
            const settings = this.getSettings();
            settings.practiceRemindersEnabled = enabled;
            settings.practiceReminderFrequency = frequency; // reminders per day
            this.saveSettings(settings);

            if (enabled) {
                this.setupPracticeReminders(frequency);
            }

            return true;
        } catch (error) {
            console.error('Failed to schedule practice reminders:', error);
            return false;
        }
    }

    /**
     * Set up daily alarm (runs every day at specified time)
     */
    private setupDailyAlarm(hour: number, minute: number) {
        const checkAndNotify = () => {
            const now = new Date();
            const nextRun = new Date();
            nextRun.setHours(hour, minute, 0, 0);

            if (now > nextRun) {
                nextRun.setDate(nextRun.getDate() + 1);
            }

            const timeUntilNext = nextRun.getTime() - now.getTime();

            // Set timeout until the next scheduled time
            setTimeout(() => {
                this.triggerDailyWordNotification();
                // Reschedule for next day
                setInterval(() => {
                    this.triggerDailyWordNotification();
                }, 24 * 60 * 60 * 1000); // Every 24 hours
            }, timeUntilNext);
        };

        checkAndNotify();
    }

    /**
     * Set up practice reminders throughout the day
     */
    private setupPracticeReminders(frequency: number) {
        const intervalMinutes = (24 * 60) / frequency;
        setInterval(() => {
            this.triggerPracticeReminder();
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Trigger daily word notification (called by alarm)
     */
    private async triggerDailyWordNotification() {
        const settings = this.getSettings();
        if (settings.dailyWordEnabled) {
            // This will be called from the server/backend
            // For now, send a generic notification
            await this.sendNotification({
                title: '📚 Word of the Day',
                body: 'Time to learn a new word!',
                tag: 'word-of-day',
                data: { action: 'openWordOfDay' },
            });
        }
    }

    /**
     * Trigger practice reminder (called periodically)
     */
    private async triggerPracticeReminder() {
        const settings = this.getSettings();
        if (settings.practiceRemindersEnabled) {
            await this.sendNotification({
                title: '⚡ Practice Time',
                body: 'Time to practice your vocabulary!',
                tag: 'practice-reminder',
                data: { action: 'openPractice' },
            });
        }
    }

    /**
     * Get notification settings
     */
    getSettings() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored
            ? JSON.parse(stored)
            : {
                dailyWordEnabled: false,
                dailyWordTime: { hour: 8, minute: 0 },
                practiceRemindersEnabled: false,
                practiceReminderFrequency: 2,
            };
    }

    /**
     * Save notification settings
     */
    private saveSettings(settings: any) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    }

    /**
     * Disable all notifications
     */
    async disableAllNotifications(): Promise<boolean> {
        try {
            const settings = this.getSettings();
            settings.dailyWordEnabled = false;
            settings.practiceRemindersEnabled = false;
            this.saveSettings(settings);
            return true;
        } catch (error) {
            console.error('Failed to disable notifications:', error);
            return false;
        }
    }
}

export const notificationService = NotificationService.getInstance();
