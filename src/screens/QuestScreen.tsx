import React, { useRef, useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, AppState, AppStateStatus,
  Vibration,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { Quest } from '../store/useGameStore'
import { useLocationTracker } from '../hooks/useLocationTracker'
import {
  scheduleFocusCompletionNotification,
  cancelFocusNotification,
  notifyFocusComplete,
} from '../utils/notifications'
import CustomModal from '../components/CustomModal'
import { C, FONT, SPACING } from '../theme'

// Vibration patterns
const VIB_COMPLETE = [0, 80, 40, 120]
const VIB_FOCUS    = [0, 200, 80, 200, 80, 400]

// ── Quest type config ──────────────────────────────────────────────────────────

const QUEST_CONFIG: Record<Quest['type'], { icon: string; color: string }> = {
  training:  { icon: 'arm-flex',          color: '#ef4444' },
  knowledge: { icon: 'book-open-variant', color: C.neonBlue },
  focus:     { icon: 'timer-sand',        color: '#a855f7' },
  gps:       { icon: 'run-fast',          color: '#22c55e' },
}

// ── Focus Timer Modal ──────────────────────────────────────────────────────────

function FocusTimerModal({ quest, onClose, onComplete }: {
  quest: Quest; onClose: () => void; onComplete: () => void
}) {
  const duration   = quest.focusDuration ?? 30 * 60_000
  const startRef   = useRef(Date.now())
  const doneRef    = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone]       = useState(false)

  // ── Interval tick ────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const e = Date.now() - startRef.current
      setElapsed(e)
      if (e >= duration && !doneRef.current) {
        doneRef.current = true
        setDone(true)
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [duration])

  // ── AppState: re-sync elapsed when app returns from background ────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        const e = Date.now() - startRef.current
        setElapsed(e)
        if (e >= duration && !doneRef.current) {
          doneRef.current = true
          setDone(true)
        }
      }
    })
    return () => sub.remove()
  }, [duration])

  // ── Schedule OS notification so it fires even if app is killed ───────────────
  useEffect(() => {
    scheduleFocusCompletionNotification(duration, quest.label).catch(() => {})
    return () => {
      cancelFocusNotification().catch(() => {})
    }
  }, [duration, quest.label])

  // ── Trigger completion ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!done) return
    Vibration.vibrate(VIB_FOCUS)
    notifyFocusComplete(quest.label).catch(() => {})
    onComplete()
  }, [done])

  const remaining = Math.max(duration - elapsed, 0)
  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  const pct  = Math.min((elapsed / duration) * 100, 100)

  return (
    <Modal transparent animationType="fade">
      <View style={fm.overlay}>
        <View style={fm.card}>
          <Icon name="timer-sand" size={32} color="#a855f7" style={{ marginBottom: SPACING.sm }} />
          <Text style={fm.title}>FOCUS MODE</Text>
          <Text style={fm.subtitle}>{quest.label}</Text>

          <Text style={fm.timerText}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </Text>
          <Text style={fm.timerSub}>{done ? 'COMPLETO!' : 'restantes'}</Text>

          <View style={fm.track}>
            <View style={[fm.fill, { width: `${pct}%` as any }]} />
          </View>

          <TouchableOpacity style={fm.cancelBtn} onPress={onClose}>
            <Icon name="close-circle-outline" size={14} color={C.muted} />
            <Text style={fm.cancelTxt}> CANCELAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── GPS Tracker Modal ──────────────────────────────────────────────────────────

function GPSTrackerModal({ quest, onClose, onComplete }: {
  quest: Quest; onClose: () => void; onComplete: () => void
}) {
  const target  = quest.gpsTarget ?? 1.5
  const tracker = useLocationTracker(target, () => {
    Vibration.vibrate(VIB_COMPLETE)
    onComplete()
  })

  useEffect(() => {
    tracker.startTracking()
    return () => tracker.stopTracking()
  }, [])

  return (
    <Modal transparent animationType="fade">
      <View style={gm.overlay}>
        <View style={gm.card}>
          <Icon name="map-marker-path" size={32} color={C.green} style={{ marginBottom: SPACING.sm }} />
          <Text style={gm.title}>GPS TRACKER</Text>
          <Text style={gm.subtitle}>{quest.label}</Text>

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
              {!tracker.isTracking && tracker.distKm === 0 && (
                <View style={gm.warnRow}>
                  <Icon name="satellite-variant" size={12} color={C.muted} />
                  <Text style={[gm.warn, { color: C.muted }]}> A obter sinal GPS...</Text>
                </View>
              )}
              {tracker.cheating && (
                <View style={gm.warnRow}>
                  <Icon name="speedometer" size={12} color={C.neonRed} />
                  <Text style={gm.warn}> Velocidade elevada! A pausar contagem.</Text>
                </View>
              )}
            </>
          )}

          <TouchableOpacity style={gm.cancelBtn} onPress={() => { tracker.stopTracking(); onClose() }}>
            <Icon name="close-circle-outline" size={14} color={C.muted} />
            <Text style={gm.cancelTxt}> CANCELAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Quest Card ─────────────────────────────────────────────────────────────────

function QuestCard({ quest }: { quest: Quest }) {
  const completeQuest = useGameStore(s => s.completeQuest)
  const undoQuest     = useGameStore(s => s.undoQuest)
  const recordFocus   = useGameStore(s => s.recordFocusTime)

  const [showFocus,   setShowFocus]   = useState(false)
  const [showGPS,     setShowGPS]     = useState(false)
  const [confirmDone, setConfirmDone] = useState(false)
  const [confirmUndo, setConfirmUndo] = useState(false)

  const cfg = QUEST_CONFIG[quest.type]

  function handleComplete() {
    const { leveledUp } = completeQuest(quest.id)
    Vibration.vibrate(leveledUp ? VIB_FOCUS : VIB_COMPLETE)
  }

  function handleFocusComplete() {
    setShowFocus(false)
    const focusMinutes = Math.round((quest.focusDuration ?? 30 * 60_000) / 60_000)
    recordFocus(focusMinutes)
    const { leveledUp } = completeQuest(quest.id)
    Vibration.vibrate(leveledUp ? VIB_FOCUS : VIB_COMPLETE)
  }

  return (
    <View style={[qc.card, quest.done && qc.cardDone]}>
      {/* Header */}
      <View style={qc.header}>
        <View style={[qc.typeTag, { borderColor: cfg.color + '55' }]}>
          <Icon name={cfg.icon} size={14} color={quest.done ? C.muted : cfg.color} />
        </View>
        <Text style={[qc.label, quest.done && qc.labelDone]} numberOfLines={1}>{quest.label}</Text>
        <View style={qc.rewards}>
          <Icon name="star-four-points" size={10} color={quest.done ? C.dimmed : C.neonBlue} />
          <Text style={[qc.xp, quest.done && qc.dimmedTxt]}> {quest.xp}</Text>
          <Text style={[qc.gold, quest.done && qc.dimmedTxt]}>  ◈{quest.gold}</Text>
        </View>
      </View>

      <Text style={[qc.detail, quest.done && qc.dimmedTxt]}>{quest.detail}</Text>

      {/* Actions */}
      {quest.done ? (
        <View style={qc.doneRow}>
          <Icon name="check-circle" size={14} color={C.green} />
          <Text style={qc.doneTag}> CONCLUÍDA</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={qc.undoBtn} onPress={() => setConfirmUndo(true)}>
            <Icon name="undo-variant" size={13} color={C.muted} />
            <Text style={qc.undoTxt}> DESFAZER</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={qc.actions}>
          {quest.type === 'focus' && (
            <TouchableOpacity style={[qc.actionBtn, { borderColor: '#a855f7' }]} onPress={() => setShowFocus(true)}>
              <Icon name="timer-sand" size={13} color="#a855f7" />
              <Text style={[qc.actionTxt, { color: '#a855f7' }]}> INICIAR FOCUS</Text>
            </TouchableOpacity>
          )}
          {quest.type === 'gps' && (
            <TouchableOpacity style={[qc.actionBtn, { borderColor: C.green }]} onPress={() => setShowGPS(true)}>
              <Icon name="run-fast" size={13} color={C.green} />
              <Text style={[qc.actionTxt, { color: C.green }]}> INICIAR GPS</Text>
            </TouchableOpacity>
          )}
          {(quest.type === 'training' || quest.type === 'knowledge') && (
            <TouchableOpacity
              style={[qc.actionBtn, { borderColor: C.dimmed }]}
              onPress={() => setConfirmDone(true)}
            >
              <Icon name="check-bold" size={13} color="#94a3b8" />
              <Text style={[qc.actionTxt, { color: '#94a3b8' }]}> CONCLUÍDO</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Focus timer */}
      {showFocus && (
        <FocusTimerModal
          quest={quest}
          onClose={() => setShowFocus(false)}
          onComplete={handleFocusComplete}
        />
      )}

      {/* GPS tracker */}
      {showGPS && (
        <GPSTrackerModal
          quest={quest}
          onClose={() => setShowGPS(false)}
          onComplete={() => { setShowGPS(false); handleComplete() }}
        />
      )}

      {/* Confirm complete */}
      <CustomModal
        visible={confirmDone}
        title="CONCLUIR MISSÃO"
        message={`Confirmas que completaste:\n"${quest.label}"?`}
        confirmLabel="SIM, CONCLUÍ"
        confirmIcon="check-circle-outline"
        confirmColor={cfg.color}
        onConfirm={() => { setConfirmDone(false); handleComplete() }}
        onCancel={() => setConfirmDone(false)}
      />

      {/* Confirm undo */}
      <CustomModal
        visible={confirmUndo}
        title="DESFAZER MISSÃO"
        message={`Reverter a conclusão de "${quest.label}"?\nO XP e Gold ganhos serão deduzidos.`}
        confirmLabel="DESFAZER"
        confirmIcon="undo-variant"
        confirmColor={C.neonRed}
        onConfirm={() => { setConfirmUndo(false); undoQuest(quest.id) }}
        onCancel={() => setConfirmUndo(false)}
      />
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function QuestScreen() {
  const quests     = useGameStore(s => s.quests)
  const hasPenalty = useGameStore(s => s.system.hasPenalty)
  const penaltyQ   = useGameStore(s => s.system.penaltyQuests)

  const done  = quests.filter(q => q.done).length
  const total = quests.length

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <View style={s.titleRow}>
          <Icon name="clipboard-list-outline" size={16} color={C.neonBlue} />
          <Text style={s.title}> MISSÕES DO DIA</Text>
        </View>

        <View style={s.progressRow}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${total > 0 ? (done / total) * 100 : 0}%` as any }]} />
          </View>
          <Text style={s.progressText}>{done}/{total}</Text>
        </View>

        {hasPenalty && (
          <View style={s.penalSection}>
            <View style={s.penalHeader}>
              <Icon name="alert-circle" size={12} color={C.neonRed} />
              <Text style={s.penalTitle}> MISSÕES DE PENALIZAÇÃO</Text>
            </View>
            {penaltyQ.map(q => <QuestCard key={q.id} quest={q} />)}
          </View>
        )}

        {quests.map(q => <QuestCard key={q.id} quest={q} />)}
      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: C.bg },
  content:       { padding: SPACING.md, paddingBottom: SPACING.xl },
  titleRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  title:         { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },
  progressRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  progressTrack: { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: C.neonBlue, borderRadius: 2 },
  progressText:  { color: C.muted, fontSize: 11, fontFamily: FONT.orbitron },
  penalSection:  { marginBottom: SPACING.md, borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 10, padding: SPACING.sm },
  penalHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  penalTitle:    { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
})

const qc = StyleSheet.create({
  card:      { backgroundColor: C.panel, borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: C.border },
  cardDone:  { opacity: 0.55 },
  header:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  typeTag:   { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label:     { flex: 1, color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  labelDone: { color: C.muted },
  rewards:   { flexDirection: 'row', alignItems: 'center' },
  xp:        { color: C.neonBlue, fontSize: 11, fontWeight: '700' },
  gold:      { color: C.gold, fontSize: 11, fontWeight: '700' },
  dimmedTxt: { color: C.dimmed },
  detail:    { color: C.muted, fontSize: 12, marginBottom: SPACING.md, lineHeight: 18 },
  actions:   { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 8 },
  actionTxt: { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  doneRow:   { flexDirection: 'row', alignItems: 'center' },
  doneTag:   { color: C.green, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  undoBtn:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  undoTxt:   { color: C.muted, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
})

const fm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: '#000d', alignItems: 'center', justifyContent: 'center' },
  card:      { backgroundColor: C.panel, borderRadius: 16, padding: SPACING.xl, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: '#a855f755' },
  title:     { color: '#a855f7', fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2, marginBottom: 4 },
  subtitle:  { color: C.muted, fontSize: 12, marginBottom: SPACING.lg },
  timerText: { color: '#fff', fontFamily: FONT.orbitron, fontSize: 52, fontWeight: '900' },
  timerSub:  { color: C.dimmed, fontSize: 11, marginTop: 4, marginBottom: SPACING.md },
  track:     { width: '100%', height: 6, backgroundColor: '#a855f718', borderRadius: 3, overflow: 'hidden', marginBottom: SPACING.lg },
  fill:      { height: '100%', backgroundColor: '#a855f7' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  cancelTxt: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
})

const gm = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: '#000d', alignItems: 'center', justifyContent: 'center' },
  card:     { backgroundColor: C.panel, borderRadius: 16, padding: SPACING.xl, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: C.green + '55' },
  title:    { color: C.green, fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2, marginBottom: 4 },
  subtitle: { color: C.muted, fontSize: 12, marginBottom: SPACING.lg },
  dist:     { color: '#fff', fontFamily: FONT.orbitron, fontSize: 42, fontWeight: '900' },
  distUnit: { color: C.muted, fontSize: 16 },
  track:    { width: '100%', height: 6, backgroundColor: C.green + '18', borderRadius: 3, overflow: 'hidden', marginVertical: SPACING.md },
  fill:     { height: '100%', backgroundColor: C.green },
  warnRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  warn:     { color: C.neonRed, fontSize: 11 },
  error:    { color: C.neonRed, fontSize: 12, textAlign: 'center', marginBottom: SPACING.md },
  cancelBtn:{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: 10, marginTop: SPACING.sm },
  cancelTxt:{ color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
})
