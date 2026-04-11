/**
 * Local Authentication Service
 * Handles user login/logout without external services
 * Uses localStorage for persistence
 */

export interface User {
    id: string;
    name: string;
    password: string; // hashed
    createdAt: number;
    lastLogin: number;
    learningPurpose?: 'writing' | 'interviews' | 'exams' | 'presentation' | 'creative';
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    error: string | null;
}

const AUTH_KEY = 'authUser';
const USERS_KEY = 'localUsers';

// Simple hash function (not cryptographically secure, for local use only)
const hashPassword = (password: string): string => {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
};

export const authService = {
    /**
     * Register a new user locally
     */
    register: (name: string, password: string): { success: boolean; error?: string } => {
        if (!name || !password) {
            return { success: false, error: 'Name and password required' };
        }

        const users = getAllUsers();
        if (users.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
            return { success: false, error: 'User already exists' };
        }

        const user: User = {
            id: `user_${Date.now()}`,
            name,
            password: hashPassword(password),
            createdAt: Date.now(),
            lastLogin: Date.now(),
        };

        users.push(user);
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));

        return { success: true };
    },

    /**
     * Login with name and password
     */
    login: (name: string, password: string): { success: boolean; error?: string; user?: User } => {
        if (!name || !password) {
            return { success: false, error: 'Name and password required' };
        }

        const users = getAllUsers();
        const user = users.find((u) => u.name.toLowerCase() === name.toLowerCase());

        if (!user || user.password !== hashPassword(password)) {
            return { success: false, error: 'Invalid name or password' };
        }

        // Update last login
        user.lastLogin = Date.now();
        const updatedUsers = users.map((u) => (u.id === user.id ? user : u));
        localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));

        return { success: true, user };
    },

    /**
     * Get current authenticated user
     */
    getCurrentUser: (): User | null => {
        const stored = localStorage.getItem(AUTH_KEY);
        return stored ? JSON.parse(stored) : null;
    },

    /**
     * Logout current user
     */
    logout: (): void => {
        localStorage.removeItem(AUTH_KEY);
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated: (): boolean => {
        return !!localStorage.getItem(AUTH_KEY);
    },

    /**
     * Change password for current user
     */
    changePassword: (oldPassword: string, newPassword: string): { success: boolean; error?: string } => {
        const user = authService.getCurrentUser();
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }

        if (user.password !== hashPassword(oldPassword)) {
            return { success: false, error: 'Current password incorrect' };
        }

        user.password = hashPassword(newPassword);
        const users = getAllUsers();
        const updatedUsers = users.map((u) => (u.id === user.id ? user : u));
        localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));
        localStorage.setItem(AUTH_KEY, JSON.stringify(user));

        return { success: true };
    },

    /**
     * Delete user account
     */
    deleteAccount: (password: string): { success: boolean; error?: string } => {
        const user = authService.getCurrentUser();
        if (!user) {
            return { success: false, error: 'No user logged in' };
        }

        if (user.password !== hashPassword(password)) {
            return { success: false, error: 'Password incorrect' };
        }

        const users = getAllUsers();
        const filtered = users.filter((u) => u.id !== user.id);
        localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
        localStorage.removeItem(AUTH_KEY);

        return { success: true };
    },

    /**
     * Update user's learning purpose
     */
    updateLearningPurpose: (userId: string, purpose: 'writing' | 'interviews' | 'exams' | 'presentation' | 'creative'): boolean => {
        const users = getAllUsers();
        const user = users.find(u => u.id === userId);

        if (!user) return false;

        user.learningPurpose = purpose;
        const updatedUsers = users.map(u => u.id === userId ? user : u);
        localStorage.setItem(USERS_KEY, JSON.stringify(updatedUsers));

        // Update current auth user
        const currentUser = authService.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            currentUser.learningPurpose = purpose;
            localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));
        }

        return true;
    },
};

/**
 * Helper: Get all users
 */
const getAllUsers = (): User[] => {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
};
