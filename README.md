# 📚 Lextro — Author Vocabulary Companion (Mobile-First)

<p align="center">
  <img src="lextro.png" alt="Lextro" width="120" height="120" />
</p>

A **mobile-first** vocabulary learning app built with **React Native + Expo**, styled after a **Type Foundry specimen sheet**. Every word is treated as a typographic specimen — numbered, indexed, and set in a display face worthy of a poster.

**Zero backend. Zero database. Zero monthly costs. Forever free.** ✨

---

## 🚀 Quick Start

```bash
cd frontend-native
npm install
npm run start          # Start the Expo dev server
npm run android        # Android
npm run ios            # iOS
npm test               # Run the Jest test suite
```

### On your device
- Scan the QR code from the Expo Go app
- Or press `a` (Android) / `i` (iOS) for automatic device launch

---

## 📱 Tech Stack

- **React Native 0.86** + **Expo SDK 57** + **TypeScript 6**
- **React Navigation v7** (bottom tab navigator, 5 tabs, safe-area aware)
- **Redux Toolkit** (state management)
- **AsyncStorage** (local data persistence)
- **expo-speech** (text-to-speech pronunciation)
- **expo-notifications** (daily reminders — *temporarily removed, package kept for re-add*)
- **expo-sqlite** (offline FTS5 search layer — EDMT dictionary + saved vocab mirrored into SQLite, `sqliteService.ts`)
- **Jest 29** + `react-native` preset (SM-2 scheduler test suite)

---

## 📁 Project Structure

```
AuthorCompanion/
├── lextro.png               # App icon (1024×1024)
├── frontend-native/         # React Native + Expo app
│   ├── src/
│   │   ├── components/      # Header, VocabCard, VocabFeed, WordDetailModal, StreakCard, etc.
│   │   ├── screens/         # Home, Saved, Books, Practice, Profile
│   │   ├── navigation/      # React Navigation setup (5-tab navigator)
│   │   ├── services/        # SM-2 spaced repetition, practice activities, streak service
│   │   ├── data/            # Curated datasets (author quotes for Author Guess)
│   │   ├── store/           # Redux Toolkit slices
│   │   ├── api/             # API client + localStorage API
│   │   └── utils/           # Storage utilities
│   ├── assets/              # Dictionary data + app icon
│   ├── App.tsx              # Root component
│   └── app.json             # Expo config
├── DESIGN.md                # Design system reference
└── README.md
```

---

## 🗺️ Screen Status

### ✅ COMPLETED — Fully built & working

> **Global Header** — every screen shares the LEXTRO wordmark + `⌕` search + `☰` settings via a shared `ScreenShell` wrapper (`src/components/ScreenShell.tsx`). `⌕` jumps to the Library search (on Library it focuses the field); `☰` opens Settings with EDIT PROFILE.

| Screen | File | What it does |
|---|---|---|
| **Home — Specimen Poster** | `src/screens/HomeScreen.tsx` | Single-scroll page. Hero word as a specimen poster (giant display type, POS chip, definition), PRONOUNCE / SAVE actions, telemetry stats, recent specimens feed. Hero word opens the Word Detail modal. |
| **Library / Saved** | `src/screens/SavedScreen.tsx` | Alphabetical index with `[NO. xxx]` indexes, hairline search field, `SPECIMENS` count, saved-word feed. Every word opens the full Word Detail modal. |
| **Books — Reading Room** | `src/screens/BooksScreen.tsx` | Catalogue of imported/downloaded books, in-app paginated reader, tap-a-word dictionary, page-wise vocabulary index with search, bookmarks and last-read resume. |
| **Practice — 3 activities** | `src/screens/PracticeScreen.tsx` | Definition Match, Speed Round, Author Guess + daily streak. See **Practice details** below. |
| **Profile** | `src/screens/ProfileScreen.tsx` | Identity plate (`[NO. 001] IDENTITY`), telemetry strip (SPECIMENS COLLECTED / STREAK / MASTERY), DUE/ACCURACY/SESSIONS row, ACTIVITY LOG hairline table, "ALL DATA STORED LOCALLY" footer. |
| **Word Detail (modal)** | `src/components/WordDetailModal.tsx` | Full-screen slide-up detail: `[ENTRY. NNNN]` bar, giant headword, corner-ticked definition box, numbered spec sheet (01 PRONUNCIATION ▶ SPEAK / 02 CLASSIFICATION / 03 DIFFICULTY / 04 SYNONYMS / 05 ANTONYMS / 06 RELATED / 07 FIRST SEEN / 08 EXAMPLES), action bar `▶ PRACTICE` / `☆ SAVE` / `USE`. |
| **Settings (modal)** | `src/components/SettingsModal.tsx` | Settings sheet with EDIT PROFILE → Profile navigation. |

### 🚧 TO COMPLETE — Planned / Pending

| Item | Status | Notes |
|---|---|---|
| **Daily review notifications** | ⏸ Deferred | Removed per request; `expo-notifications` kept in package.json for quick re-add. |
| **SQLite migration** | ✅ Live | `expo-sqlite` FTS5 search layer (`src/services/sqliteService.ts`). The EDMT dictionary is shipped as a **prebuilt database** (`scripts/build-sqlite-db.mjs` → `assets/lextro.db.gz`), seeded once on native at warmup — no runtime import, no per-launch decompression. Saved vocab is mirrored at warmup (idempotent). AsyncStorage stays the source of truth for user data. `searchFts()` is the backend for the upcoming offline OCR flow. |

---

## 🎮 Practice — Three Activities

The Practice tab (`src/screens/PracticeScreen.tsx`) runs **three quick-fire activities** plus a **daily streak**. Words come from your saved Library (falling back to the bundled offline dictionary), so questions always match what you're learning.

### Practice Home
- **Daily streak** — `12 DAY STREAK` (blue mono number + ink-60 label) with 7-day square pips. Completing a session in ANY activity counts the day; up to **2 streak freezes per month** bridge a missed day so the streak survives. A larger, tappable streak card also sits on the Home tab.
- **DUE TODAY** / **ACCURACY** stat cards — ACCURACY is the rolling % across your **last 50 answers** (⚙ gear opens Practice Settings: accuracy basis + freeze allowance).
- **CHOOSE A MODE** — three mode cards, each with a mono corner tag:

| Mode | Tag | Format |
|---|---|---|
| **DEFINITION MATCH** | `10w` | 10 words · 4 stacked definition rows · green/red flash · auto-advance (~800ms) |
| **SPEED ROUND** | `60s` | 60-second countdown (red in final 10s) · 2×2 answer grid · `STREAK THIS ROUND` counter · full-bleed ink results card |
| **AUTHOR GUESS** | `8q` | 8 pull-quotes · who wrote this? · 4 stacked author rows · curated public-domain quote set (`src/data/authorQuotes.ts`) |

### Activity flow
1. Tap a mode → questions build from saved vocab (definition/author distractors are other words/quotes, shuffled)
2. Tap an answer → correct flashes **green** (`#2E8B57`), wrong flashes **red** (`#C94F4F`) with the right one highlighted, then auto-advances
3. Speed Round races a 60s timer — when it hits 0 you land on the ink results card with `TRY AGAIN` / `BACK TO MODES`
4. Session ends → `[SESSION COMPLETE]` with score + accuracy, streak recorded, stats refresh
5. DUE TODAY / ACCURACY / STREAK update on Practice home and Profile

> The old Quick/Standard/Focused SM-2 review flow was replaced by these activities; the SM-2 scheduler (`spacedRepetitionService.ts`) still powers DUE TODAY counts and remains fully unit-tested (22 tests).

---

## ✨ Features

- **Offline Dictionary** — 110,000+ words from the public-domain EDMT (Webster-style) dictionary, bundled compressed (gzip + pako) and mirrored into an FTS5 SQLite search index (`sqliteService.ts`). Prefix search across word/definition/senses. *(EDMT supplies word/type/description only — pronunciation, synonyms & antonyms rows render via TTS / fallback.)*
- **Three Practice Activities** — Definition Match (10w), Speed Round (60s), Author Guess (8q), plus a daily streak with freeze protection
- **Spaced Repetition** — SM-2 algorithm, deterministic & fully unit-tested (22 tests)
- **Text-to-Speech** — native pronunciation via expo-speech
- **Save & Track** — words saved with status tracking
- **Document Scanner** — paste text, discover words worth saving
- **Full Word Detail** — pronunciation, classification, synonyms, antonyms, examples
- **Activity Log** — per-word history in Profile

---

## 🎨 Design System — "Type Foundry"

Lextro's visual language is that of a **type foundry specimen sheet**: brutalist-modern, print-like, and word-forward.

> **Interactive designs live in Google Stitch** — project `projects/8592010513839308127` ("Lextro Vocabulary Companion").

- **Brutalist structure** — 1px hairline borders on every card/button/section; zero shadows; sharp corners (max 4px radius)
- **Word as hero** — display words up to 80px, Hanken Grotesk 700, tight `-0.04em` tracking
- **Spec-sheet layout** — numbered mono label column over hairline-ruled rows
- **Micro-typography** — JetBrains Mono uppercase markers: `[NO. 042]`, `[ENTRY. 1042]`, `ADJ`, `STATUS: ACTIVE`
- **Electric blue accent** (`#0037de`) reserved for interactivity: active nav, selected rows, links, hover states

### Core Tokens

| Token | Value |
|---|---|
| Primary | `#000000` |
| On-primary | `#ffffff` |
| Secondary (accent) | `#0037de` |
| Surface | `#f9f9f9` |
| Surface (lowest) | `#ffffff` |
| On-surface | `#1a1c1c` |
| On-surface-variant | `#444748` |
| Outline / Outline-variant | `#747878` / `#c4c7c7` |
| Success (practice flash) | `#2E8B57` |
| Error-soft (practice flash) | `#C94F4F` |
| Display font | Hanken Grotesk |
| Mono font | JetBrains Mono |
| Radius | 4px default — sharp rectangles |

---

## 🛠️ Development

```bash
# Clear Metro cache
npm run start -- --clear

# Type-check
npx tsc --noEmit

# Run tests
npm test

# Build / verify web bundle (dictionary asset + wasm)
npx expo export --platform web
```

> **Offline dictionary (EDMT).** `scripts/build-edmt-dictionary.mjs` converts
> `EDMTDictionary.json` → `assets/dictionary_indexed.json.gz` (merge multi-sense
> entries, map EDMT types like `(v. t.)`→`verb`, emit dual-shape words), then
> `scripts/build-sqlite-db.mjs` → `assets/lextro.db.gz` (the same rows in a
> prebuilt SQLite + FTS5 file, shipped as the native search backend).
> Loading branches by platform: web `fetch`es the gz asset URL + `pako.inflate`;
> native seeds `lextro.db` from the bundled DB once at warmup
> (`sqliteService.ts`) and opens it directly — startup never blocks on
> decompression or the 110k-row import.
