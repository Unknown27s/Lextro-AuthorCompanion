/**
 * Type Foundry — Design System (React Native)
 *
 * Single source of truth for the "Type Foundry" visual language:
 * a brutalist-modern, print-like specimen sheet. Words are typographic
 * specimens — numbered, indexed `[NO. 042]`, set in a display face.
 *
 * Rules:
 * - 1px hairline borders on every card/button/section; ZERO shadows
 * - Sharp corners (max 4px radius)
 * - Electric blue `#0037de` reserved for interactivity
 * - JetBrains Mono for all labels, indexes, and data
 * - Hanken Grotesk for display, headline, and body text
 */

// ─── Color tokens ────────────────────────────────────────────────────────────
export const colors = {
  primary: '#000000',
  onPrimary: '#ffffff',
  secondary: '#0037de',
  onSecondary: '#ffffff',
  secondaryContainer: '#2b52ff',
  surface: '#f9f9f9',
  surfaceLowest: '#ffffff',
  onSurface: '#1a1c1c',
  onSurfaceVariant: '#444748',
  outline: '#747878',
  outlineVariant: '#c4c7c7',
  outlineFaint: '#e5e7e7',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  success: '#2E8B57', // correct answer flash
  errorSoft: '#C94F4F', // wrong answer flash
  selectedContainer: 'rgba(222, 224, 255, 0.6)', // active/selected row tint (Library)
} as const;

// ─── Font families (loaded via expo-font in App.tsx) ────────────────────────
export const fonts = {
  display: 'HankenGrotesk_700Bold',
  displaySemiBold: 'HankenGrotesk_600SemiBold',
  body: 'HankenGrotesk_400Regular',
  bodyMedium: 'HankenGrotesk_500Medium',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

// ─── Type scale ──────────────────────────────────────────────────────────────
export const typeScale = {
  displayLg: { fontSize: 80, lineHeight: 80, letterSpacing: -3.2, fontWeight: fontWeights.bold, fontFamily: fonts.display },
  displayLgMobile: { fontSize: 48, lineHeight: 48, letterSpacing: -1.92, fontWeight: fontWeights.bold, fontFamily: fonts.display },
  headlineMd: { fontSize: 32, lineHeight: 36, letterSpacing: -0.96, fontWeight: fontWeights.semiBold, fontFamily: fonts.displaySemiBold },
  headlineSm: { fontSize: 24, lineHeight: 28, letterSpacing: -0.48, fontWeight: fontWeights.semiBold, fontFamily: fonts.displaySemiBold },
  titleMd: { fontSize: 18, lineHeight: 24, letterSpacing: -0.18, fontWeight: fontWeights.semiBold, fontFamily: fonts.displaySemiBold },
  bodyLg: { fontSize: 18, lineHeight: 28, letterSpacing: -0.18, fontWeight: fontWeights.regular, fontFamily: fonts.body },
  bodySm: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: fontWeights.regular, fontFamily: fonts.body },
  bodySmMedium: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: fontWeights.medium, fontFamily: fonts.bodyMedium },
  labelMono: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, fontWeight: fontWeights.medium, fontFamily: fonts.monoMedium },
  labelMonoRegular: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6, fontWeight: fontWeights.regular, fontFamily: fonts.mono },
  specimenIndex: { fontSize: 10, lineHeight: 12, letterSpacing: 1, fontWeight: fontWeights.regular, fontFamily: fonts.mono },
} as const;

export type TypeStyle = keyof typeof typeScale;

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const spacing = {
  unit: 4, // base unit
  gutter: 24, // gutter
  marginEdge: 40, // margin-edge (desktop); mobile uses 16
  mobileMarginEdge: 16,
  hairline: 1,
  radius: 4,
  radiusSharp: 0,
} as const;

// ─── Layout helpers ──────────────────────────────────────────────────────────
export const layout = {
  getMarginEdge: (isNarrow: boolean) => (isNarrow ? spacing.mobileMarginEdge : spacing.marginEdge),
} as const;

// ─── Shared component styles (hairline frames, buttons, chips) ──────────────
export const frame = {
  // 1px hairline bordered card, sharp corners, no shadow
  card: {
    backgroundColor: colors.surfaceLowest,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
  },
  // Section header row with hairline rule below
  sectionRule: {
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
  },
  // Full-bleed hairline rule
  hairlineTop: {
    borderTopWidth: spacing.hairline,
    borderTopColor: colors.outline,
  },
  hairlineBottom: {
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
  },
  chip: {
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  chipActive: {
    borderWidth: spacing.hairline,
    borderColor: colors.secondary,
    backgroundColor: colors.selectedContainer,
    borderRadius: spacing.radius,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
} as const;

// ─── Interaction palette mapping (used by buttons) ──────────────────────────
export const buttons = {
  primary: {
    backgroundColor: colors.primary,
    borderWidth: spacing.hairline,
    borderColor: colors.primary,
    borderRadius: spacing.radius,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  primaryText: {
    color: colors.onPrimary,
    ...typeScale.labelMono,
    textTransform: 'uppercase' as const,
  },
  secondary: {
    backgroundColor: colors.secondary,
    borderWidth: spacing.hairline,
    borderColor: colors.secondary,
    borderRadius: spacing.radius,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  outline: {
    backgroundColor: colors.surfaceLowest,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  outlineText: {
    color: colors.onSurface,
    ...typeScale.labelMono,
    textTransform: 'uppercase' as const,
  },
  activeText: {
    color: colors.secondary,
    ...typeScale.labelMono,
    textTransform: 'uppercase' as const,
  },
} as const;
