/**
 * EDMT → Lextro dictionary converter.
 *
 * Reads EDMTDictionary.json ({word, type, description}[], 176K entries) and
 * writes assets/dictionary_indexed.json.gz in the container format the app
 * expects: {version, totalWords, words, index, wordList, buildDate}.
 *
 * Each word is emitted in a dual shape so every consumer works:
 *  - flat  (definition/pos/synonyms/antonyms/tags) → searchByQuery + sqliteService
 *  - meanings[] → dictionaryApi.transformToVocabItem (detail modal, editor, home)
 *
 * Usage: node scripts/build-edmt-dictionary.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'EDMTDictionary.json');
const OUT = join(ROOT, 'assets', 'dictionary_indexed.json.gz');

if (!existsSync(SRC)) {
  console.error(`EDMT source not found: ${SRC}`);
  process.exit(1);
}

const EDMT_POS_MAP = [
  [/^v\.\s*t\.\s*&?\s*i\./, 'verb'],
  [/^v\.\s*t\./, 'verb'],
  [/^v\.\s*i\./, 'verb'],
  [/^v\./, 'verb'],
  [/^p\.\s*pr\./, 'verb'],
  [/^imp\./, 'verb'],
  [/^p\.\s*p\./, 'verb'],
  [/^n\.\s*sing\./, 'noun'],
  [/^n\.\s*pl\./, 'noun'],
  [/^n\./, 'noun'],
  [/^pl\./, 'noun'],
  [/^a\.\s*&/, 'adjective'],
  [/^a\./, 'adjective'],
  [/^superl\./, 'adjective'],
  [/^compar\./, 'adjective'],
  [/^adv\./, 'adverb'],
  [/^prep\./, 'preposition'],
  [/^conj\./, 'conjunction'],
  [/^interj\./, 'interjection'],
  [/^pron\./, 'pronoun'],
  [/^art\./, 'determiner'],
  [/^definite article/, 'determiner'],
  [/^indef\.?\s*art\./, 'determiner'],
  [/^num\./, 'determiner'],
];

const CROSSREF_RE = /^(see\s|cf\.?\s|compare\s|comp\.?\s|of\s+[A-Z])/i;

function hasType(type) {
  return String(type ?? '').replace(/[()]/g, '').trim() !== '';
}

function mapPos(type) {
  const t = String(type ?? '').replace(/[()]/g, '');
  for (const [re, pos] of EDMT_POS_MAP) {
    if (re.test(t)) return pos;
  }
  return 'unknown';
}

/** Join senses into a numbered definition string for single-field display. */
function mergeDefinitions(descriptions) {
  if (descriptions.length === 1) return descriptions[0];
  return descriptions.map((d, i) => `${i + 1}. ${d}`).join(' ');
}

console.log('[edmt] Reading EDMTDictionary.json...');
const entries = JSON.parse(readFileSync(SRC, 'utf8'));
console.log(`[edmt] ${entries.length} entries`);

const byWord = new Map();
for (const entry of entries) {
  const word = String(entry.word ?? '').trim().toLowerCase();
  const description = String(entry.description ?? '').trim();
  if (!word || !description) continue;
  if (!byWord.has(word)) byWord.set(word, []);
  byWord.get(word).push({ type: entry.type, description });
}

console.log(`[edmt] ${byWord.size} unique words`);

const words = [];
const index = {};
const wordList = [];

for (const [word, senses] of byWord) {
  const real = senses.filter((s) => !CROSSREF_RE.test(s.description));
  const pool = real.length > 0 ? real : senses;
  const typed = pool.filter((s) => hasType(s.type));
  const use = typed.length > 0 ? typed : pool;
  const descriptions = use.map((s) => s.description);
  const pos = mapPos(use[0]?.type);
  const definition = mergeDefinitions(descriptions);

  words.push({
    word,
    definition,
    pos,
    difficulty: 'medium',
    synonyms: [],
    antonyms: [],
    tags: ['edmt'],
    phonetic: '',
    phonetics: [],
    meanings: [
      {
        partOfSpeech: pos,
        definitions: [{ definition, synonyms: [], antonyms: [] }],
      },
    ],
    license: { name: 'EDMT', url: '' },
    sourceUrls: [],
    category: 'edmt',
  });
}

words.sort((a, b) => a.word.localeCompare(b.word));
words.forEach((w, i) => {
  index[w.word] = i;
  wordList.push(w.word);
});

const container = {
  version: 1,
  totalWords: words.length,
  words,
  index,
  wordList,
  buildDate: new Date().toISOString(),
};

const gz = gzipSync(Buffer.from(JSON.stringify(container), 'utf8'), {
  level: 9,
});
writeFileSync(OUT, gz);

console.log(`[edmt] Wrote ${OUT}`);
console.log(`[edmt] words: ${words.length}, gz bytes: ${gz.length} (${(gz.length / 1048576).toFixed(2)} MB)`);

const sample = ['abandon', 'zincograph', 'the', 'run', 'serendipity'];
for (const w of sample) {
  const idx = index[w];
  if (idx !== undefined) {
    const entry = words[idx];
    console.log(`  ${w} → pos=${entry.pos} def="${entry.definition.slice(0, 90)}..."`);
  } else {
    console.log(`  ${w} → MISSING`);
  }
}
