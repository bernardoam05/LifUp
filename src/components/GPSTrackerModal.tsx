// src/components/GPSTrackerModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore, { Quest } from '../store/useGameStore';
import { useLocationTracker } from '../hooks/useLocationTracker';
import { formatTime } from '../utils/time';
import BottomSheetModal from './BottomSheetModal';
import { FONT, SPACING } from '../theme';

const getGMStyles = (C: any) => StyleSheet.create({
  card: { backgroundColor: C.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.xl, paddingBottom: 40, width: '100%', alignItems: 'center', borderWidth: 1, borderBottomWidth: 0, borderColor: C.green + '55' },
  title: { color: C.green, fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2, marginBottom: 4 },
  subtitle: { color: C.muted, fontSize: 12, marginBottom: SPACING.lg },
  dist: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 42, fontWeight: '900' },
  distUnit: { color: C.muted, fontSize: 16 },
  track: { width: '100%', height: 6, backgroundColor: C.green + '18', borderRadius: 0, overflow: 'hidden', marginVertical: SPACING.md },
  fill: { height: '100%', backgroundColor: C.green },
  warnRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  warn: { color: C.neonRed, fontSize: 11 },
  error: { color: C.neonRed, fontSize: 12, textAlign: 'center', marginBottom: SPACING.md },
  timerBox: { alignItems: 'center', marginVertical: SPACING.md },
  timerText: { color: C.green, fontFamily: FONT.orbitron, fontSize: 42, fontWeight: '900', letterSpacing: 2 },
  timerSub: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, marginTop: 4 },
  completeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 4, paddingVertical: 14 },
});

export default function GPSTrackerModal({ quest, onClose, onComplete, C }: {
  quest: Quest; onClose: () => void; onComplete: () => void; C: any
}) {

  const insets = useSafeAreaInsets();
  const target = quest.gpsTarget ?? 1.5;
  const record = useGameStore(s => s.questRecords[quest.id]);
  const saveRec = useGameStore(s => s.saveQuestRecord);
  const timerStore = useGameStore(s => s.activeMissionTimers[quest.id]);
  const startT = useGameStore(s => s.startMissionTimer);
  const pauseT = useGameStore(s => s.pauseMissionTimer);
  const clearT = useGameStore(s => s.clearMissionTimer);
  const setMissionModalOpen = useGameStore(s => s.setMissionModalOpen);

  const [elapsed, setElapsed] = useState(
    timerStore ? (timerStore.accumulatedMs + (timerStore.isPaused ? 0 : Date.now() - timerStore.startTime)) : 0
  );
  const [running, setRunning] = useState(!timerStore?.isPaused && !!timerStore);
  const [note, setNote] = useState(record?.lastNote ?? '');

  const tracker = useLocationTracker(target, () => {
    handleFinalize();
  });

  useEffect(() => {
    setMissionModalOpen(true);
    return () => setMissionModalOpen(false);
  }, [setMissionModalOpen]);

  // Control distance accumulation based on timer
  useEffect(() => {
    if (running && !tracker.isTracking) {
      tracker.startTracking();
    } else if (!running && tracker.isTracking) {
      tracker.stopTracking();
    }
  }, [running, tracker.isTracking, tracker.startTracking, tracker.stopTracking]);

  useEffect(() => {
    if (!running) {return;}
    const startTime = Date.now() - elapsed;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 500);
    return () => { clearInterval(interval); };
  }, [running]);

  // NO AUTO-START: Timer will only start when user clicks the play button
  // Persistent store sync happens via tracker state changes

  function togglePause() {
    if (running) {
      pauseT(quest.id);
      setRunning(false);
    } else {
      startT(quest.id);
      setRunning(true);
    }
  }

  function handleRestart() {
    clearT(quest.id);
    setElapsed(0);
    setRunning(false);
    tracker.reset?.();
  }

  function handleFinalize() {
    tracker.stopTracking();
    clearT(quest.id);
    saveRec(quest.id, Math.floor(elapsed / 1000), note.trim());
    onComplete();
  }

  const gm = getGMStyles(C);

  return (
    <BottomSheetModal
      visible={true}
      onClose={onClose}
      contentStyle={{ backgroundColor: 'transparent' }}
      useNativeModal={false}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, width: '100%' }}>
        <View style={[gm.card, { paddingBottom: Math.max(SPACING.xl, insets.bottom + SPACING.sm) }]}>
          <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Icon name="run-fast" size={16} color={C.green} />
              <Text style={gm.title}> GPS TRACKER</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={20} color={C.dimmed} />
            </TouchableOpacity>
          </View>

          <Text style={gm.subtitle}>{quest.label}</Text>

          <View style={gm.timerBox}>
            <Text style={gm.timerText}>{formatTime(elapsed)}</Text>
            <Text style={gm.timerSub}>{running ? 'em movimento…' : 'pausado'}</Text>
          </View>

          {tracker.error ? (
            <Text style={gm.error}>{tracker.error}</Text>
          ) : (
            <>
              <Text style={gm.dist}>
                {tracker.distKm.toFixed(2)}
                <Text style={gm.distUnit}> / {target} km</Text>
              </Text>
              <View style={gm.track}>
                <View style={[gm.fill, { width: `${tracker.pct}%` as any }]} />
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: running ? C.gold + '22' : C.green + '22', borderWidth: 1, borderColor: running ? C.gold : C.green, padding: 12, borderRadius: 4 }}
                  onPress={togglePause}
                >
                  <Icon name={running ? 'pause' : 'play'} size={16} color={running ? C.gold : C.green} />
                  <Text style={{ color: running ? C.gold : C.green, fontFamily: FONT.orbitron, fontSize: 10, marginLeft: 8 }}>
                    {running ? 'PAUSAR' : (elapsed > 1000 ? 'RETOMAR' : 'INICIAR')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.neonRed + '18', borderWidth: 1, borderColor: C.neonRed, padding: 12, borderRadius: 4, paddingHorizontal: 16 }}
                  onPress={handleRestart}
                >
                  <Icon name="refresh" size={16} color={C.neonRed} />
                </TouchableOpacity>
              </View>

              {!tracker.isTracking && running && (
                <View style={gm.warnRow}>
                  <Icon name="satellite-variant" size={12} color={C.muted} />
                  <Text style={[gm.warn, { color: C.muted }]}> A obter sinal GPS...</Text>
                </View>
              )}
              {tracker.cheating && (
                <View style={gm.warnRow}>
                  <Icon name="speedometer" size={12} color={C.neonRed} />
                  <Text style={gm.warn}> Velocidade elevada! Distância pausada.</Text>
                </View>
              )}
            </>
          )}

          <View style={{ width: '100%', marginBottom: 20 }}>
            <Text style={{ color: C.dimmed, fontSize: 9, fontFamily: FONT.orbitron, marginBottom: 6 }}>NOTAS DE CAMPO</Text>
            <TextInput
              style={{ backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: 8, color: C.muted, fontSize: 12, minHeight: 60 }}
              placeholder="Regista o teu progresso..."
              placeholderTextColor={C.dimmed}
              multiline
              value={note}
              onChangeText={setNote}
            />
          </View>

          <TouchableOpacity style={[gm.completeBtn, { width: '100%', backgroundColor: C.green, paddingVertical: 14 }]} onPress={handleFinalize}>
            <Icon name="check-bold" size={16} color={C.bg} />
            <Text style={{ color: C.bg, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '900', marginLeft: 8 }}>TERMINAR MISSÃO</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
}
