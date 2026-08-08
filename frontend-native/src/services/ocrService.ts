/**
 * OCR Service — capture text from a photo and turn it into dictionary specimens.
 *
 * Pipeline mirrors the Editor's "scan document" flow but starts from a camera
 * image instead of pasted text:
 *   1. capture an image URI (via expo-camera, done by the caller)
 *   2. native ML Kit text recognition → raw text  (web → paste-text fallback)
 *   3. cleanup pass: split, lowercase, strip punctuation/numbers, drop short
 *      words, dedupe — same shape as EditorScreen.extractWords
 *   4. caller feeds each candidate into sqliteService.searchFts / dictionaryApi
 *
 * The ML Kit module is native-only. It is imported lazily so the web build
 * never statically resolves it; on web we fall back to user-pasted text so
 * `expo export --platform web` stays green.
 */

import { Platform } from 'react-native';

const MIN_WORD_LENGTH = 4;

/**
 * Split raw OCR text into unique, cleaned candidate words.
 *
 * Lowercases, keeps only letter runs (allow interior  apostrophes/hyphens),
 * strips punctuation and digits, drops anything shorter than MIN_WORD_LENGTH,
 * and de-dupes while preserving first-seen order.
 */
export function cleanupOcrText(raw: string): string[] {
  const words = raw.toLowerCase().match(/[a-z][a-z'-]*/g) || [];
  const found = new Map<string, string>();
  for (const w of words) {
    const clean = w.replace(/['-]/g, '');
    if (clean.length < MIN_WORD_LENGTH) continue;
    if (!found.has(clean)) found.set(clean, clean);
  }
  return Array.from(found.values());
}

type OcrRecognizeFn = (imageUri: string, detectorType?: string) => Promise<{
  text: string;
}>;

// Resolved once. `import()` keeps the native module out of the web bundle.
let nativeOcr: OcrRecognizeFn | null | undefined;

async function loadNativeOcr(): Promise<OcrRecognizeFn | null> {
  if (nativeOcr !== undefined) return nativeOcr;
  try {
    const mod = await import('rn-mlkit-ocr');
    nativeOcr = mod.default?.recognizeText ?? null;
  } catch (err) {
    console.warn('[ocr] ML Kit module unavailable:', err);
    nativeOcr = null;
  }
  return nativeOcr ?? null;
}

/**
 * Recognize text from an image URI on native devices. Uses ML Kit (latin) via
 * lazy import. Returns an empty result on web — callers should use
 * recognizeFromText(raw) instead there so the web build stays native-free.
 */
export async function recognizeImage(imageUri: string): Promise<string> {
  if (Platform.OS === 'web') return '';
  const fn = await loadNativeOcr();
  if (!fn) throw new Error('OCR engine not available on this device');
  const result = await fn(imageUri, 'latin');
  return result.text;
}

/** Lift recognized text (wherever it came from) into cleaned candidate words. */
export function wordsFromCapturedText(raw: string): string[] {
  return cleanupOcrText(raw);
}