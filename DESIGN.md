# Lextro — Type Foundry Design System

> **Status:** Implemented · **Scope:** `frontend-native` (React Native + Expo) · **Source of truth:** `frontend-native/src/theme/index.ts`

Lextro's visual language is that of a **type foundry specimen sheet**: brutalist-modern, print-like, and word-forward. Vocabulary entries are treated like typographic specimens — numbered `[NO. 042]`, indexed, and set in a display face worthy of a specimen poster.

This document is the canonical reference for anyone restyling or extending the UI. **If a value here disagrees with the README or a pasted mockup, the code in `src/theme/index.ts` wins.**

---

## 1. Design Language

- **Brutalist structure** — 1px hairline borders on every card, button, and section; **zero shadows**; sharp corners (max **4px radius**).
- **Word as hero** — display words up to 80px, Hanken Grotesk 700, tight `-0.04em` tracking.
- **Spec-sheet layout** — numbered mono labels and indexes (`[NO. 042]`, `ADJ`, `STATUS: ACTIVE`, `SAVED: 003 OF 042`) over hairline-ruled rows.
- **Electric blue `#0037de` is reserved for interactivity only** — active tab, selected row, links, focused states. It is never used for static decoration.
- **Two fonts, two jobs** — Hanken Grotesk for display/headline/body; JetBrains Mono for every label, index, and datum.
- **Grid discipline** — unit 4px · gutter 24px · margin-edge 40px (16px mobile).

---

## 2. Color Tokens

| Token | Value | Usage |
|---|---|---|
| `primary` | `#000000` | Buttons, scan actions, tab icons |
| `onPrimary` | `#ffffff` | Text on primary |
| `secondary` | `#0037de` | **Interactivity only**: active tab, selected rows, quality ≥3, focused links |
| `secondaryContainer` | `#2b52ff` | (reserved) hover/active variants |
| `surface` | `#f9f9f9` | App background |
| `surfaceLowest` | `#ffffff` | Cards, inputs, modals |
| `onSurface` | `#1a1c1c` | Primary text |
| `onSurfaceVariant` | `#444748` | Secondary text |
| `outline` | `#747878` | Hairline borders, chips, icons |
| `outlineVariant` | `#c4c7c7` | Disabled states, faint borders |
| `outlineFaint` | `#e5e7e7` | Skeleton / placeholder rules |
| `error` / `errorContainer` | `#ba1a1a` / `#ffdad6` | Errors |
| `selectedContainer` | `rgba(222, 224, 255, 0.6)` | Selected/highlighted row tint (Library) |

---

## 3. Typography

### Fonts (loaded via `expo-font` in `App.tsx`)

| Role | Font | Weights used |
|---|---|---|
| Display / headline / body | **Hanken Grotesk** (`@expo-google-fonts/hanken-grotesk`) | 400, 500, 600, 700 |
| Labels, indexes, data | **JetBrains Mono** (`@expo-google-fonts/jetbrains-mono`) | 400, 500, 700 |

### Type scale (`typeScale`)

| Style | Size / Line | Tracking | Weight | Font |
|---|---|---|---|---|
| `displayLg` | 80 / 80 | -3.2px | 700 | Hanken |
| `displayLgMobile` | 48 / 48 | -1.92px | 700 | Hanken |
| `headlineMd` | 32 / 36 | -0.96px | 600 | Hanken SemiBold |
| `headlineSm` | 24 / 28 | -0.48px | 600 | Hanken SemiBold |
| `titleMd` | 18 / 24 | -0.18px | 600 | Hanken SemiBold |
| `bodyLg` | 18 / 28 | -0.18px | 400 | Hanken |
| `bodySm` / `bodySmMedium` | 14 / 20 | 0 | 400 / 500 | Hanken |
| `labelMono` | 12 / 16 | +0.6px | 500 | JetBrains Mono |
| `labelMonoRegular` | 12 / 16 | +0.6px | 400 | JetBrains Mono |
| `specimenIndex` | 10 / 12 | +1px | 400 | JetBrains Mono |

### Typography conventions

- **UPPERCASE mono** for every button, section title, chip, index, and stat label (use `textTransform: 'uppercase'`).
- Section headers read like file tabs: `[REVIEW]`, `[SETTINGS]`, `[EDITOR]`, `SAVED WORDS (XXX)`.
- Indexes are **zero-padded**: `[NO. 001]` (`String(x).padStart(3, '0')`).
- Cursor-style markers: `▶` (action/play), `⌕` (search), `☰` (menu), `☆/★` (save), `×` (dismiss), `→` (proceed).

---

## 4. Spacing & Layout

| Token | Value |
|---|---|
| `unit` | 4px |
| `gutter` | 24px |
| `marginEdge` | 40px (desktop) |
| `mobileMarginEdge` | 16px |
| `hairline` | 1px |
| `radius` | 4px |
| `radiusSharp` | 0px |

- Use `layout.getMarginEdge(isNarrow)` (via `useResponsive`) for responsive page margins.
- Cards, buttons, and chips use `frame.card` / `buttons.*` shared styles — **do not hand-roll borders per screen.**

---

## 5. Shared Components (`src/theme/index.ts` → `frame`, `buttons`)

### `frame.card`
```ts
{ backgroundColor: surfaceLowest, borderWidth: 1, borderColor: outline, borderRadius: 4 }
```
Used by: VocabCard, mode cards, suggestion cards, stat boxes, word-detail boxes.

### `frame.sectionRule` / `hairlineTop` / `hairlineBottom`
1px rules for section headers and full-bleed dividers.

### `frame.chip` / `frame.chipActive`
1px outlined chips; active chip = blue border + `selectedContainer` tint (POS chips, filters).

### `buttons.primary` / `buttons.secondary` / `buttons.outline`
| Variant | Background | Border | Text |
|---|---|---|---|
| `primary` | `#000000` | `#000000` | white, mono uppercase |
| `secondary` | `#0037de` | `#0037de` | white, mono uppercase |
| `outline` | `#ffffff` | `#747878` | `#1a1c1c`, mono uppercase |

**Button copy is always uppercase mono** (e.g. `PRONOUNCE`, `SAVE`, `REVEAL`, `DONE`, `SCAN FOR VOCABULARY`). Square/circle icon buttons use 1px borders and the same radius.

---

## 6. Screens (implemented)

| Screen | File | Type Foundry treatment |
|---|---|---|
| **Home — Specimen Poster** | `src/screens/HomeScreen.tsx` | `[SPECIMEN OF THE DAY]` blue overline, displayLgMobile hero word, POS chip, `▶ PRONOUNCE` + `☆ SAVE`, stat grid (SAVED / DUE ·blue· / ACCURACY), section rule + VocabFeed |
| **Library** | `src/screens/SavedScreen.tsx` | Top bar `[LIBRARY]` + blue count, hairline search field w/ `⌕`, `SectionList` sticky A–Z headers, rows `[NO. xxx]` + word + POS chip, selected row = `selectedContainer` + 3px blue left border + `→` |
| **Review** | `src/screens/PracticeScreen.tsx` | `[REVIEW]` header, stat cells, square mode cards (quick/standard/focused), hairline word card, black `REVEAL`, quality 0–5 square buttons (≥3 blue), `[SESSION COMPLETE]` panel |
| **Editor** | `src/screens/EditorScreen.tsx` | `[EDITOR]` header, hairline textarea frame, black `SCAN FOR VOCABULARY`, `SUGGESTED WORDS` section rule + InlineWordSuggestion cards |
| **Profile** | `src/screens/ProfileScreen.tsx` | `[PROFILE]` top bar + `[NO. 001]`, `[ IDENTITY ]` plate (name / LOCAL READER, STATUS: ACTIVE chip), telemetry strip (SPECIMENS COLLECTED / STREAK ·blue· / MASTERY), DUE/ACCURACY/SESSIONS row, `ACTIVITY LOG` table (NO. / WORD / STATUS chip / ADDED) with hairline rows |
| **Word Detail** | `src/components/WordDetailModal.tsx` | Full-screen (slide-up, covers tab bar): top bar `[ENTRY. NNNN]` + `✕ CLOSE`, giant headword (displayLg → displayLgMobile on narrow), POS chip + DIFF + FIRST SEEN, **corner-ticked definition box** (blue corner ticks, DEFINITION label, corpus quote), numbered spec sheet `01. PRONUNCIATION ▶ SPEAK` / `02. CLASSIFICATION` / `03. DIFFICULTY` / `04. SYNONYMS` / `05. ANTONYMS` / `06. RELATED` / `07. FIRST SEEN`, `08. EXAMPLES` (corpus + IN YOUR VOICE), black action bar `▶ PRACTICE` / `☆ SAVE` / `USE`. Opened from VocabCard `DETAILS`, Home hero word tap, feed index → real entry number |
| **Word detail / save modals** | `src/components/VocabCard.tsx` | `[SAVE. WORD]` save-menu modal retained; details now opens the full-screen WordDetailModal |

### Shared component inventory
- `Header.tsx` — LEXTRO wordmark (Hanken 600), square bordered `⌕`/`☰` buttons, hairline bottom rule.
- `TabBarIcon.tsx` + `AppNavigator.tsx` — mono uppercase labels, active tab = blue tint + **2px blue top border** (per-screen `tabBarStyle`), hairline top, glyphs ⌂ ▤ ✎ ▶ (no emoji).
- `VocabCard.tsx` — hairline card, square mono buttons, `[DETAILS. WORD]`/`[SAVE. WORD]` modals, toast, `★ SAVED`/`☆ SAVE` active state, difficulty dots (easy 1 · medium 3 · hard 5), `ADDED` date footer.
- `VocabFeed.tsx` — `SAVED: XXX OF XXX` mono header, hairline skeleton cards, `LOADING MORE…` footer, `NO SAVED WORDS` empty state.
- `WordSearch.tsx` — hairline search field w/ `⌕`, results list.
- `SettingsModal.tsx` — `[SETTINGS]`, sections ACCOUNT / LEARNING / ABOUT, hairline-separated rows. `EDIT PROFILE` navigates to the Profile tab.
- `InlineWordSuggestion.tsx` — hairline card, word/POS/definition, `SAVE` + `×` dismiss.

---

## 7. Interaction Rules

- **Blue `#0037de` = interactive.** Active tab, selected row, focused state, quality ≥3, links. Never decorative.
- **Selected row** (Library): `selectedContainer` background + 3px blue left border + blue text + `→` caret.
- **Disabled** buttons: `outlineVariant` background/border, no shadow change.
- **Press feedback**: invert via border/background (no opacity hacks unless unavoidable on web).
- **ZERO shadows, everywhere.** Depth comes from hairlines and the surface/surfaceLowest contrast.

---

## 8. Design References

- **Implemented source of truth:** `frontend-native/src/theme/index.ts` (+ fonts in `App.tsx`).
- **Google Stitch designs** (interactive, editable): project `projects/8592010513839308127` ("Lextro Vocabulary Companion"). Screen refs: Home v2 `95e477acc0a64cbba8ede52ab8608711`, Word Detail v2 `50c4bd1cd6584f72839e8aa3be5e90f4`.
- **Pasted HTML reference (Library):** Tailwind tokens `#f9f9f9` / `#0037de` / `#c4c7c7` / `#ffffff`; sticky A–Z headers; `[NO. XXX]` + ADJ-NOUN chips; selected row `rgba(222,224,255)`.
- **Explored-but-rejected themes** (Stitch): Inked Margins (plum/moss), Bold Lexicon (lime on near-black), Quiet Study (sage/clay), Nocturne (dark).

---

## 9. Golden Rules (checklist for new UI)

1. Hairline (1px) border on every card/button; **no shadows**.
2. Radius ≤ 4px; square corners preferred for rules and dividers.
3. Blue only for interactive/selected states.
4. All labels, buttons, indexes in **uppercase JetBrains Mono**.
5. Indexes zero-padded to 3 digits.
6. Pull tokens from `src/theme/index.ts` (`colors`, `fonts`, `typeScale`, `spacing`, `frame`, `buttons`) — never hardcode hex/px in screens.
7. Run `npx tsc --noEmit` after any theme or screen change.
