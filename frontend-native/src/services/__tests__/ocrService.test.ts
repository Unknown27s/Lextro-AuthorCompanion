/**
 * Unit tests for the OCR text cleanup pipeline.
 *
 * Pure logic over raw OCR/pasted text: split, lowercase, strip punctuation
 * and digits, drop short words, and de-dupe preserving first-seen order.
 */

import { cleanupOcrText, wordsFromCapturedText } from '../ocrService';

describe('cleanupOcrText', () => {
  it('splits a sentence into lowercase words, dropping short ones', () => {
    expect(cleanupOcrText('The Quick Brown Fox')).toEqual(['quick', 'brown']);
  });

  it('strips punctuation and digits', () => {
    expect(cleanupOcrText('Hello, world! 42 answers; "quoted" text.')).toEqual([
      'hello',
      'world',
      'answers',
      'quoted',
      'text',
    ]);
  });

  it('drops words shorter than 4 letters', () => {
    expect(cleanupOcrText('a to be it run cat book')).toEqual(['book']);
  });

  it('de-dupes while preserving first-seen order', () => {
    expect(cleanupOcrText('book book the BOOK shelf shelf')).toEqual(['book', 'shelf']);
  });

  it('collapses interior apostrophes and hyphens', () => {
    expect(cleanupOcrText("don't worry — well-being matters")).toEqual([
      'dont',
      'worry',
      'wellbeing',
      'matters',
    ]);
  });

  it('handles empty and punctuation-only input', () => {
    expect(cleanupOcrText('')).toEqual([]);
    expect(cleanupOcrText('!!! 123 ***')).toEqual([]);
  });

  it('keeps letter runs embedded in numeric text', () => {
    expect(cleanupOcrText('chapter 12 lexicon')).toEqual(['chapter', 'lexicon']);
  });
});

describe('wordsFromCapturedText', () => {
  it('delegates to the same cleanup pipeline', () => {
    expect(wordsFromCapturedText('CAPTURED Text!')).toEqual(['captured', 'text']);
  });
});
