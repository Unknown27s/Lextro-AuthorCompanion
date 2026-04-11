# 📚 Lextro - Author Vocabulary Companion

A **lightweight PWA** for vocabulary learning that works entirely in the browser.

**Zero backend. Zero database. Zero monthly costs. Forever free.** ✨

---

## 🎯 Core Features

- ✅ **Browser-Based** - Entire app runs in browser (no backend needed)
- ✅ **Free Dictionary APIs** - Definitions, synonyms, examples, antonyms
- ✅ **Offline Support** - Works completely offline with PWA + Service Worker
- ✅ **Local Storage** - All data stored in browser (localStorage + IndexedDB)
- ✅ **Practice Modes** - Spaced repetition, flashcards, writing exercises
- ✅ **Word Tracking** - Alphabetical organization, duplicate detection, synonym linking
- ✅ **Mobile Ready** - Responsive design, PWA installable, Android app support
- ✅ **Dark Mode** - Beautiful light/dark themes with Tailwind CSS

---

## 📋 Documentation

Quick navigation to essential docs:

| Document | Purpose |
|----------|---------|
| **[QUICK_START.md](QUICK_START.md)** | 🚀 Setup & development guide |
| **[QUICK_INSTALL.md](QUICK_INSTALL.md)** | 📱 APK installation on Windows |
| **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** | 📊 Feature overview & architecture |
| **[CONNECTIVITY_ANALYSIS_REPORT.md](CONNECTIVITY_ANALYSIS_REPORT.md)** | 🔍 System integration analysis |
| **[PRACTICE_FEATURES.md](PRACTICE_FEATURES.md)** | 🎯 Practice modes & spaced repetition |
| **[WORD_TRACKING_FEATURES.md](WORD_TRACKING_FEATURES.md)** | 🏷️ Word organization & synonyms |

---

## 🚀 Quick Start (30 seconds)

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Open in Browser
```
http://localhost:5173
```

**→ See [QUICK_START.md](QUICK_START.md) for full setup instructions**

---

## 🏗️ Project Structure

```
AuthorCompanion/
├── frontend/                      # React + Vite PWA (main app)
│   ├── src/
│   │   ├── components/           # React UI components (18 files)
│   │   ├── services/             # Business logic & APIs (14 services)
│   │   ├── store/                # Redux state management
│   │   ├── api/                  # HTTP client & local storage
│   │   ├── data/                 # Dictionary data files (compressed)
│   │   ├── utils/                # Helper utilities
│   │   ├── styles/               # Tailwind CSS
│   │   ├── App.tsx               # Root component
│   │   └── main.tsx              # Entry point
│   ├── android/                  # Android app config (Capacitor)
│   ├── public/                   # PWA manifest, service worker, icons
│   ├── capacitor.config.ts       # Mobile app config
│   ├── vite.config.ts            # Build configuration
│   ├── tsconfig.json             # TypeScript config
│   └── package.json              # Dependencies
│
├── android/                      # Root Android project
├── ios/                          # iOS build files
├── scripts/                      # Build & utility scripts
│
└── Documentation Files (7):
    ├── README.md                 # This file
    ├── QUICK_START.md            # Setup guide
    ├── QUICK_INSTALL.md          # APK installation
    ├── IMPLEMENTATION_SUMMARY.md # Features overview
    ├── CONNECTIVITY_ANALYSIS_REPORT.md # System analysis
    ├── PRACTICE_FEATURES.md      # Practice modes
    └── WORD_TRACKING_FEATURES.md # Word organization
```

---

## 🔌 Tech Stack

**Frontend:**
- React 18.2 + TypeScript
- Vite (build tool)
- Redux Toolkit (state)
- Tailwind CSS (styling)
- Capacitor (mobile)

**APIs:**
- Free Dictionary API
- Wordnik API (optional)
- IndexedDB (offline data)
- localStorage (user data)

**Deployment:**
- PWA (Progressive Web App)
- Android APK via Capacitor
- Service Worker for offline

**Zero costs**: No backend, database, or paid services needed!

---

## 📊 Architecture Diagram

```
┌──────────────────────────────┐
│   Browser / Mobile App       │
│   (React + Vite PWA)         │
│                              │
│  ├─ Components               │
│  ├─ Redux Store              │
│  ├─ Services                 │
│  ├─ localStorage (user data) │
│  ├─ IndexedDB (vocab cache)  │
│  └─ Service Worker (offline) │
│                              │
├─ Dictionary APIs (read-only) │
└──────────────────────────────┘
```

---

## ✨ Key Capabilities

### Learning Features
- **Daily Vocabulary** - Featured word each day
- **Spaced Repetition** - Intelligent review scheduling
- **Practice Modes** - Quick, Standard, Focused practice
- **Flashcards** - Flip mode, Guess mode, dual switching
- **Writing Practice** - Fill-in-the-blank exercises

### Word Organization
- **Alphabetical Browsing** - Browse words A-Z
- **Duplicate Detection** - Auto-detect similar words
- **Synonym Linking** - Find related words
- **Word Tracking** - Track word relationships
- **Categories** - Organize by emotion, action, place, etc.

### Offline Support
- **Caching** - Dictionary data cached locally
- **Service Worker** - Offline access
- **IndexedDB** - Large data storage
- **Auto Sync** - Sync when back online

---

## 🌐 Deploy for Free

The app is static and can be deployed anywhere for free:
