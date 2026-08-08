/**
 * Camera Modal — photograph a page (or paste text on web) and turn it into
 * dictionary specimens.
 *
 * Flow: camera preview with a guide frame → capture → ML Kit OCR (native) →
 * cleanup → dictionary lookup per candidate word → results list. Tapping a
 * match opens the Word Detail modal where it can be saved. On web there is no
 * camera/ML Kit, so the same pipeline runs from a paste-text box.
 *
 * The guide frame nudges the user to frame ONE paragraph, crop before OCR,
 * and keep the subject flat — ML Kit reads downscaled captures best.
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, type CameraCapturedPicture } from 'expo-camera';
import { useResponsive } from '../services/responsiveService';
import { sqliteService } from '../services/sqliteService';
import { dictionaryApi, localStorageApi } from '../api/client';
import { recognizeImage, wordsFromCapturedText } from '../services/ocrService';
import WordDetailModal from './WordDetailModal';
import type { VocabItem } from '../types';
import { colors, fonts, typeScale, spacing, frame, buttons } from '../theme';

interface CameraModalProps {
  visible: boolean;
  onClose: () => void;
}

interface OcrMatch {
  word: VocabItem;
  saved: boolean;
}

type Phase = 'camera' | 'processing' | 'results';

const GUIDE_TIPS = [
  'ALIGN ONE PARAGRAPH IN THE FRAME',
  'FILL THE GUIDE BOX — NO PAGE EDGES',
  'KEEP THE PAGE FLAT AND WELL LIT',
];

export default function CameraModal({ visible, onClose }: CameraModalProps) {
  const { isNarrow } = useResponsive();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [phase, setPhase] = useState<Phase>('camera');
  const [matches, setMatches] = useState<OcrMatch[]>([]);
  const [captured, setCaptured] = useState<CameraCapturedPicture | null>(null);
  const [detailWord, setDetailWord] = useState<VocabItem | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [lookupError, setLookupError] = useState('');

  const isWeb = Platform.OS === 'web';

  const reset = useCallback(() => {
    setPhase('camera');
    setMatches([]);
    setCaptured(null);
    setDetailWord(null);
    setPasteText('');
    setLookupError('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  /** Exact match first, fuzzy FTS5 as fallback — OCR near-misses land anyway. */
  const lookupWord = useCallback(async (word: string): Promise<VocabItem | null> => {
    const exact = await sqliteService.getWord(word);
    if (exact) {
      return {
        id: exact.word.toLowerCase(),
        word: exact.word,
        pos: exact.pos || 'word',
        difficulty: (exact.difficulty as VocabItem['difficulty']) || 'medium',
        definition: exact.definition,
        example_corpus: exact.example_corpus,
        ai_example: exact.ai_example,
        synonyms: exact.synonyms,
        antonyms: exact.antonyms,
        tags: exact.tags,
        created_at: exact.created_at,
      };
    }
    const fuzzy = await sqliteService.searchFts(word, 1);
    if (fuzzy.length > 0 && fuzzy[0].word) {
      const row = fuzzy[0];
      return {
        id: row.word.toLowerCase(),
        word: row.word,
        pos: row.pos || 'word',
        difficulty: (row.difficulty as VocabItem['difficulty']) || 'medium',
        definition: row.definition,
        example_corpus: row.example_corpus,
        ai_example: row.ai_example,
        synonyms: row.synonyms,
        antonyms: row.antonyms,
        tags: row.tags,
        created_at: row.created_at,
      };
    }
    return null;
  }, []);

  const runPipeline = useCallback(
    async (rawText: string) => {
      const candidates = wordsFromCapturedText(rawText);
      if (candidates.length === 0) {
        setLookupError('NO WORDS RECOGNIZED — TRY A CLOSER, FLATTER SHOT');
        setPhase('results');
        return;
      }
      setPhase('processing');
      setMatches([]);
      setLookupError('');
      const saved = new Set(
        localStorageApi.getUserVocab().map((v) => v.vocab_item.word.toLowerCase()),
      );
      const found: OcrMatch[] = [];
      for (const candidate of candidates) {
        if (found.length >= 24) break;
        try {
          const item = await lookupWord(candidate);
          if (item) {
            found.push({ word: item, saved: saved.has(item.word.toLowerCase()) });
          }
        } catch {
          // skip lookup failures for individual candidates
        }
      }
      setMatches(found);
      if (found.length === 0) {
        setLookupError('NO DICTIONARY MATCHES — CHECK THE SPELLING IN THE SHOT');
      }
      setPhase('results');
    },
    [lookupWord],
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const picture = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        skipProcessing: false,
      });
      if (!picture?.uri) return;
      setCaptured(picture);
      setPhase('processing');
      const rawText = await recognizeImage(picture.uri);
      setPhase('camera');
      await runPipeline(rawText);
    } catch (err) {
      setLookupError('CAPTURE FAILED — PLEASE TRY AGAIN');
      setPhase('camera');
    }
  }, [runPipeline]);

  const handlePasteScan = useCallback(async () => {
    if (pasteText.trim().length < 3) return;
    setPhase('processing');
    await runPipeline(pasteText);
  }, [pasteText, runPipeline]);

  const handleSave = useCallback(
    (match: OcrMatch) => {
      const item = match.word;
      const exists = localStorageApi
        .getUserVocab()
        .some((v) => v.vocab_item.word.toLowerCase() === item.word.toLowerCase());
      if (!exists) {
        localStorageApi.saveVocab(item.id, item, 'saved');
      } else {
        const existing = localStorageApi
          .getUserVocab()
          .find((v) => v.vocab_item.word.toLowerCase() === item.word.toLowerCase());
        if (existing) localStorageApi.removeVocab(existing.id);
      }
      setMatches((prev) =>
        prev.map((m) =>
          m.word.id === item.id ? { ...m, saved: !exists } : m,
        ),
      );
    },
    [],
  );

  const toPosAbbr = (pos: string): string => {
    const map: Record<string, string> = {
      adjective: 'ADJ', noun: 'NOUN', verb: 'VERB', adverb: 'ADV',
      pronoun: 'PRON', preposition: 'PREP', conjunction: 'CONJ',
      interjection: 'INTERJ', determiner: 'DET', 'proper noun': 'NOUN',
    };
    return map[pos.toLowerCase()] || pos.slice(0, 4).toUpperCase() || 'WORD';
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>[OCR CAPTURE]</Text>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeBtn}
            accessibilityLabel="Close camera"
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>✕ CLOSE</Text>
          </TouchableOpacity>
        </View>

        {phase === 'camera' && (
          <>
            {isWeb ? (
              /* Web fallback: no camera/ML Kit — paste the text instead. */
              <View style={styles.webPasteWrap}>
                <Text style={styles.webPasteTitle}>PASTE TEXT TO SCAN</Text>
                <Text style={styles.webPasteHint}>
                  The camera + ML Kit OCR engine is native-only. Paste any
                  English text to run the same dictionary scan.
                </Text>
                <TextInput
                  style={styles.webPasteInput}
                  multiline
                  placeholder="PASTE YOUR TEXT HERE…"
                  placeholderTextColor={colors.outline}
                  value={pasteText}
                  onChangeText={setPasteText}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    buttons.primary,
                    styles.scanBtn,
                    pasteText.trim().length < 3 && styles.scanBtnDisabled,
                  ]}
                  onPress={handlePasteScan}
                  disabled={pasteText.trim().length < 3}
                  activeOpacity={0.8}
                >
                  <Text style={buttons.primaryText}>SCAN FOR VOCABULARY</Text>
                </TouchableOpacity>
              </View>
            ) : !permission ? (
              <View style={styles.permissionWrap}>
                <ActivityIndicator color={colors.onSurface} />
              </View>
            ) : !permission.granted ? (
              <View style={styles.permissionWrap}>
                <Text style={styles.permissionTitle}>CAMERA ACCESS REQUIRED</Text>
                <Text style={styles.permissionText}>
                  Lextro needs the camera to photograph text and turn it into
                  vocabulary specimens.
                </Text>
                <TouchableOpacity
                  style={[buttons.primary, styles.permissionBtn]}
                  onPress={requestPermission}
                  activeOpacity={0.8}
                >
                  <Text style={buttons.primaryText}>GRANT CAMERA ACCESS</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraWrap}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                  active
                >
                  {/* Guide frame — keep one paragraph inside */}
                  <View style={styles.guideWrap}>
                    <View style={[styles.guideFrame, isNarrow && styles.guideFrameNarrow]}>
                      <Text style={styles.guideLabel}>PARAGRAPH</Text>
                    </View>
                  </View>
                  {GUIDE_TIPS.map((tip) => (
                    <Text key={tip} style={styles.guideTip}>
                      {tip}
                    </Text>
                  ))}
                </CameraView>
                <View style={styles.captureBar}>
                  <Text style={styles.captureHint}>ALIGN · CAPTURE · CROP BEFORE OCR</Text>
                  <TouchableOpacity
                    onPress={handleCapture}
                    style={styles.captureBtn}
                    accessibilityLabel="Capture photo"
                    activeOpacity={0.8}
                  >
                    <View style={styles.captureBtnInner} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}

        {phase === 'processing' && (
          <View style={styles.processingWrap}>
            <ActivityIndicator size="large" color={colors.onSurface} />
            <Text style={styles.processingTitle}>RECOGNIZING TEXT…</Text>
            <Text style={styles.processingHint}>MATCHING WORDS AGAINST THE DICTIONARY</Text>
          </View>
        )}

        {phase === 'results' && (
          <View style={styles.resultsWrap}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>DETECTED SPECIMENS</Text>
              <Text style={styles.resultsCount}>
                {String(matches.length).padStart(3, '0')}
              </Text>
            </View>

            {lookupError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{lookupError}</Text>
              </View>
            ) : null}

            <ScrollView
              style={styles.resultsList}
              contentContainerStyle={styles.resultsListContent}
              showsVerticalScrollIndicator={false}
            >
              {matches.map((match) => (
                <TouchableOpacity
                  key={match.word.id}
                  style={styles.resultRow}
                  onPress={() => setDetailWord(match.word)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultMain}>
                    <View style={styles.resultWordRow}>
                      <Text style={styles.resultWord} numberOfLines={1}>
                        {match.word.word}
                      </Text>
                      <View style={frame.chip}>
                        <Text style={styles.resultPos}>{toPosAbbr(match.word.pos)}</Text>
                      </View>
                    </View>
                    <Text style={styles.resultDef} numberOfLines={2}>
                      {match.word.definition}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleSave(match)}
                    style={styles.resultSaveBtn}
                    hitSlop={8}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.resultSaveText, match.saved && styles.resultSaveActive]}>
                      {match.saved ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.resultsActions}>
              <TouchableOpacity
                onPress={reset}
                style={[buttons.primary, styles.resultsActionBtn]}
                activeOpacity={0.8}
              >
                <Text style={buttons.primaryText}>{isWeb ? 'SCAN MORE TEXT' : 'CAPTURE AGAIN'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleClose}
                style={[buttons.outline, styles.resultsActionBtn]}
                activeOpacity={0.8}
              >
                <Text style={buttons.outlineText}>DONE</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {detailWord && (
        <WordDetailModal
          item={detailWord}
          isSaved={localStorageApi.getUserVocab().some(
            (v) => v.vocab_item.word.toLowerCase() === detailWord.word.toLowerCase(),
          )}
          onClose={() => setDetailWord(null)}
          onSave={(id, item) => {
            const target = item ?? detailWord;
            handleSave({ word: target, saved: false });
          }}
          onPractice={() => setDetailWord(null)}
          onUseInDocument={() => setDetailWord(null)}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    height: 56,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
    backgroundColor: colors.surfaceLowest,
  },
  topBarTitle: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 1.5,
  },
  closeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  closeBtnText: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 1,
  },

  // ── Camera ────────────────────────────────────────────────────────────
  cameraWrap: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  camera: {
    flex: 1,
  },
  guideWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideFrame: {
    width: '82%',
    height: '52%',
    borderWidth: 2,
    borderColor: colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  guideFrameNarrow: {
    width: '86%',
    height: '46%',
  },
  guideLabel: {
    ...typeScale.specimenIndex,
    color: colors.onPrimary,
    letterSpacing: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  guideTip: {
    ...typeScale.specimenIndex,
    color: colors.onPrimary,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignSelf: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  captureBar: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: colors.primary,
  },
  captureHint: {
    ...typeScale.specimenIndex,
    color: colors.onPrimary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  captureBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: colors.onPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.onPrimary,
  },

  // ── Permission ────────────────────────────────────────────────────────
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.gutter,
  },
  permissionTitle: {
    ...typeScale.titleMd,
    color: colors.onSurface,
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    ...typeScale.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 20,
    maxWidth: 320,
  },
  permissionBtn: {
    minWidth: 220,
    alignItems: 'center',
  },

  // ── Web paste fallback ────────────────────────────────────────────────
  webPasteWrap: {
    flex: 1,
    padding: spacing.gutter,
  },
  webPasteTitle: {
    ...typeScale.titleMd,
    color: colors.onSurface,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  webPasteHint: {
    ...typeScale.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  webPasteInput: {
    flex: 1,
    backgroundColor: colors.surfaceLowest,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    padding: 16,
    ...typeScale.bodyLg,
    color: colors.onSurface,
    textAlignVertical: 'top',
    minHeight: 160,
  },
  scanBtn: {
    alignItems: 'center',
    marginTop: 12,
  },
  scanBtnDisabled: {
    backgroundColor: colors.outlineVariant,
    borderColor: colors.outlineVariant,
  },

  // ── Processing ────────────────────────────────────────────────────────
  processingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.gutter,
  },
  processingTitle: {
    ...typeScale.titleMd,
    color: colors.onSurface,
    letterSpacing: 0.5,
    marginTop: 20,
  },
  processingHint: {
    ...typeScale.specimenIndex,
    color: colors.outline,
    letterSpacing: 1.5,
    marginTop: 8,
  },

  // ── Results ───────────────────────────────────────────────────────────
  resultsWrap: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: 14,
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
  },
  resultsTitle: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 1.5,
  },
  resultsCount: {
    ...typeScale.labelMono,
    color: colors.secondary,
    letterSpacing: 1,
  },
  errorBox: {
    marginHorizontal: spacing.gutter,
    marginTop: 14,
    borderWidth: spacing.hairline,
    borderColor: colors.error,
    borderRadius: spacing.radius,
    padding: 12,
    backgroundColor: colors.errorContainer,
  },
  errorText: {
    ...typeScale.labelMonoRegular,
    color: colors.error,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    padding: spacing.gutter,
    paddingBottom: 24,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLowest,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    marginBottom: 10,
    padding: 12,
  },
  resultMain: {
    flex: 1,
    paddingRight: 12,
  },
  resultWordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  resultWord: {
    ...typeScale.headlineSm,
    color: colors.onSurface,
    flexShrink: 1,
  },
  resultPos: {
    ...typeScale.specimenIndex,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
  },
  resultDef: {
    ...typeScale.bodySm,
    color: colors.onSurfaceVariant,
  },
  resultSaveBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
  },
  resultSaveText: {
    fontSize: 20,
    color: colors.outline,
  },
  resultSaveActive: {
    color: colors.secondary,
  },
  resultsActions: {
    flexDirection: 'row',
    gap: 10,
    padding: spacing.gutter,
    borderTopWidth: spacing.hairline,
    borderTopColor: colors.outline,
    backgroundColor: colors.surfaceLowest,
  },
  resultsActionBtn: {
    flex: 1,
    alignItems: 'center',
  },
});
