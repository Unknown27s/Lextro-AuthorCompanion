# Lextro BOOKS — Reader & Vocabulary Design

Date: 2026-10-17
Status: Approved (design), pending implementation
Repo: `F:\Git_floder_Project\AuthorCompanion` (app root: `frontend-native/`)

---

## 1. Goal

Add a **BOOKS** subsystem to Lextro that lets a user:

1. **Acquire** books — browse/download from the free Gutendex (Project Gutenberg) API,
   or import a local EPUB/TXT from the device.
2. **Read** the book inside Lextro, paginated, with every word tappable.
3. **Look up** any tapped word in the existing offline dictionary (110k words) via the
   existing `WordDetailModal`.
4. **Save** a word to the Library (favorites) from either the reader or the word view.
5. **See all words on a page** in a page-wise vocabulary view, with large tappable chips
   and a search bar across the whole book.
6. **Bookmark** pages and resume from the last-read page (CONTINUE READING + progress).

The **Editor** tab is removed (user request); its slot becomes the **BOOKS** tab.

## 2. Non-goals

- No backend, no accounts, no cloud sync (matches the app's "zero backend, zero cost" ethos).
- No PDF support (RN has no built-in PDF reader; out of scope).
- No "hard/difficult word" detection. The user explicitly declined it: the vocabulary
  view shows **all** words on a page.
- No CSS-faithful EPUB rendering. EPUB is reduced to plain text (chapters + pages).

## 3. Existing assets reused (do not rebuild)

| Need | Existing asset |
|---|---|
| Tap-a-word definition | `src/services/sqliteService.ts` — `getWord()`, `searchFts()`, `getWordsExact()` (to add) |
| Word detail + SAVE → Library | `src/components/WordDetailModal.tsx` + `localStorageApi.saveVocab()` in `src/api/client.ts` |
| Design language | `src/theme/index.ts` (Type Foundry: hairline frames, mono labels, `#0037de`) |
| Synchronous local persistence | `localStorage` polyfill, `src/utils/storage.ts` |
| Async large-file storage | `expo-file-system` (already installed) |
| Compression | `pako` (already installed) |
| Screen chrome | `src/components/ScreenShell.tsx` (Header + Settings modals) |
| Responsive sizing | `src/services/responsiveService.ts` (`useResponsive`) |

**Dictionary constraint:** the `difficulty` column in the SQLite `words` table is
hardcoded `'medium'` for every row (`scripts/build-edmt-dictionary.mjs` line 108), so it
must never be used as a difficulty signal. It is irrelevant to this design.

## 4. Architecture — units

Each unit has one purpose, a narrow interface, and can be tested independently.

```
src/services/bookApi.ts              Gutendex search/browse + resolve download URL (network only)
src/services/bookLibraryService.ts   Download file, persist metadata, list/delete (FileSystem + AsyncStorage)
src/services/bookParser.ts           EPUB/TXT -> chapters -> pages (JSZip for EPUB, plain text)
src/services/bookWordIndex.ts        Per-page distinct word list + global searchable index
src/services/bookmarkService.ts      Reading positions + bookmarks
src/screens/BooksScreen.tsx          Route owner: catalog | detail | reader
src/components/books/BookCatalog.tsx MY BOOKS + BROWSE (Gutendex) + IMPORT
src/components/books/BookDetail.tsx  Cover, progress, CONTINUE, VOCABULARY, BOOKMARKS
src/components/books/Reader.tsx      Paginated text, tap word, bookmark, progress bar
src/components/books/PageText.tsx    Tokenize a page into tappable <Text> words
src/components/books/BookCard.tsx    Hairline book card/row
src/components/books/WordChipGrid.tsx All-words-on-page chip grid (large touch targets)
src/components/books/BookSearchBar.tsx Search field for the book word index
src/types/books.ts                   Shared Book/BookPage/Bookmark/HardWord-free types
```

**Ownership rule:** screens own navigation/route state; services own data. Screens never
touch `expo-file-system` directly — only `bookLibraryService` does.

### Dependency direction

```
BooksScreen
  -> BookCatalog | BookDetail | Reader        (presentation)
       -> bookLibraryService, bookParser, bookWordIndex, bookmarkService, bookApi
            -> sqliteService, localStorage polyfill, expo-file-system, JSZip, pako
WordDetailModal (existing, reused unchanged)
```

## 5. Data model

```ts
// src/types/books.ts
export type BookSource = 'gutenberg' | 'local';
export type BookFormat = 'epub' | 'txt';

export interface Book {
  id: string;            // 'gutenberg:1342' | 'local:<sha1-of-file>'
  title: string;
  author: string;
  source: BookSource;
  format: BookFormat;
  language?: string;
  coverUrl?: string;     // Gutenberg cover; undefined for local
  fileUri: string;       // documentDirectory/books/<id>.(epub|txt)
  sizeBytes: number;
  pageCount: number;     // filled after first parse
  addedAt: string;       // ISO
}

export interface BookPage {
  bookId: string;
  index: number;         // global, 0-based
  chapterIndex: number;
  chapterTitle?: string;
  text: string;
  wordCount: number;
}

export interface Chapter {
  index: number;         // 0-based
  title: string;
  startPage: number;
  pageCount: number;
}

export interface ReadingPosition {
  bookId: string;
  pageIndex: number;
  progress: number;      // 0..1
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  pageIndex: number;
  chapterTitle?: string;
  excerpt: string;       // first ~80 chars of the page
  note?: string;
  createdAt: string;
}

export interface PageWord {
  word: string;          // lowercase clean token
  pageIndex: number;
  chapterIndex: number;
  count: number;         // occurrences on that page
}
```

## 6. Storage layout

| Data | Location | Notes |
|---|---|---|
| Book index (metadata list) | AsyncStorage key `books` via `localStorage` polyfill | sync read/write, mirrors `userVocab` pattern |
| Book files | `documentDirectory/books/<id>.<ext>` | written once at download/import |
| Parsed pages | `documentDirectory/books/<id>.pages.json.gz` | gzip via `pako`; avoids re-parsing |
| Word index | `documentDirectory/books/<id>.words.json.gz` | per-page distinct words |
| Reading positions | AsyncStorage key `reading_positions` | map keyed by bookId |
| Bookmarks | AsyncStorage key `bookmarks` | flat array |

Pages and the word index are both derived artifacts: if missing, they are regenerated
from the book file and rewritten. Deleting a book removes its file and both caches.

## 7. Acquisition

### 7.1 Gutendex (Project Gutenberg)

Base: `https://gutendex.com/books`.

- `searchGutendex(query, page)` -> `search?search=<q>&page=<n>`
- `browseGutendex(topic, page)` -> `?topic=<t>&page=<n>` (topic from the Gutendex "bookshelves")
- `popularGutendex()` -> `?sort=popular`
- Response `results[]` -> `Book` shape: `id`, `title`, `authors[0].name`, `languages[0]`,
  `formats` map, `download_count`.

**Format resolution order** (first match wins): `application/epub+zip` ->
`text/plain; charset=utf-8` -> `text/plain; charset=us-ascii`. Skip `text/html`.

- EPUB URL -> `format: 'epub'`; TXT URL -> `format: 'txt'`.
- Cover: `formats['image/jpeg']` -> `coverUrl`.
- Book id: `gutenberg:<gutendex id>`.

Download: `bookLibraryService.downloadBook(book)` fetches the resolved URL to
`documentDirectory/books/<id>.<ext>`, then persists the metadata record.

Errors: network failure -> surface a `DOWNLOAD FAILED — RETRY` state on the card; the
partial file is deleted. No silent failures.

### 7.2 Local import

`expo-document-picker` (`getDocumentAsync`) filtered to `application/epub+zip` and
`text/plain`. Copy the picked file into `documentDirectory/books/local-<sha1>.<ext>`
(so it survives the picker's temp URL). Title defaults to the filename (extension
stripped); author defaults to `UNKNOWN`.

## 8. Parsing & pagination

### 8.1 TXT

- Read file as UTF-8 string.
- Normalize line endings; split into chapters on common Gutenberg heading patterns
  (`CHAPTER [IVXLC0-9]+`, `PART ...`, or 2+ blank lines around an all-caps short line).
  If no headings are found, the whole book is one chapter titled `TEXT`.
- Strip a leading Project Gutenberg boilerplate block if the standard
  `*** START OF` / `*** END OF` markers are present.

### 8.2 EPUB

- Unzip with JSZip.
- Read `META-INF/container.xml` -> OPF path.
- Parse OPF `<manifest>` + `<spine>` to get reading order of XHTML items.
- For each spine item: read the XHTML, strip tags to text (decode the common entities
  `&amp; &lt; &gt; &quot; &#39; &nbsp;`), collapse whitespace.
- Each spine item becomes a chapter; chapter title from the first `<h1>/<h2>/<title>`
  if present, else `CHAPTER <n>`.
- Broken/missing spine -> fall back to all `.xhtml`/`.html` entries sorted by path.

### 8.3 Pagination (both formats)

Deterministic: split each chapter's text into pages of **220 words** (configurable
constant `WORDS_PER_PAGE`). Last page of a chapter absorbs the remainder. Every page
records `chapterIndex`, `chapterTitle`, `text`, `wordCount`. Result: `BookPage[]` plus a
`Chapter[]` index with `startPage`/`pageCount`.

Pagination is pure: same input text -> same page boundaries. This is what the parser
tests lock down.

## 9. Word index (all words, page-wise)

`bookWordIndex.build(pages)`:

1. For each page, tokenize `text` with `/[A-Za-z][A-Za-z'-]*/g`, lowercase, strip
   interior `'`/`-` for the lookup key, keep the original token for display.
2. Count occurrences per page; produce `PageWord[]` grouped by `pageIndex`.
3. Also build a book-level map `word -> pageIndexes[]` for search.
4. **No filtering by difficulty and no stoplist** — every alphabetic token of length
   >= 2 is kept (single letters and pure numbers are dropped as noise).

Cached to `<id>.words.json.gz`.

**Search:** `searchWords(bookId, query)` returns matching `word` entries with the list of
page indexes, ordered: exact match first, then prefix match, then substring match.

## 10. Reader UX

- Full-screen modal opened from Book Detail (and from catalog card "CONTINUE").
- Layout, top to bottom:
  - Header row: chapter title (mono, uppercase, truncated) + `PAGE 012/240`.
  - Body: `PageText` — the page rendered as flowing text; each word is an
    `onPress` token. Tapping opens `WordDetailModal` (existing) and pauses.
  - Footer: `◀ PREV` · `★ BOOKMARK` · `NEXT ▶`, plus a hairline progress bar and
    `% READ` mono label.
- Changing page writes the reading position (debounced 500 ms).
- Rendering budget: 220 words/page <= ~220 `<Text>` nodes — acceptable for RN.
- Word tap resolution: exact `sqliteService.getWord(token)`; on miss, fall back to
  `searchFts(token, 1)`; on total miss, show the modal with a "NO ENTRY FOUND"
  definition and still allow SAVE (same behavior as the Editor-produced items).

## 11. Book Detail UX

- Identity plate: cover (or a mono placeholder tile), title (display), author, format
  chip (`EPUB`/`TXT`), source chip (`GUTENBERG`/`LOCAL`).
- `CONTINUE READING — PAGE 012` primary button (or `START READING`), plus `% READ`.
- `VOCABULARY` section:
  - `BookSearchBar` at the top — filters the book word index live.
  - Below it, page-wise groups: `PAGE 012` header then a `WordChipGrid` of that page's
    words. Chips are large touch targets (min 44 px height, 12 px gutters).
  - Search results replace the page groups: `word — PAGES 12, 40, 101`; tapping a result
    opens the word modal and offers `GO TO PAGE`.
- `BOOKMARKS` section: list of bookmarks with excerpt + page; tap -> open reader at that
  page; long-press -> delete (same gesture as the catalog).

## 12. Catalog UX

`BooksScreen` route state: `{name:'catalog'} | {name:'detail', bookId} | {name:'reader', bookId, pageIndex}`.

Catalog has two segments (mono toggle):

- **MY BOOKS** — cards from `bookLibraryService.list()` with progress; tap -> detail;
  long-press -> delete confirm.
- **BROWSE** — Gutendex search field + results; each result has a `DOWNLOAD` action that
  becomes `DOWNLOADING…` then `IN LIBRARY`.
- **IMPORT** — an action button in the catalog's own top bar (the same in-screen bar
  pattern `SavedScreen` uses; BooksScreen renders it inside `ScreenShell`, above its
  content, not in the global `Header`).

Empty state: `NO BOOKS YET — IMPORT A FILE OR BROWSE THE CATALOG`.

## 13. Navigation change

Tabs stay 5: `Home · Saved · Books · Practice · Profile`.

- `AppNavigator.tsx`: remove `Editor`, add `Books` (component `BooksScreen`).
- `TabBarIcon.tsx`: remove `Editor` glyph, add `Books` glyph (`▤`).
- No new navigation library. `BookDetail` and `Reader` are rendered inside `BooksScreen`
  (Reader as a full-screen `Modal`, matching the `ScreenShell` modal pattern).

## 14. Editor removal

Delete:
- `src/screens/EditorScreen.tsx`
- `src/components/InlineWordSuggestion.tsx` (only Editor consumed it)

Edit:
- `src/navigation/AppNavigator.tsx` — drop Editor import/type/screen; add Books.
- `src/navigation/TabBarIcon.tsx` — drop `Editor`, add `Books`.
- `src/services/ocrService.ts` — comments reference the Editor; reword to reference the
  camera capture flow only (the service is still used by `CameraModal`).
- `README.md` — replace the Editor row with the Books row; update the tab list.

Unaffected (must keep working): `CameraModal`, `ocrService`, `WordDetailModal`,
`SettingsModal`, `ScreenShell`.

## 15. Dependencies to add

| Package | Why | Install |
|---|---|---|
| `expo-document-picker` | local file import | `npx expo install expo-document-picker` |
| `jszip` | EPUB unzip | `npm i jszip` |

Both are free, offline-capable at runtime, and add no backend.

## 16. Testing (Jest, existing `react-native` preset)

| Test | Locks down |
|---|---|
| `bookParser.test.ts` | TXT -> deterministic page count & boundaries; chapter split; boilerplate strip |
| `bookParser.epub.test.ts` | OPF/spine order -> chapters (fixture zip, built in-test with JSZip) |
| `bookWordIndex.test.ts` | per-page distinct words; no stoplist filtering; search ordering |
| `bookLibraryService.test.ts` | metadata CRUD + delete removes file & caches (fs mocked) |
| `bookmarkService.test.ts` | position upsert; bookmark add/delete; resume page |
| `bookApi.test.ts` | Gutendex payload -> `Book`; format resolution order |

Tests mock `expo-file-system` and `AsyncStorage` (the latter already has a Jest mock
configured in `package.json`). No network in tests.

## 17. Phases

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **1** | Editor removed; BOOKS tab added; `BooksScreen` catalog shell (empty state + segments) | `tsc --noEmit` clean; `npm test` green; app builds; BOOKS tab renders |
| **2** | `bookLibraryService` + `bookParser` (TXT) + `Reader` + tap-to-define + SAVE | Import a TXT, read paginated, tap a word, save it, see it in Library |
| **3** | `bookApi` (Gutendex) + EPUB parsing + download flow | Browse catalog, download an EPUB, open and read it |
| **4** | `bookWordIndex` + page-wise `WordChipGrid` + `BookSearchBar` | Book Detail shows all words per page as tappable chips; search filters them |
| **5** | `bookmarkService` + last-read marker + CONTINUE READING + progress | Leave a book, reopen, resume on the same page; bookmarks list works |

## 18. Risks & mitigations

| Risk | Mitigation |
|---|---|
| JSZip on RN needs a binary-compatible read of the file | Read EPUB via `expo-file-system` `File.bytes()` and pass an `ArrayBuffer` to JSZip |
| Large books (1M+ words) memory | Pages cached to disk gzip; only the current page is held in memory; parse off the render path with a loading state |
| Gutendex rate limits / offline | Card shows retry state; catalog is only needed for Browse — reading is fully offline |
| 220-word pages drift with fonts | Pagination is word-count based, not pixel based, so it is deterministic and font-independent |
| Reused `WordDetailModal` expects `VocabItem` | `bookLibraryService` builds a `VocabItem` from a dictionary hit (same transform the Editor used) |

## 19. Decisions log

- **No difficulty filtering** — user explicitly declined "hard word" detection; all words shown.
- **Reuse `WordDetailModal`** — user chose consistency over a new compact sheet.
- **Plain-text EPUB** — avoids `react-native-render-html` and native viewer deps.
- **State-machine navigation** — avoids adding `@react-navigation/native-stack`.
- **Deterministic word-count pagination** — testable and font-independent.
