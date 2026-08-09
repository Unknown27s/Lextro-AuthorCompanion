/**
 * Builds the prebuilt SQLite search database (assets/lextro.db.gz) from the
 * bundled dictionary container (assets/dictionary_indexed.json.gz).
 *
 * Why: native app startup copies + inflates this DB once and opens it directly
 * (see sqliteService.seedDatabaseFromAsset), which eliminates:
 *   - the 110k-row first-run SQLite import (minutes on mobile), and
 *   - the per-launch gz decompression + JSON.parse of the whole dictionary.
 *
 * The schema below MUST stay in sync with src/services/sqliteService.ts.
 *
 * Usage: node scripts/build-sqlite-db.mjs   (or npm run build:db)
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GZ_IN = join(ROOT, 'assets', 'dictionary_indexed.json.gz');
const DB_OUT = join(ROOT, 'assets', 'lextro.db');
const GZ_OUT = join(ROOT, 'assets', 'lextro.db.gz');

if (!existsSync(GZ_IN)) {
  console.error(`[db] Dictionary asset not found: ${GZ_IN}`);
  console.error('[db] Run scripts/build-edmt-dictionary.mjs first.');
  process.exit(1);
}

/** Same row transform as sqliteService.toWordRow — keep in sync. */
function toWordRow(w) {
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

// ── 1. Inflate the dictionary container ──────────────────────────────────
console.log('[db] Reading', GZ_IN);
const container = JSON.parse(gunzipSync(readFileSync(GZ_IN)).toString('utf8'));
const words = container.words ?? [];
console.log(`[db] ${words.length} words`);

// ── 2. Create the database (schema mirrors sqliteService.ts) ─────────────
const db = new DatabaseSync(DB_OUT);
db.exec(`
  PRAGMA journal_mode = OFF;
  PRAGMA synchronous = OFF;
  PRAGMA temp_store = MEMORY;
`);

db.exec(`
  CREATE TABLE words (
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

  CREATE TABLE saved_words (
    vocab_item_id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'saved',
    practice_score REAL NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE VIRTUAL TABLE words_fts USING fts5(
    word,
    definition,
    synonyms,
    content='words',
    content_rowid='rowid',
    tokenize='unicode61'
  );
`);

// ── 3. Insert all rows in one transaction ────────────────────────────────
const insert = db.prepare(`
  INSERT OR REPLACE INTO words (
    id, word, definition, pos, difficulty,
    synonyms, antonyms, tags,
    example_corpus, ai_example, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

db.exec('BEGIN');
let inserted = 0;
for (const w of words) {
  const row = toWordRow(w);
  if (!row.id) continue;
  insert.run(
    row.id,
    row.word,
    row.definition,
    row.pos,
    row.difficulty,
    row.synonyms,
    row.antonyms,
    row.tags,
    row.example_corpus,
    row.ai_example,
    row.created_at,
  );
  inserted += 1;
}
db.exec('COMMIT');
console.log(`[db] Inserted ${inserted} rows`);

// ── 4. Rebuild the FTS5 index from the content table ─────────────────────
db.exec("INSERT INTO words_fts(words_fts) VALUES('rebuild');");
console.log('[db] FTS5 index rebuilt');

// ── 5. Mark the dictionary as imported so runtime skips the import ───────
db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(
  'dictionary_imported',
  '1',
);

// ── 6. Compact, close, ship gzipped ──────────────────────────────────────
db.exec('VACUUM;');
db.close();

const rawSize = (s) => (s / 1048576).toFixed(2);
const raw = readFileSync(DB_OUT);
const gz = gzipSync(raw, { level: 9 });
writeFileSync(GZ_OUT, gz);
unlinkSync(DB_OUT);

console.log(`[db] Wrote ${GZ_OUT}`);
console.log(`[db] db: ${rawSize(raw.length)} MB, gz: ${rawSize(gz.length)} MB`);
