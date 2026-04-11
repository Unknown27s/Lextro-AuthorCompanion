module.exports = {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                // Warm neutrals for light mode
                'warm-white': '#FAF9F6',
                'warm-gray': '#F5F3F0',
                'warm-gray-dark': '#E8E6E3',

                // Deep teal accent
                'accent-teal': '#2C7A7B',
                'accent-teal-light': '#319795',
                'accent-teal-dark': '#234E52',

                // Literary violet accent
                'accent-violet': '#6B46C1',
                'accent-violet-light': '#805AD5',

                // Text colors
                'text-primary': '#1A1A1A',
                'text-secondary': '#4A5568',
                'text-muted': '#718096',
                'text-light': '#A0AEC0',

                // Card & surface colors
                'card-bg': '#FFFFFF',
                'surface-warm': '#FEFDFB',
            },
            fontFamily: {
                serif: ['Crimson Pro', 'Lora', 'Georgia', 'serif'],
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            fontSize: {
                // Responsive typography using clamp for smooth scaling across all screen sizes
                'word-title': ['clamp(16px, 4.5vw, 26px)', { lineHeight: '1.3', fontWeight: '600' }],
                'word-title-lg': ['clamp(22px, 6vw, 36px)', { lineHeight: '1.2', fontWeight: '700' }],
                'body': ['clamp(15px, 4vw, 18px)', { lineHeight: '1.6' }],
                'body-sm': ['clamp(13px, 3.5vw, 15px)', { lineHeight: '1.5' }],
                'heading-lg': ['clamp(20px, 5vw, 24px)', { lineHeight: '1.2', fontWeight: '700' }],
            },
            borderRadius: {
                'card': '12px',
                'card-lg': '16px',
            },
            boxShadow: {
                'card': '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
                'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
                'card-elevated': '0 8px 16px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)',
            },
            spacing: {
                // Responsive spacing using clamp: scales smoothly from mobile to tablet
                // Optimized for better content visibility and touch targets on smaller screens
                'card-padding': 'clamp(14px, 4vw, 22px)',
                'card-margin': 'clamp(10px, 3vw, 18px)',
                'gutter': 'clamp(10px, 3vw, 16px)',
                'section-gap': 'clamp(14px, 4vw, 24px)',
            },
            maxWidth: {
                // Optimize layout width for different devices
                'mobile': '480px',
                'tablet': '768px',
                'compact': 'calc(100vw - 2rem)',
            },
            height: {
                // Adaptive header sizing for all screen heights
                'header-sm': 'clamp(56px, 12vw, 64px)',
                'nav-compact': 'clamp(56px, 12vw, 72px)',
            },
            minHeight: {
                // Ensure full-screen layouts respect safe areas (notches, gestures)
                'screen-safe': 'calc(100vh - env(safe-area-inset-bottom))',
            },
        },
    },
    plugins: [],
};