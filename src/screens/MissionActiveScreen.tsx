import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, TextInput, ScrollView,
} from 'react-native';
import BottomSheetModal from '../components/BottomSheetModal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore, { Quest } from '../store/useGameStore';
import CustomModal from '../components/CustomModal';
import { showOngoingMissionNotification, clearOngoingMissionNotification } from '../utils/notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, SPACING } from '../theme';


// ── MissionActiveScreen ────────────────────────────────────────────────────────
// Execution modal for training/knowledge/focus quests.
// Shows a stopwatch/countdown, notes field, personal record, and a smart complete button.

type Props = {
  quest: Quest
  onClose: () => void
  onComplete: () => void
  initialElapsed?: number   // ms — set when resuming a background timer
  initialPaused?: boolean
  targetSeconds?: number   // If set, timer counts DOWN from this value and auto-completes
  C: any
}


function formatTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;}
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function MissionActiveScreen({ quest, onClose, onComplete, initialElapsed = 0, initialPaused, targetSeconds, C }: Props) {
  const s = getStyles(C);
  const insets = useSafeAreaInsets();

  const saveQuestRecord = useGameStore(st => st.saveQuestRecord);
  const questRecords = useGameStore(st => st.questRecords);
  const startMissionTimer = useGameStore(st => st.startMissionTimer);
  const clearMissionTimer = useGameStore(st => st.clearMissionTimer);

  const record = questRecords[quest.id];
  const targetMs = targetSeconds ? targetSeconds * 1000 : 0;

  const initialRunning = initialPaused === false;
  const [elapsed, setElapsed] = useState(initialElapsed);
  const [running, setRunning] = useState(initialRunning);
  const [note, setNote] = useState(record?.lastNote ?? '');
  const [showNoTime, setShowNoTime] = useState(false);  // confirm when timer < 10s

  const startRef = useRef<number | null>(initialRunning ? Date.now() : null);
  const accRef = useRef(initialElapsed);  // pre-fill accumulated ms when resuming
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef(false);

  const finalize = React.useCallback((timeMs: number) => {
    if (intervalRef.current) {clearInterval(intervalRef.current);}
    clearMissionTimer(quest.id);
    clearOngoingMissionNotification().catch(() => { });
    const trimmedNote = note.trim();
    saveQuestRecord(quest.id, Math.floor(timeMs / 1000), trimmedNote);
    onComplete();
  }, [clearMissionTimer, note, onComplete, quest.id, saveQuestRecord]);

  useEffect(() => {
    if (targetMs > 0 && elapsed >= targetMs && !doneRef.current) {
      doneRef.current = true;
      if (intervalRef.current) {clearInterval(intervalRef.current);}
      setRunning(false);
      finalize(targetMs);
    }
  }, [elapsed, targetMs, finalize]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        const currentElapsed = accRef.current + Date.now() - (startRef.current ?? Date.now());
        setElapsed(currentElapsed);
      }, 500);
    } else {
      if (intervalRef.current) {clearInterval(intervalRef.current);}
    }
    return () => { if (intervalRef.current) {clearInterval(intervalRef.current);} };
  }, [running]);

  function startTimer() {
    accRef.current = elapsed;
    startRef.current = Date.now();
    setRunning(true);
    startMissionTimer(quest.id);
    showOngoingMissionNotification(quest.label, Date.now() - accRef.current).catch(() => { });
  }

  function pauseTimer() {
    if (intervalRef.current) {clearInterval(intervalRef.current);}
    accRef.current = elapsed;
    startRef.current = null;
    setRunning(false);
    const pauseMissionTimer = useGameStore.getState().pauseMissionTimer;
    pauseMissionTimer(quest.id);
    clearOngoingMissionNotification().catch(() => { });
  }

  function resetTimer() {
    if (intervalRef.current) {clearInterval(intervalRef.current);}
    accRef.current = 0;
    startRef.current = null;
    setElapsed(0);
    setRunning(false);
    doneRef.current = false;
    clearMissionTimer(quest.id);
    clearOngoingMissionNotification().catch(() => { });
  }

  function handleComplete() {
    const timeMs = elapsed;
    if (timeMs < 10_000 && timeMs > 0) {
      // Timer ran but less than 10s — ask for confirmation
      setShowNoTime(true);
      return;
    }
    finalize(timeMs);
  }

  const bestSecs = record?.bestTime ?? 0;
  const elapsedSecs = Math.floor(elapsed / 1000);
  const isNewRecord = running && bestSecs > 0 && elapsedSecs > bestSecs && targetMs === 0;

  const displayMs = targetMs > 0 ? Math.max(targetMs - elapsed, 0) : elapsed;

  return (
    <BottomSheetModal visible onClose={onClose} contentStyle={{ backgroundColor: 'transparent' }}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={[s.card, { paddingBottom: Math.max(SPACING.md, insets.bottom + SPACING.sm) }]}>

          {/* Header */}
          <View style={s.header}>
            <Icon name="sword" size={14} color={C.neonBlue} />
            <Text style={s.headerTxt}> EXECUÇÃO DE MISSÃO</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Icon name="close" size={18} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Quest label */}
          <Text style={s.questLabel}>{quest.label}</Text>
          <Text style={s.questDetail}>{quest.detail}</Text>

          {/* Personal record */}
          {bestSecs > 0 && (
            <View style={s.recordRow}>
              <Icon name="trophy-outline" size={12} color={C.gold} />
              <Text style={s.recordTxt}>
                {' '}Recorde Pessoal: <Text style={s.recordVal}>{formatTime(bestSecs * 1000)}</Text>
              </Text>
              {isNewRecord && (
                <View style={s.newRecordBadge}>
                  <Text style={s.newRecordTxt}>NOVO!</Text>
                </View>
              )}
            </View>
          )}

          {/* Neon Stopwatch */}
          <View style={s.timerBox}>
            <Text style={s.timerText}>{formatTime(displayMs)}</Text>
            <Text style={s.timerSub}>{running ? 'a decorrer…' : elapsed > 0 ? 'pausado' : 'parado'}</Text>
          </View>

          {/* Timer controls */}
          <View style={s.controls}>
            {!running ? (
              <TouchableOpacity style={[s.ctrlBtn, s.ctrlStart]} onPress={startTimer}>
                <Icon name="play" size={16} color={C.neonBlue} />
                <Text style={[s.ctrlTxt, { color: C.neonBlue }]}> {elapsed > 0 ? 'RETOMAR' : 'INICIAR'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[s.ctrlBtn, s.ctrlPause]} onPress={pauseTimer}>
                <Icon name="pause" size={16} color={C.gold} />
                <Text style={[s.ctrlTxt, { color: C.gold }]}> PAUSAR</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.ctrlBtn, s.ctrlReset]} onPress={resetTimer}>
              <Icon name="refresh" size={16} color={C.muted} />
              <Text style={[s.ctrlTxt, { color: C.muted }]}> REINICIAR</Text>
            </TouchableOpacity>
          </View>

          {/* Combat diary / notes */}
          <View style={s.notesSection}>
            <View style={s.notesHeader}>
              <Icon name="notebook-outline" size={12} color={C.dimmed} />
              <Text style={s.notesLabel}> DIÁRIO DE COMBATE</Text>
            </View>
            <TextInput
              style={s.notesInput}
              value={note}
              onChangeText={setNote}
              placeholder="Ex: 52 Flexões • 3 séries • sensação boa"
              placeholderTextColor={C.dimmed}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Complete button */}
          <TouchableOpacity style={s.completeBtn} onPress={handleComplete} activeOpacity={0.8}>
            <Icon name="check-circle-outline" size={18} color={C.bg} />
            <Text style={s.completeTxt}> CONCLUIR MISSÃO</Text>
          </TouchableOpacity>

          {/* Complete without timer */}
          <TouchableOpacity style={s.skipTimerBtn} onPress={() => finalize(0)}>
            <Icon name="pencil-outline" size={13} color={C.muted} />
            <Text style={s.skipTimerTxt}> CONCLUIR SEM TIMER (REGISTO MANUAL)</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Confirm: short timer */}
      <CustomModal
        visible={showNoTime}
        title="TEMPO INSUFICIENTE"
        message={`Apenas ${formatTime(elapsed)} registado.\nGuardar apenas as notas sem atualizar recorde?`}
        confirmLabel="GUARDAR NOTAS"
        confirmIcon="notebook-outline"
        confirmColor={C.neonBlue}
        onConfirm={() => { setShowNoTime(false); finalize(0); }}
        onCancel={() => setShowNoTime(false)}
        C={C}
      />
    </BottomSheetModal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.bg + 'dd', justifyContent: 'flex-end' },
  scroll: { flexGrow: 1, justifyContent: 'flex-end', width: '100%' },

  card: {
    backgroundColor: C.panel,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderColor: C.neonBlue + '44',
    padding: SPACING.md,
    width: '100%',
    paddingBottom: SPACING.md,
  },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  headerTxt: { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  closeBtn: { padding: 4 },

  questLabel: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  questDetail: { color: C.muted, fontSize: 12, lineHeight: 18, marginBottom: SPACING.md },

  recordRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.gold + '10', borderWidth: 1, borderColor: C.gold + '33', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.md },
  recordTxt: { color: C.dimmed, fontSize: 12, flex: 1 },
  recordVal: { color: C.gold, fontFamily: FONT.orbitron, fontWeight: '700' },
  newRecordBadge: { backgroundColor: C.gold, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, marginLeft: SPACING.sm },
  newRecordTxt: { color: C.bg, fontFamily: FONT.orbitron, fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  timerBox: { alignItems: 'center', marginVertical: SPACING.lg },
  timerText: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 64, fontWeight: '900', letterSpacing: 2 },
  timerSub: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, marginTop: 4 },

  controls: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  ctrlBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 4, paddingVertical: 14 },
  ctrlStart: { borderColor: C.neonBlue, backgroundColor: C.neonBlue + '10' },
  ctrlPause: { borderColor: C.gold, backgroundColor: C.gold + '10' },
  ctrlReset: { borderColor: C.border, backgroundColor: 'transparent', flex: 0, paddingHorizontal: SPACING.md },
  ctrlTxt: { fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },

  notesSection: { marginBottom: SPACING.lg },
  notesHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  notesLabel: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  notesInput: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: SPACING.sm, color: C.muted, fontSize: 13, minHeight: 72, lineHeight: 20 },

  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.neonBlue, borderRadius: 4, paddingVertical: 16, marginBottom: SPACING.sm },
  completeTxt: { color: C.bg, fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '900', letterSpacing: 2 },

  skipTimerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingVertical: 12 },
  skipTimerTxt: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
});
