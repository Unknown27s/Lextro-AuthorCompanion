/**
 * SQLite Service (Lextro)
 *
 * Offline FTS5 search layer. SQLite owns the *search index only* —
 * AsyncStorage remains the source of truth for user data (saved vocab,
 * streaks, SM-2 state).
 *
 * Schema:
 * - `words`      — full dictionary mirror (id = normalized word)
 * - `words_fts`  — FTS5 external-content index over word/definition/synonyms
 * - `saved_words`— mirror of the AsyncStorage user vocab (searchable)
 * - `meta`       — import bookkeeping (idempotent import guard)
 *
 * Designed to be the search backend for the upcoming offline OCR flow:
 * photograph a page → recognize text → searchFts() per word → tap to save.
 *
 * NOTE (web): this service uses the *async* expo-sqlite API
 * (openDatabaseAsync etc.) on purpose. The sync API routes through
 * invokeWorkerSync, which requires SharedArrayBuffer + Atomics — browsers
 * only expose those under cross-origin isolation (COOP/COEP headers), which
 * plain static hosts and the Expo dev server do not send. The async API
 * talks to the worker over postMessage promises, so it works everywhere.
 */

import {
  openDatabaseAsync,
  type SQLiteDatabase,
} from 'expo-sqlite';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import { inflate } from 'pako';

const DB_NAME = 'lextro.db';
const META_DICTIONARY_IMPORTED = 'dictionary_imported';
const META_SAVED_IMPORTED = 'saved_imported';

export interface SavedWordRow {
  vocab_item_id: string;
  word: string;
  status: string;
  practice_score: number;
  added_at: string;
}

interface WordRow {
  id: string;
  word: string;
  definition: string;
  pos: string;
  difficulty: string;
  synonyms: string;
  antonyms: string;
  tags: string;
  example_corpus: string;
  ai_example: string;
  created_at: string;
}

/** Core tables — always applied (FTS5 is optional on the web wa-sqlite build). */
const BASE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS words (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    definition TEXT NOT NULL DEFAULT '',
    pos TEXT NOT NULL DEFAULT '',
    difficulty TEXT NOT NULL DEFAULT '',
    synonyms TEXT NOT NULL DEFAULT '[]',
    antonyms TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]',
    example_corpus TEXT NOT NULL DEFAULT '',
    ai_example TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS saved_words (
    vocab_item_id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'saved',
    practice_score REAL NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

/** FTS5 virtual table. The web wa-sqlite build ships without the fts5 module,
 *  so this is applied best-effort and skipped when unavailable. */
const FTS_SCHEMA = `
  CREATE VIRTUAL TABLE IF NOT EXISTS words_fts USING fts5(
    word,
    definition,
    synonyms,
    content='words',
    content_rowid='rowid',
    tokenize='unicode61'
  );
`;

/** Escape a single token for FTS5 MATCH (bareword + prefix form). */
function escapeFtsToken(token: string): string {
  // Strip FTS5 special characters: " * : ^ ( ) { } ~
  const cleaned = token.replace(/["*:^(){}~]/g, '');
  return cleaned.trim();
}

/** Build a MATCH expression: per-token (word:tok* OR definition:tok*) ANDed. */
function buildMatchQuery(rawQuery: string): string {
  const tokens = rawQuery
    .toLowerCase()
    .split(/\s+/)
    .map(escapeFtsToken)
    .filter((t) => t.length > 0);

  if (tokens.length === 0) return '';

  return tokens
    .map((t) => `(word:${t}* OR definition:${t}* OR synonyms:${t}*)`)
    .join(' AND ');
}

/** Parse a stored JSON string column with a safe fallback. */
function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function toWordRow(w: any): WordRow {
  const word = String(w?.word ?? '').trim();
  return {
    id: word.toLowerCase(),
    word,
    definition: String(w?.definition ?? ''),
    pos: String(w?.pos ?? w?.type ?? ''),
    difficulty: String(w?.difficulty ?? 'medium'),
    synonyms: JSON.stringify(Array.isArray(w?.synonyms) ? w.synonyms : []),
    antonyms: JSON.stringify(Array.isArray(w?.antonyms) ? w.antonyms : []),
    tags: JSON.stringify(Array.isArray(w?.tags) ? w.tags : []),
    example_corpus: String(w?.example_corpus ?? ''),
    ai_example: String(w?.ai_example ?? ''),
    created_at: String(w?.created_at ?? ''),
  };
}

class SqliteService {
  private db: SQLiteDatabase | null = null;
  private dbPromise: Promise<SQLiteDatabase | null> | null = null;
  private initFailed = false;
  private ftsAvailable = true;
  private seedPromise: Promise<void> | null = null;
  private seedFailed = false;

  /**
   * Native only: inflate the bundled prebuilt database (assets/lextro.db.gz,
   * generated by scripts/build-sqlite-db.mjs) into expo-sqlite's directory
   * (documentDirectory/SQLite/) once. Subsequent launches skip because the file
   * already exists. On failure we degrade to the runtime import path
   * (ensureImported), so search still works — just slower on first run.
   *
   * Web keeps the runtime import path: wa-sqlite cannot consume the native DB
   * file the same way, and the in-memory dictionary is already available there.
   */
  private seedDatabaseFromAsset(): Promise<void> {
    if (Platform.OS === 'web' || this.seedFailed) {
      return Promise.resolve();
    }
    if (this.seedPromise) {
      return this.seedPromise;
    }

    this.seedPromise = (async () => {
      const sqliteDir = new Directory(Paths.document, 'SQLite');
      const dbFile = new File(sqliteDir, DB_NAME);
      if (dbFile.exists) {
        return; // already seeded
      }

      try {
        const asset = await Asset.fromModule(
          require('../../assets/lextro.db.gz'),
        ).downloadAsync();
        if (!asset.localUri) {
          throw new Error('Prebuilt DB asset localUri unavailable');
        }
        const bytes = await new File(asset.localUri).bytes();
        const dbBytes = inflate(bytes);
        sqliteDir.create({ intermediates: true, idempotent: true });
        await dbFile.write(dbBytes);
        console.log('[sqlite] Seeded prebuilt database');
      } catch (error) {
        this.seedFailed = true;
        console.warn(
          '[sqlite] DB seed failed — falling back to runtime import:',
          error,
        );
      } finally {
        this.seedPromise = null;
      }
    })();

    return this.seedPromise;
  }

  /**
   * Open (or return) the asynchronous database handle.
   * Never throws — a failed init degrades search to empty results.
   */
  private getDb(): Promise<SQLiteDatabase | null> {
    if (this.db) return Promise.resolve(this.db);
    if (this.dbPromise) return this.dbPromise;
    if (this.initFailed) return Promise.resolve(null);

    this.dbPromise = (async () => {
      try {
        await this.seedDatabaseFromAsset();
        const db = await openDatabaseAsync(DB_NAME);
        await db.execAsync(BASE_SCHEMA);
        try {
          await db.execAsync(FTS_SCHEMA);
        } catch (error) {
          this.ftsAvailable = false;
          console.warn('[sqlite] FTS5 unavailable, search degrades to LIKE:', error);
        }
        this.db = db;
        return db;
      } catch (error) {
        this.initFailed = true;
        console.warn('[sqlite] Failed to open database:', error);
        return null;
      } finally {
        this.dbPromise = null;
      }
    })();

    return this.dbPromise;
  }

  private async getMeta(key: string): Promise<string | null> {
    const db = await this.getDb();
    if (!db) return null;
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM meta WHERE key = ?',
      key,
    );
    return row?.value ?? null;
  }

  private async setMeta(key: string, value: string): Promise<void> {
    const db = await this.getDb();
    if (!db) return;
    await db.runAsync(
      'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)',
      key,
      value,
    );
  }

  /**
   * Idempotent import. Pass the loaded dictionary words and the current
   * saved-vocab items; both are mirrored into SQLite on first run only.
   */
  async ensureImported(words: any[], savedItems: any[]): Promise<boolean> {
    const db = await this.getDb();
    if (!db) return false;

    if ((await this.getMeta(META_DICTIONARY_IMPORTED)) !== '1') {
      try {
        await db.withTransactionAsync(async () => {
          await db.execAsync('DELETE FROM words;');
          const insert = await db.prepareAsync(`
            INSERT OR REPLACE INTO words (
              id, word, definition, pos, difficulty,
              synonyms, antonyms, tags,
              example_corpus, ai_example, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          try {
            for (const raw of words) {
              const w = toWordRow(raw);
              if (!w.id) continue;
              await insert.executeAsync(
                w.id,
                w.word,
                w.definition,
                w.pos,
                w.difficulty,
                w.synonyms,
                w.antonyms,
                w.tags,
                w.example_corpus,
                w.ai_example,
                w.created_at,
              );
            }
          } finally {
            await insert.finalizeAsync();
          }
          if (this.ftsAvailable) {
            // Populate the FTS5 index from the content table.
            await db.execAsync("INSERT INTO words_fts(words_fts) VALUES('rebuild');");
          }
        });
        await this.setMeta(META_DICTIONARY_IMPORTED, '1');
        console.log('[sqlite] Dictionary imported:', words.length);
      } catch (error) {
        console.warn('[sqlite] Dictionary import failed:', error);
        return false;
      }
    }

    if ((await this.getMeta(META_SAVED_IMPORTED)) !== '1') {
      try {
        await db.withTransactionAsync(async () => {
          await db.execAsync('DELETE FROM saved_words;');
          const upsert = await db.prepareAsync(`
            INSERT OR REPLACE INTO saved_words (
              vocab_item_id, word, status, practice_score, added_at
            ) VALUES (?, ?, ?, ?, ?)
          `);
          try {
            for (const item of savedItems) {
              const vocab = item?.vocab_item;
              const word = String(vocab?.word ?? '').trim();
              if (!item?.vocab_item_id || !word) continue;
              await upsert.executeAsync(
                String(item.vocab_item_id),
                word,
                String(item?.status ?? 'saved'),
                Number(item?.practice_score ?? 0),
                String(item?.added_at ?? ''),
              );
            }
          } finally {
            await upsert.finalizeAsync();
          }
        });
        await this.setMeta(META_SAVED_IMPORTED, '1');
        console.log('[sqlite] Saved vocab mirrored:', savedItems.length);
      } catch (error) {
        console.warn('[sqlite] Saved vocab import failed:', error);
        return false;
      }
    }

    return true;
  }

  /**
   * FTS5 full-text search over word/definition/synonyms with prefix matching.
   * Falls back to a plain LIKE scan if FTS5 MATCH is unavailable.
   */
  async searchFts(query: string, limit: number = 15): Promise<any[]> {
    const db = await this.getDb();
    if (!db) return [];

    const normalized = query.trim();
    if (!normalized) return [];

    if (!this.ftsAvailable) {
      return this.likeSearch(db, normalized, limit);
    }

    try {
      const match = buildMatchQuery(normalized);
      if (!match) return [];

      const rows = await db.getAllAsync<WordRow>(
        `SELECT w.*
           FROM words_fts f
           JOIN words w ON w.rowid = f.rowid
          WHERE words_fts MATCH ?
          ORDER BY
            CASE
              WHEN LOWER(w.word) = LOWER(?) THEN 0
              WHEN LOWER(w.word) LIKE LOWER(?) THEN 1
              ELSE 2
            END,
            bm25(words_fts)
          LIMIT ?`,
        match,
        normalized,
        `${normalized}%`,
        limit,
      );
      return rows.map((r) => ({
        word: r.word,
        definition: r.definition,
        pos: r.pos,
        difficulty: r.difficulty,
        synonyms: parseJsonArray(r.synonyms),
        antonyms: parseJsonArray(r.antonyms),
        tags: parseJsonArray(r.tags),
        example_corpus: r.example_corpus,
        ai_example: r.ai_example,
        created_at: r.created_at,
      }));
    } catch (error) {
      // MATCH may fail on exotic input — degrade to a LIKE scan.
      console.warn('[sqlite] FTS search failed, using LIKE fallback:', error);
      try {
        return this.likeSearch(db, normalized, limit);
      } catch (fallbackError) {
        console.warn('[sqlite] LIKE fallback failed:', fallbackError);
        return [];
      }
    }
  }

  private async likeSearch(
    db: SQLiteDatabase,
    normalized: string,
    limit: number,
  ): Promise<any[]> {
    const rows = await db.getAllAsync<WordRow>(
      `SELECT * FROM words
        WHERE word LIKE ? OR definition LIKE ?
        ORDER BY CASE WHEN word LIKE ? THEN 0 ELSE 1 END, word
        LIMIT ?`,
      `${normalized}%`,
      `%${normalized}%`,
      `${normalized}%`,
      limit,
    );
    return rows.map((r) => ({
      word: r.word,
      definition: r.definition,
      pos: r.pos,
      difficulty: r.difficulty,
      synonyms: parseJsonArray(r.synonyms),
      antonyms: parseJsonArray(r.antonyms),
      tags: parseJsonArray(r.tags),
      example_corpus: r.example_corpus,
      ai_example: r.ai_example,
      created_at: r.created_at,
    }));
  }

  /** Words whose spelling starts with `prefix` (dictionary "RELATED" chips). */
  async searchPrefix(prefix: string, limit: number = 10): Promise<string[]> {
    const db = await this.getDb();
    if (!db) return [];
    const normalized = prefix.toLowerCase().trim();
    if (!normalized) return [];
    const escaped = normalized.replace(/[%_\\]/g, '\\$&');
    const rows = await db.getAllAsync<{ word: string }>(
      `SELECT word FROM words WHERE id LIKE ? ESCAPE '\\' ORDER BY LENGTH(id), id LIMIT ?`,
      `${escaped}%`,
      limit,
    );
    return rows.map((r) => r.word);
  }

  /** Exact word lookup from SQLite. Returns null when absent. */
  async getWord(word: string): Promise<any | null> {
    const db = await this.getDb();
    if (!db) return null;

    const normalized = word.toLowerCase().trim();
    if (!normalized) return null;

    const row = await db.getFirstAsync<WordRow>(
      'SELECT * FROM words WHERE id = ?',
      normalized,
    );
    if (!row) return null;

    return {
      word: row.word,
      definition: row.definition,
      pos: row.pos,
      difficulty: row.difficulty,
      synonyms: parseJsonArray(row.synonyms),
      antonyms: parseJsonArray(row.antonyms),
      tags: parseJsonArray(row.tags),
      example_corpus: row.example_corpus,
      ai_example: row.ai_example,
      created_at: row.created_at,
    };
  }

  /** Bulk exact lookup. Returns a map of word -> { definition, pos, difficulty }. */
  async getWordsExact(
    words: string[],
  ): Promise<Record<string, { definition: string; pos: string; difficulty: string }>> {
    const db = await this.getDb();
    const out: Record<string, { definition: string; pos: string; difficulty: string }> = {};
    if (!db || words.length === 0) return out;

    const unique = Array.from(
      new Set(words.map((w) => w.toLowerCase().trim()).filter(Boolean)),
    );
    const CHUNK = 400; // stay well under SQLite's variable limit
    for (let i = 0; i < unique.length; i += CHUNK) {
      const chunk = unique.slice(i, i + CHUNK);
      const placeholders = chunk.map(() => '?').join(',');
      const rows = await db.getAllAsync<{
        word: string;
        definition: string;
        pos: string;
        difficulty: string;
      }>(
        `SELECT word, definition, pos, difficulty FROM words WHERE id IN (${placeholders})`,
        ...chunk,
      );
      for (const row of rows) {
        out[row.word.toLowerCase()] = {
          definition: row.definition,
          pos: row.pos,
          difficulty: row.difficulty,
        };
      }
    }
    return out;
  }

  /** Random dictionary rows — cheap practice-pool filler (no in-memory load). */
  async getRandomWords(count: number): Promise<any[]> {
    const db = await this.getDb();
    if (!db) return [];
    if (count <= 0) return [];

    const rows = await db.getAllAsync<WordRow>(
      'SELECT * FROM words ORDER BY RANDOM() LIMIT ?',
      count,
    );
    return rows.map((r) => ({
      word: r.word,
      definition: r.definition,
      pos: r.pos,
      difficulty: r.difficulty,
      synonyms: parseJsonArray(r.synonyms),
      antonyms: parseJsonArray(r.antonyms),
      tags: parseJsonArray(r.tags),
      example_corpus: r.example_corpus,
      ai_example: r.ai_example,
      created_at: r.created_at,
    }));
  }

  /** Total dictionary words in SQLite (0 if not imported yet). */
  async getWordCount(): Promise<number> {
    const db = await this.getDb();
    if (!db) return 0;
    const row = await db.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM words',
    );
    return row?.n ?? 0;
  }

  /** Saved-vocab mirror rows (searchable). */
  async getSavedWords(): Promise<SavedWordRow[]> {
    const db = await this.getDb();
    if (!db) return [];
    return db.getAllAsync<SavedWordRow>(
      'SELECT * FROM saved_words ORDER BY word',
    );
  }

  async isImported(): Promise<boolean> {
    return (await this.getMeta(META_DICTIONARY_IMPORTED)) === '1';
  }
}

export const sqliteService = new SqliteService();
