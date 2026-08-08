/**
 * Practice Screen — three activities per the Type Foundry practice spec:
 *
 * 1. DEFINITION MATCH — word prompt, 4 stacked definition rows, instant
 *    green/red flash, auto-advance (~800ms).
 * 2. SPEED ROUND — 60s countdown (red in the final 10s), 2×2 answer grid,
 *    live round streak, full-bleed ink results card.
 * 3. AUTHOR GUESS — pull-quote prompt, 4 stacked author rows.
 *
 * Practice home shows the daily streak, DUE TODAY / ACCURACY stat cards,
 * and the three mode cards with their mono corner tags. Completing a session
 * in ANY mode counts toward the daily streak.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { localStorageApi } from '../api/client';
import { spacedRepetitionService, Statistics } from '../services/spacedRepetitionService';
import { practiceService, PracticeQuestion } from '../services/practiceService';
import { streakService } from '../services/streakService';
import ScreenShell from '../components/ScreenShell';
import CameraModal from '../components/CameraModal';
import StreakCard from '../components/StreakCard';
import { colors, typeScale, spacing, frame, buttons, fonts } from '../theme';

type PracticeMode = 'definition' | 'speed' | 'author';
type ViewState = 'home' | 'session' | 'results';

interface ModeConfig {
  key: PracticeMode;
  label: string;
  tag: string;
  desc: string;
}

const MODES: ModeConfig[] = [
  { key: 'definition', label: 'DEFINITION MATCH', tag: '10w', desc: 'MATCH THE WORD TO ITS DEFINITION' },
  { key: 'speed', label: 'SPEED ROUND', tag: '60s', desc: '60 SECONDS · 2×2 GRID · GO' },
  { key: 'author', label: 'AUTHOR GUESS', tag: '8q', desc: 'WHO WROTE THIS · 8 QUOTES' },
];

const ADVANCE_DELAY_MS = 800;
const SPEED_ROUND_SECONDS = 60;

const ProgressDots = ({ total, current }: { total: number; current: number }) => (
  <View style={styles.dotsRow}>
    {Array.from({ length: total }).map((_, i) => (
      <View key={i} style={[styles.dot, i < current && styles.dotDone]} />
    ))}
  </View>
);

export default function PracticeScreen() {
  const [stats, setStats] = useState<Statistics>(spacedRepetitionService.getStatistics());
  const [accuracy, setAccuracy] = useState(practiceService.getRollingAccuracy());
  const [view, setView] = useState<ViewState>('home');
  const [mode, setMode] = useState<PracticeMode | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [roundStreak, setRoundStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(SPEED_ROUND_SECONDS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endedRef = useRef(false);

  const refreshStats = useCallback(() => {
    setStats(spacedRepetitionService.getStatistics());
    setAccuracy(practiceService.getRollingAccuracy());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshStats();
    }, [refreshStats]),
  );

  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  const endSession = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    streakService.recordSessionComplete();
    refreshStats();
    setView('results');
  }, [refreshStats]);

  const startSession = async (m: PracticeMode) => {
    const builder =
      m === 'definition'
        ? practiceService.buildDefinitionMatch(10)
        : m === 'speed'
          ? practiceService.buildSpeedRound(10)
          : practiceService.buildAuthorGuess(8);

    const qs = await builder;
    if (qs.length === 0) return;

    setMode(m);
    setQuestions(qs);
    setIndex(0);
    setFeedback(null);
    setSelectedOption(null);
    setScore({ correct: 0, total: 0 });
    setRoundStreak(0);
    setTimeLeft(SPEED_ROUND_SECONDS);
    endedRef.current = false;
    setView('session');
  };

  const advance = useCallback(() => {
    setFeedback(null);
    setSelectedOption(null);
    if (index + 1 >= questions.length) {
      endSession();
      return;
    }
    setIndex(index + 1);
  }, [index, questions.length, endSession]);

  const handleAnswer = (optionIndex: number) => {
    if (feedback || view !== 'session') return;
    const q = questions[index];
    if (!q) return;

    const isCorrect = optionIndex === q.correctIndex;
    practiceService.recordAnswer(isCorrect);
    setScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    setRoundStreak((s) => (isCorrect ? s + 1 : 0));
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setSelectedOption(optionIndex);

    const delay = mode === 'speed' ? 300 : ADVANCE_DELAY_MS;
    advanceTimer.current = setTimeout(advance, delay);
  };

  // Speed round countdown
  useEffect(() => {
    if (mode !== 'speed' || view !== 'session') return;
    if (timeLeft <= 0) {
      endSession();
      return;
    }
    const id = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : t));
    }, 1000);
    return () => clearInterval(id);
  }, [mode, view, timeLeft, endSession]);

  const backToModes = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setView('home');
    setMode(null);
    setQuestions([]);
    refreshStats();
  };

  const retrySession = () => {
    if (!mode) return;
    startSession(mode);
  };

  if (view === 'session' && mode && questions.length > 0) {
    const q = questions[index];
    const isSpeed = mode === 'speed';
    const isAuthor = mode === 'author';

    return (
      <ScreenShell>
        <View style={styles.container}>
          {/* Session header: label + dots (or timer for speed) */}
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionLabel}>[{MODES.find((m) => m.key === mode)!.label}]</Text>
            {isSpeed ? (
              <Text style={[styles.timer, timeLeft <= 10 && styles.timerUrgent]}>
                {String(timeLeft).padStart(2, '0')}
              </Text>
            ) : (
              <ProgressDots total={questions.length} current={index} />
            )}
          </View>

          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.sessionContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Prompt */}
            {isAuthor ? (
              <View style={styles.quoteBlock}>
                <Text style={styles.quoteText}>“{q.prompt}”</Text>
              </View>
            ) : (
              <View style={styles.promptBlock}>
                <Text style={styles.promptWord}>{q.prompt}</Text>
              </View>
            )}

            {/* Options */}
            <View style={[styles.optionsGrid, !isSpeed && styles.optionsStacked]}>
              {q.options.map((option, i) => {
                const isCorrectOption = feedback !== null && i === q.correctIndex;
                const isWrongPick =
                  feedback === 'wrong' && i === selectedOption && i !== q.correctIndex;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.optionBtn,
                      isSpeed && styles.optionBtnGrid,
                      isCorrectOption && styles.optionBtnCorrect,
                      isWrongPick && styles.optionBtnWrong,
                    ]}
                    onPress={() => handleAnswer(i)}
                    disabled={feedback !== null}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.optionIndex}>{String.fromCharCode(65 + i)}</Text>
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Speed round streak */}
            {isSpeed && (
              <Text style={styles.roundStreak}>STREAK THIS ROUND: {String(roundStreak).padStart(2, '0')}</Text>
            )}
          </ScrollView>
        </View>
      </ScreenShell>
    );
  }

  if (view === 'results' && mode) {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    const isSpeed = mode === 'speed';

    if (isSpeed) {
      return (
        <ScreenShell>
          <View style={styles.container}>
            <View style={styles.speedResultCard}>
              <Text style={styles.speedResultLabel}>[SPEED ROUND COMPLETE]</Text>
              <Text style={styles.speedResultScore}>
                {String(score.correct).padStart(2, '0')} / {String(score.total).padStart(2, '0')}
              </Text>
              <Text style={styles.speedResultSub}>CORRECT</Text>
              <Text style={styles.speedResultStreak}>STREAK THIS ROUND: {String(roundStreak).padStart(2, '0')}</Text>
              <View style={styles.speedResultActions}>
                <TouchableOpacity style={styles.speedTryAgain} onPress={retrySession} activeOpacity={0.8}>
                  <Text style={styles.speedTryAgainText}>TRY AGAIN</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.speedBackBtn} onPress={backToModes} activeOpacity={0.8}>
                  <Text style={styles.speedBackText}>BACK TO MODES</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScreenShell>
      );
    }

    return (
      <ScreenShell>
        <View style={styles.container}>
          <View style={styles.centerBox}>
            <Text style={styles.sessionTitle}>[SESSION COMPLETE]</Text>
            <Text style={styles.sessionScore}>
              {String(score.correct).padStart(2, '0')} / {String(score.total).padStart(2, '0')} CORRECT
            </Text>
            <Text style={styles.sessionPct}>{String(pct).padStart(3, '0')}% ACCURACY</Text>
            <View style={styles.resultStreak}>
              <StreakCard variant="small" />
            </View>
            <View style={styles.resultActions}>
              <TouchableOpacity style={[buttons.primary, styles.doneBtn]} onPress={retrySession} activeOpacity={0.8}>
                <Text style={buttons.primaryText}>TRY AGAIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[buttons.outline, styles.doneBtn]} onPress={backToModes} activeOpacity={0.8}>
                <Text style={buttons.outlineText}>DONE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScreenShell>
    );
  }

  // ── Home ────────────────────────────────────────────────────────────────
  return (
    <ScreenShell>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.homeHeader}>
          <Text style={styles.title}>[PRACTICE]</Text>
          <StreakCard variant="small" />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{String(stats.dueToday).padStart(3, '0')}</Text>
            <Text style={styles.statLabel}>DUE TODAY</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statValueRow}>
              <Text style={[styles.statValue, styles.statValueAccent]}>
                {String(accuracy).padStart(3, '0')}%
              </Text>
              <TouchableOpacity onPress={() => setSettingsOpen(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.gear}>⚙</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.statLabel}>ACCURACY</Text>
          </View>
        </View>

        <View style={styles.sectionRuleRow}>
          <Text style={styles.sectionTitle}>CHOOSE A MODE</Text>
          <View style={styles.sectionRule} />
        </View>

        {MODES.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[frame.card, styles.modeBtn]}
            onPress={() => startSession(m.key)}
            activeOpacity={0.8}
          >
            <View style={styles.modeBtnHeader}>
              <Text style={styles.modeLabel}>{m.label}</Text>
              <View style={styles.modeTag}>
                <Text style={styles.modeTagText}>{m.tag}</Text>
              </View>
            </View>
            <Text style={styles.modeDesc}>{m.desc}</Text>
          </TouchableOpacity>
        ))}

        {/* OCR — photograph a page and turn it into specimens */}
        <TouchableOpacity
          style={[frame.card, styles.modeBtn, styles.scanModeBtn]}
          onPress={() => setCameraOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.modeBtnHeader}>
            <Text style={[styles.modeLabel, styles.scanModeLabel]}>SCAN TEXT</Text>
            <View style={[styles.modeTag, styles.scanModeTag]}>
              <Text style={[styles.modeTagText, styles.scanModeTagText]}>▣</Text>
            </View>
          </View>
          <Text style={styles.modeDesc}>PHOTOGRAPH A PAGE · CAPTURE WORDS TO SAVE</Text>
        </TouchableOpacity>

        <CameraModal visible={cameraOpen} onClose={() => setCameraOpen(false)} />

        {/* Practice settings */}
        <Modal
          visible={settingsOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setSettingsOpen(false)}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setSettingsOpen(false)}>
            <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
              <Text style={styles.sessionTitle}>[PRACTICE SETTINGS]</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>ACCURACY BASIS</Text>
                <Text style={styles.settingsValue}>LAST 50 ANSWERS</Text>
              </View>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>STREAK FREEZES</Text>
                <Text style={styles.settingsValue}>2 / MONTH</Text>
              </View>
              <TouchableOpacity
                style={[buttons.outline, styles.modalClose]}
                onPress={() => setSettingsOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={buttons.outlineText}>CLOSE</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.gutter, paddingBottom: 32 },

  // ── Home ────────────────────────────────────────────────────────────────
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  title: { ...typeScale.labelMono, color: colors.onSurface, letterSpacing: 2, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceLowest,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    padding: 16,
    alignItems: 'center',
  },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statValue: { ...typeScale.headlineSm, color: colors.onSurface },
  statValueAccent: { color: colors.secondary },
  statLabel: { ...typeScale.specimenIndex, color: colors.outline, marginTop: 4, letterSpacing: 1 },
  gear: { ...typeScale.labelMono, color: colors.outline, fontSize: 16 },
  sectionRuleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { ...typeScale.labelMono, color: colors.onSurface, letterSpacing: 1.5, marginRight: 12 },
  sectionRule: { flex: 1, height: spacing.hairline, backgroundColor: colors.outline },
  modeBtn: { padding: 16, marginBottom: 10 },
  modeBtnHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeLabel: { ...typeScale.titleMd, color: colors.onSurface, letterSpacing: 1 },
  modeTag: {
    borderWidth: spacing.hairline,
    borderColor: colors.secondary,
    borderRadius: spacing.radius,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  modeTagText: { ...typeScale.specimenIndex, color: colors.secondary, letterSpacing: 1 },
  modeDesc: { ...typeScale.specimenIndex, color: colors.outline, marginTop: 6, letterSpacing: 0.5 },
  scanModeBtn: { borderColor: colors.secondary, marginTop: 4 },
  scanModeLabel: { color: colors.secondary },
  scanModeTag: { borderColor: colors.primary, backgroundColor: colors.primary },
  scanModeTagText: { color: colors.onPrimary },

  // ── Session ─────────────────────────────────────────────────────────────
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.gutter,
    paddingBottom: 8,
  },
  sessionLabel: { ...typeScale.labelMono, color: colors.onSurface, letterSpacing: 1.5 },
  dotsRow: { flexDirection: 'row', gap: 4 },
  dot: {
    width: 10,
    height: 10,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  timer: { ...typeScale.headlineSm, color: colors.onSurface, fontFamily: fonts.monoBold, letterSpacing: -1 },
  timerUrgent: { color: colors.errorSoft },
  sessionContent: { padding: spacing.gutter, paddingBottom: 32 },
  promptBlock: {
    borderBottomWidth: spacing.hairline,
    borderBottomColor: colors.outline,
    paddingBottom: 20,
    marginBottom: 24,
  },
  promptWord: { ...typeScale.displayLgMobile, color: colors.onSurface, textAlign: 'center' },
  quoteBlock: {
    borderLeftWidth: 2,
    borderLeftColor: colors.secondary,
    paddingLeft: 16,
    marginBottom: 24,
  },
  quoteText: {
    ...typeScale.bodyLg,
    color: colors.onSurface,
    fontStyle: 'italic',
    lineHeight: 28,
  },
  optionsGrid: { gap: 10 },
  optionsStacked: { flexDirection: 'column' },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surfaceLowest,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    padding: 14,
  },
  optionBtnGrid: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 88,
  },
  optionBtnCorrect: { borderColor: colors.success, backgroundColor: 'rgba(46, 139, 87, 0.08)' },
  optionBtnWrong: { borderColor: colors.errorSoft, backgroundColor: 'rgba(201, 79, 79, 0.08)' },
  optionIndex: { ...typeScale.labelMono, color: colors.secondary, letterSpacing: 1 },
  optionText: { ...typeScale.bodySm, color: colors.onSurface, flex: 1 },
  roundStreak: {
    ...typeScale.labelMono,
    color: colors.onSurface,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 20,
  },

  // ── Results ─────────────────────────────────────────────────────────────
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.gutter },
  sessionTitle: { ...typeScale.headlineSm, color: colors.onSurface, letterSpacing: 1, marginBottom: 12 },
  sessionScore: { ...typeScale.headlineSm, color: colors.secondary, marginBottom: 4 },
  sessionPct: { ...typeScale.labelMono, color: colors.outline, marginBottom: 20 },
  resultStreak: { marginBottom: 24 },
  resultActions: { flexDirection: 'row', gap: 12 },
  doneBtn: { minWidth: 140, alignItems: 'center' },
  speedResultCard: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: spacing.gutter,
    justifyContent: 'center',
  },
  speedResultLabel: { ...typeScale.labelMono, color: colors.onPrimary, letterSpacing: 2, textAlign: 'center', marginBottom: 16 },
  speedResultScore: {
    ...typeScale.displayLg,
    color: colors.onPrimary,
    textAlign: 'center',
    fontFamily: fonts.monoBold,
    letterSpacing: -3,
  },
  speedResultSub: { ...typeScale.labelMono, color: colors.onPrimary, letterSpacing: 2, textAlign: 'center', marginTop: 4 },
  speedResultStreak: {
    ...typeScale.labelMono,
    color: colors.onPrimary,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  speedResultActions: { flexDirection: 'row', gap: 12, marginTop: 32, justifyContent: 'center' },
  speedTryAgain: {
    backgroundColor: colors.secondary,
    borderWidth: spacing.hairline,
    borderColor: colors.secondary,
    borderRadius: spacing.radius,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 140,
    alignItems: 'center',
  },
  speedTryAgainText: { color: colors.onSecondary, ...typeScale.labelMono, textTransform: 'uppercase' },
  speedBackBtn: {
    backgroundColor: colors.primary,
    borderWidth: spacing.hairline,
    borderColor: colors.onPrimary,
    borderRadius: spacing.radius,
    paddingVertical: 12,
    paddingHorizontal: 20,
    minWidth: 140,
    alignItems: 'center',
  },
  speedBackText: { color: colors.onPrimary, ...typeScale.labelMono, textTransform: 'uppercase' },

  // ── Settings modal ──────────────────────────────────────────────────────
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.gutter },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surfaceLowest,
    borderWidth: spacing.hairline,
    borderColor: colors.outline,
    borderRadius: spacing.radius,
    padding: 24,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: spacing.hairline,
    borderTopColor: colors.outlineVariant,
    paddingVertical: 12,
  },
  settingsLabel: { ...typeScale.specimenIndex, color: colors.outline, letterSpacing: 1 },
  settingsValue: { ...typeScale.labelMono, color: colors.onSurface, letterSpacing: 0.5 },
  modalClose: { alignItems: 'center', marginTop: 16 },
});
