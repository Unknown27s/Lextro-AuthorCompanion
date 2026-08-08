/**
 * Local Authentication Service
 *
 * Ported from web version — imports localStorage polyfill instead of global.
 * In a production RN app, consider expo-crypto for secure hashing and
 * expo-secure-storage for credentials. This preserves the existing local
 * auth flow for Phase 1.
 */

import { User, AuthState } from '../types';
import { localStorage as localStoragePolyfill } from '../utils/storage';

const AUTH_KEY = 'authUser';
const USERS_KEY = 'localUsers';

const hashPassword = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

const getAllUsers = (): User[] => {
  const stored = localStoragePolyfill.getItem(USERS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const authService = {
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
    localStoragePolyfill.setItem(USERS_KEY, JSON.stringify(users));
    localStoragePolyfill.setItem(AUTH_KEY, JSON.stringify(user));

    return { success: true };
  },

  login: (
    name: string,
    password: string,
  ): { success: boolean; error?: string; user?: User } => {
    if (!name || !password) {
      return { success: false, error: 'Name and password required' };
    }

    const users = getAllUsers();
    const user = users.find(
      (u) => u.name.toLowerCase() === name.toLowerCase(),
    );

    if (!user || user.password !== hashPassword(password)) {
      return { success: false, error: 'Invalid name or password' };
    }

    user.lastLogin = Date.now();
    const updatedUsers = users.map((u) =>
      u.id === user.id ? user : u,
    );
    localStoragePolyfill.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    localStoragePolyfill.setItem(AUTH_KEY, JSON.stringify(user));

    return { success: true, user };
  },

  getCurrentUser: (): User | null => {
    const stored = localStoragePolyfill.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  logout: (): void => {
    localStoragePolyfill.removeItem(AUTH_KEY);
  },

  isAuthenticated: (): boolean => {
    return !!localStoragePolyfill.getItem(AUTH_KEY);
  },

  changePassword: (
    oldPassword: string,
    newPassword: string,
  ): { success: boolean; error?: string } => {
    const user = authService.getCurrentUser();
    if (!user) {
      return { success: false, error: 'No user logged in' };
    }

    if (user.password !== hashPassword(oldPassword)) {
      return { success: false, error: 'Current password incorrect' };
    }

    user.password = hashPassword(newPassword);
    const users = getAllUsers();
    const updatedUsers = users.map((u) =>
      u.id === user.id ? user : u,
    );
    localStoragePolyfill.setItem(USERS_KEY, JSON.stringify(updatedUsers));
    localStoragePolyfill.setItem(AUTH_KEY, JSON.stringify(user));

    return { success: true };
  },

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
    localStoragePolyfill.setItem(USERS_KEY, JSON.stringify(filtered));
    localStoragePolyfill.removeItem(AUTH_KEY);

    return { success: true };
  },

  getAuthState: (): AuthState => {
    const user = authService.getCurrentUser();
    return {
      isAuthenticated: !!user,
      user,
      error: null,
    };
  },

  updateLearningPurpose: (
    userId: string,
    purpose: 'writing' | 'interviews' | 'exams' | 'presentation' | 'creative',
  ): boolean => {
    const users = getAllUsers();
    const user = users.find((u) => u.id === userId);

    if (!user) return false;

    user.learningPurpose = purpose;
    const updatedUsers = users.map((u) =>
      u.id === userId ? user : u,
    );
    localStoragePolyfill.setItem(USERS_KEY, JSON.stringify(updatedUsers));

    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      currentUser.learningPurpose = purpose;
      localStoragePolyfill.setItem(AUTH_KEY, JSON.stringify(currentUser));
    }

    return true;
  },
};
