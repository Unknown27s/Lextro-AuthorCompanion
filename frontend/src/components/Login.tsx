import React, { useState } from 'react';
import { authService } from '../services/authService';

interface LoginProps {
    onLoginSuccess: () => void;
    onShowPurposeSelector?: (userId: string, userName: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onShowPurposeSelector }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    return;
                }
                const result = authService.register(name, password);
                if (!result.success) {
                    setError(result.error || 'Registration failed');
                    return;
                }
                // After registration, show purpose selector
                const user = authService.getCurrentUser();
                if (user && onShowPurposeSelector) {
                    onShowPurposeSelector(user.id, user.name);
                    return;
                }
            } else {
                const result = authService.login(name, password);
                if (!result.success) {
                    setError(result.error || 'Login failed');
                    return;
                }
                // Check if user has learning purpose set
                const user = authService.getCurrentUser();
                if (user && !user.learningPurpose && onShowPurposeSelector) {
                    onShowPurposeSelector(user.id, user.name);
                    return;
                }
            }

            // Clear form
            setName('');
            setPassword('');
            setConfirmPassword('');

            // Notify parent
            onLoginSuccess();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-warm-white via-warm-cream to-warm-beige flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo/Header */}
                <div className="text-center mb-8">
                    <h1 className="font-crimson text-4xl font-semibold text-warm-charcoal mb-2">Lextro</h1>
                    <p className="text-warm-taupe text-sm">Build your vocabulary</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-xl shadow-sm border border-warm-border p-8 mb-6">
                    {/* Mode Tabs */}
                    <div className="flex gap-4 mb-6 border-b border-warm-border">
                        <button
                            onClick={() => setMode('login')}
                            className={`pb-3 px-2 font-inter font-medium transition-colors ${mode === 'login' ? 'text-accent-teal border-b-2 border-accent-teal' : 'text-warm-taupe hover:text-warm-charcoal'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setMode('register')}
                            className={`pb-3 px-2 font-inter font-medium transition-colors ${mode === 'register' ? 'text-accent-teal border-b-2 border-accent-teal' : 'text-warm-taupe hover:text-warm-charcoal'
                                }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Name Input */}
                        <div>
                            <label className="block font-inter text-sm font-medium text-warm-charcoal mb-2">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={mode === 'login' ? 'Enter your name' : 'Choose a name'}
                                className="w-full px-4 py-3 border border-warm-border rounded-lg font-inter text-sm focus:outline-none focus:ring-2 focus:ring-accent-teal"
                                required
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block font-inter text-sm font-medium text-warm-charcoal mb-2">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                className="w-full px-4 py-3 border border-warm-border rounded-lg font-inter text-sm focus:outline-none focus:ring-2 focus:ring-accent-teal"
                                required
                                minLength={6}
                            />
                        </div>

                        {/* Confirm Password (Register only) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block font-inter text-sm font-medium text-warm-charcoal mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm password"
                                    className="w-full px-4 py-3 border border-warm-border rounded-lg font-inter text-sm focus:outline-none focus:ring-2 focus:ring-accent-teal"
                                    required
                                    minLength={6}
                                />
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-accent-teal text-white rounded-lg font-inter font-medium hover:bg-opacity-90 disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Loading...' : mode === 'login' ? 'Login' : 'Create Account'}
                        </button>
                    </form>

                    {/* Info Text */}
                    <p className="text-center text-warm-taupe text-xs mt-4 font-inter">
                        {mode === 'login'
                            ? "Don't have an account? Register to get started."
                            : 'Already have an account? Login instead.'}
                    </p>
                </div>

                {/* Security Note */}
                <div className="text-center text-warm-taupe text-xs font-inter">
                    <p>🔒 All data is stored locally on your device</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
