import React, { useRef, useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, AppState, AppStateStatus,
  Vibration, TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { Quest, SideQuest } from '../store/useGameStore'
import ExtractionModal from '../components/ExtractionModal'
import QuestForgeScreen from './QuestForgeScreen'
import MissionActiveScreen from './MissionActiveScreen'
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

// ── Dungeon Missions ───────────────────────────────────────────────────────────

type DungeonMission = {
  id:              string
  label:           string
  detail:          string
  type:            Quest['type']
  gpsTarget?:      number
  focusDuration?:  number
  shadowHint:      string
  icon:            string
  color:           string
  // For custom bosses created in Forge
  customShadow?: { name: string; icon: string; questType: Quest['type'] }
}

const DUNGEON_MISSIONS: DungeonMission[] = [
  {
    id:          'boss_gps',
    label:       'Veneno de Kasaka',
    detail:      'Corre 5km sem parar. A serpente aguarda no final.',
    type:        'gps',
    gpsTarget:   5,
    shadowHint:  'Kasaka',
    icon:        'run-fast',
    color:       '#22c55e',
  },
  {
    id:          'boss_focus',
    label:       'O Trono de Igris',
    detail:      '90 min de foco absoluto. O cavaleiro negro observa. Sem distrações.',
    type:        'focus',
    focusDuration: 90 * 60_000,
    shadowHint:  'Igris',
    icon:        'timer-sand',
    color:       '#a855f7',
  },
  {
    id:          'boss_training',
    label:       'Rugido de Cerberus',
    detail:      '100 push-ups + 100 squats + 30 burpees. Paga com suor.',
    type:        'training',
    shadowHint:  'Cerberus',
    icon:        'arm-flex',
    color:       '#ef4444',
  },
]

// ── Focus Timer Modal ──────────────────────────────────────────────────────────

function FocusTimerModal({ quest, onClose, onComplete }: {
  quest: Quest; onClose: () => void; onComplete: () => void
}) {
  const duration   = quest.focusDuration ?? 30 * 60_000
  const startRef   = useRef(Date.now())
  const doneRef    = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone]       = useState(false)

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

  useEffect(() => {
    scheduleFocusCompletionNotification(duration, quest.label).catch(() => {})
    return () => { cancelFocusNotification().catch(() => {}) }
  }, [duration, quest.label])

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
  const completeQuest       = useGameStore(s => s.completeQuest)
  const undoQuest           = useGameStore(s => s.undoQuest)
  const recordFocus         = useGameStore(s => s.recordFocusTime)
  const questRecords        = useGameStore(s => s.questRecords)
  const activeMissionTimers = useGameStore(s => s.activeMissionTimers)

  const activeStartTs = activeMissionTimers[quest.id] ?? 0
  const isTimerActive = activeStartTs > 0 && !quest.done

  const [showFocus,      setShowFocus]      = useState(false)
  const [showGPS,        setShowGPS]        = useState(false)
  const [showMission,    setShowMission]    = useState(false)
  const [confirmUndo,    setConfirmUndo]    = useState(false)

  const cfg    = QUEST_CONFIG[quest.type]
  const record = questRecords[quest.id]

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

  function handleMissionComplete() {
    setShowMission(false)
    handleComplete()
  }

  return (
    <View style={[qc.card, quest.done && qc.cardDone, isTimerActive && qc.cardActive]}>
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

      {/* Personal record chip */}
      {record && record.bestTime > 0 && !quest.done && (
        <View style={qc.recordChip}>
          <Icon name="trophy-outline" size={10} color={C.gold} />
          <Text style={qc.recordChipTxt}>
            {' '}PR: {Math.floor(record.bestTime / 60).toString().padStart(2, '0')}:{(record.bestTime % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      )}

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
      ) : isTimerActive ? (
        <TouchableOpacity
          style={qc.activeTimerRow}
          onPress={() => setShowMission(true)}
          activeOpacity={0.75}
        >
          <Icon name="timer-outline" size={13} color={C.neonBlue} />
          <Text style={qc.activeTimerTxt}> A DECORRER</Text>
          <View style={{ flex: 1 }} />
          <Icon name="chevron-right" size={14} color={C.neonBlue} />
        </TouchableOpacity>
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
              style={[qc.actionBtn, { borderColor: cfg.color + '88', flex: 1 }]}
              onPress={() => setShowMission(true)}
            >
              <Icon name="sword" size={13} color={cfg.color} />
              <Text style={[qc.actionTxt, { color: cfg.color }]}> EXECUTAR</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showFocus && (
        <FocusTimerModal
          quest={quest}
          onClose={() => setShowFocus(false)}
          onComplete={handleFocusComplete}
        />
      )}

      {showGPS && (
        <GPSTrackerModal
          quest={quest}
          onClose={() => setShowGPS(false)}
          onComplete={() => { setShowGPS(false); handleComplete() }}
        />
      )}

      {showMission && (
        <MissionActiveScreen
          quest={quest}
          onClose={() => setShowMission(false)}
          onComplete={handleMissionComplete}
          initialElapsed={activeStartTs > 0 ? Date.now() - activeStartTs : 0}
        />
      )}

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

// ── Dungeon Modal ──────────────────────────────────────────────────────────────

function DungeonModal({ visible, onClose, onSelectMission, customMissions, defeatedId }: {
  visible:         boolean
  onClose:         () => void
  onSelectMission: (m: DungeonMission) => void
  customMissions:  DungeonMission[]
  defeatedId?:     string
}) {
  const allMissions = [...customMissions]
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={dm.overlay}>
        <View style={dm.card}>
          <Icon name="gate" size={40} color={C.neonRed} style={{ marginBottom: SPACING.sm }} />
          <Text style={dm.warning}>⚠ ALERTA DO SISTEMA ⚠</Text>
          <Text style={dm.title}>[ PORTÕES VERMELHOS ABERTOS ESTA SEMANA ]</Text>
          <Text style={dm.sub}>
            O Sistema gerou 3 dungeons aleatórios para esta semana. Completa UMA Missão para extrair a Sombra do Boss.
          </Text>

          {allMissions.map(m => {
            const isDefeated = defeatedId === m.shadowHint
            const isLocked   = !!defeatedId && !isDefeated

            return (
              <TouchableOpacity
                key={m.id}
                style={[dm.missionBtn, { borderColor: m.color + '88', opacity: isLocked ? 0.3 : 1 }]}
                onPress={() => { if (!defeatedId) { onClose(); onSelectMission(m) } }}
                activeOpacity={0.7}
              >
                <View style={[dm.missionIcon, { backgroundColor: m.color + '18' }]}>
                  <Icon name={m.icon} size={20} color={m.color} />
                </View>
                <View style={dm.missionInfo}>
                  <Text style={[dm.missionLabel, { color: m.color }]}>
                    {isDefeated ? '[ MASMORRA LIMPA ]' : m.label}
                  </Text>
                  <Text style={dm.missionDetail}>{m.detail}</Text>
                  {m.customShadow && !isDefeated && !isLocked && (
                    <View style={dm.shadowExtractTag}>
                      <Icon name="ghost" size={9} color={C.purple} />
                      <Text style={dm.shadowExtractTxt}> Extrai Sombra Garantida</Text>
                    </View>
                  )}
                </View>
                <Icon name={isDefeated ? "check-circle" : "chevron-right"} size={18} color={isDefeated ? C.green : m.color} />
              </TouchableOpacity>
            )
          })}

          <TouchableOpacity style={dm.cancelBtn} onPress={onClose}>
            <Text style={dm.cancelTxt}>RECUAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Boss Victory Modal ─────────────────────────────────────────────────────────

function BossVictoryModal({ info, onClose }: {
  info:    { xp: number; gold: number; shadowName?: string; leveledUpShadow?: boolean }
  onClose: () => void
}) {
  useEffect(() => { Vibration.vibrate([0, 100, 50, 300, 50, 500]) }, [])

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={bv.overlay}>
        <View style={bv.card}>
          <Icon name="sword" size={48} color={C.gold} style={{ marginBottom: SPACING.sm }} />
          <Text style={bv.header}>BOSS DERROTADO!</Text>
          <Text style={bv.sub}>O dungeon foi limpo. O Sistema reconhece a tua força.</Text>

          <View style={bv.rewardsBox}>
            <View style={bv.rewardRow}>
              <Icon name="star-four-points" size={16} color={C.neonBlue} />
              <Text style={bv.rewardTxt}> +{info.xp} XP</Text>
            </View>
            <View style={bv.rewardRow}>
              <Icon name="rhombus" size={16} color={C.gold} />
              <Text style={bv.rewardTxt}> +{info.gold} Gold</Text>
            </View>
            {info.shadowName && (
              <View style={[bv.rewardRow, { marginTop: SPACING.sm }]}>
                <Icon name="ghost" size={16} color="#a855f7" />
                <Text style={[bv.rewardTxt, { color: '#a855f7' }]}>
                  {info.leveledUpShadow
                    ? ` ${info.shadowName} subiu de nível!`
                    : ` Sombra obtida: ${info.shadowName}`}
                </Text>
              </View>
            )}
          </View>

          {!info.shadowName && (
            <Text style={bv.shadowHint}>Atinge o nível 10 para receber Sombras de boss raids.</Text>
          )}

          <TouchableOpacity style={bv.btn} onPress={onClose}>
            <Text style={bv.btnTxt}>CONTINUAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function QuestScreen() {
  const quests               = useGameStore(s => s.quests)
  const hasPenalty           = useGameStore(s => s.system.hasPenalty)
  const penaltyQ             = useGameStore(s => s.system.penaltyQuests)
  const xpBoostNext          = useGameStore(s => s.system.xpBoostNext)
  const bossDefeatedThisWeek = useGameStore(s => s.system.bossDefeatedThisWeek)
  const weeklyDefeatedBossId = useGameStore(s => s.system.weeklyDefeatedBossId)
  const defeatBoss           = useGameStore(s => s.defeatDungeonBoss)
  const recordFocus          = useGameStore(s => s.recordFocusTime)
  const triggerEvent         = useGameStore(s => s.triggerEvent)
  const questDictionary      = useGameStore(s => s.questDictionary)
  const lastExtraction       = useGameStore(s => s.lastExtraction)
  const dismissExtraction    = useGameStore(s => s.dismissExtraction)
  const updateSettings       = useGameStore(s => s.updateSettings)

  // Custom boss missions filtered by weekly rotation
  const weeklyBossIds        = useGameStore(s => s.system.weeklyBossIds || [])
  const customBossMissions: DungeonMission[] = questDictionary
    .filter(def => def.type === 'boss' && weeklyBossIds.includes(def.id))
    .map(def => ({
      id:           `custom_boss_${def.id}`,
      label:        def.title,
      detail:       def.description
        .replace(/{target}/g, String(def.baseTarget))
        .replace(/{unit}/g, def.unit),
      type:         def.questType,
      shadowHint:   def.dropShadowId ?? `custom:${def.id}`,
      icon:         'sword',
      color:        '#f59e0b',
      customShadow: def.dropShadowId ? undefined : (def.shadowName
        ? { name: def.shadowName, icon: def.shadowIcon ?? 'ghost', questType: def.questType }
        : undefined),
    }))

  const extraQuests          = useGameStore(s => s.extraQuests)
  const generateExtraQuests  = useGameStore(s => s.generateExtraQuests)
  const completeExtraQuest   = useGameStore(s => s.completeExtraQuest)

  const done  = quests.filter(q => q.done).length
  const total = quests.length
  const allDailyDone = done === total && total > 0

  const dayOfWeek = new Date().getDay()
  const isRestDay = useGameStore(s => s.settings.restDay)
  const isBossDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0  // Fri/Sat/Sun

  const [showDungeon,     setShowDungeon]     = useState(false)
  const [showForge,       setShowForge]       = useState(false)
  const [activeMission,   setActiveMission]   = useState<DungeonMission | null>(null)
  const [confirmBossTraining, setConfirmBossTraining] = useState(false)
  const [victoryInfo,     setVictoryInfo]     = useState<{ xp: number; gold: number; shadowName?: string; leveledUpShadow?: boolean } | null>(null)

  function handleMissionSelect(m: DungeonMission) {
    setActiveMission(m)
    if (m.type === 'training') setConfirmBossTraining(true)
  }

  function completeBossMission(m: DungeonMission, focusMinutes?: number) {
    setActiveMission(null)
    if (focusMinutes) recordFocus(focusMinutes)
    const result = defeatBoss(m.shadowHint, m.customShadow)
    setVictoryInfo(result)
    // Fire boss-specific achievement triggers alongside the generic boss_defeated
    if (m.id === 'boss_gps')      triggerEvent('boss_gps_completed',      { missionId: m.id })
    if (m.id === 'boss_focus')    triggerEvent('boss_focus_completed',    { missionId: m.id })
    if (m.id === 'boss_training') triggerEvent('boss_training_completed', { missionId: m.id })
  }

  // Convert active dungeon mission to Quest shape for existing tracker modals
  const activeBossQuest: Quest | null = activeMission ? {
    id:            activeMission.id,
    label:         activeMission.label,
    detail:        activeMission.detail,
    xp:            0,
    gold:          0,
    type:          activeMission.type,
    done:          false,
    gpsTarget:     activeMission.gpsTarget,
    focusDuration: activeMission.focusDuration,
  } : null

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <View style={s.titleRow}>
          <Icon name="clipboard-list-outline" size={16} color={C.neonBlue} />
          <Text style={s.title}> MISSÕES DO DIA</Text>
          {isRestDay && (
            <View style={s.restBadge}>
              <Icon name="bed" size={10} color={C.green} />
              <Text style={s.restTxt}> DESCANSO</Text>
            </View>
          )}
        </View>

        {/* Compact tactical action row */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => setShowForge(true)} activeOpacity={0.75}>
            <Icon name="hammer-wrench" size={13} color={C.neonBlue} />
            <View>
              <Text style={s.actionBtnTxt}> FORJA</Text>
              <Text style={s.actionBtnSub}>  Cria missões personalizadas</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, isRestDay && { borderColor: C.green + '88', backgroundColor: C.green + '0d' }]}
            onPress={() => updateSettings({ restDay: !isRestDay })}
            activeOpacity={0.75}
          >
            <Icon name="bed" size={13} color={isRestDay ? C.green : C.muted} />
            <View>
              <Text style={[s.actionBtnTxt, { color: isRestDay ? C.green : C.muted }]}>
                {isRestDay ? ' REPOUSO ATIVO' : ' REPOUSO'}
              </Text>
              <Text style={s.actionBtnSub}>  Pausa sem penalidades</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Rest day overlay banner */}
        {isRestDay && (
          <View style={s.restDayBanner}>
            <Icon name="shield-moon" size={16} color={C.green} />
            <Text style={s.restDayBannerTxt}> [ ESTADO: REPOUSO DO MONARCA ]</Text>
          </View>
        )}

        {/* Unified daily status bar */}
        <View style={s.statusBar}>
          <View style={s.statusBarRow}>
            <Text style={s.statusBarLabel}>[ PROGRESSO DE HOJE ]</Text>
            <Text style={[s.statusBarCounter, done === total && total > 0 ? { color: C.green } : {}]}>
              {done}<Text style={s.statusBarSlash}> / </Text>{total}
            </Text>
          </View>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, {
              width: `${total > 0 ? (done / total) * 100 : 0}%` as any,
              backgroundColor: done === total && total > 0 ? C.green : C.neonBlue,
            }]} />
          </View>
          {isBossDay && (
            <View style={s.statusBarBossRow}>
              <Icon name="gate" size={9} color={bossDefeatedThisWeek ? C.green : C.neonRed} />
              <Text style={[s.statusBarBossLabel, { color: bossDefeatedThisWeek ? C.green : C.neonRed }]}>
                {bossDefeatedThisWeek ? ' BOSS DERROTADO' : ' BOSS RAID DISPONÍVEL'}
              </Text>
            </View>
          )}
        </View>

        {/* ── SECTION: MISSÕES DIÁRIAS ── */}
        <View style={s.sectionDivider}>
          <View style={s.sectionLine} />
          <Text style={s.sectionLabel}>MISSÕES DIÁRIAS</Text>
          <View style={s.sectionLine} />
        </View>

        {/* XP Boost active indicator */}
        {xpBoostNext && (
          <View style={s.boostBanner}>
            <Icon name="timer-sand-complete" size={12} color="#fbbf24" />
            <Text style={s.boostTxt}> AMPULHETA ATIVA — próxima missão com XP x2</Text>
          </View>
        )}

        {hasPenalty && (
          <View style={s.penalSection}>
            <View style={s.penalHeader}>
              <Icon name="alert-circle" size={12} color={C.neonRed} />
              <Text style={s.penalTitle}> MISSÕES DE PENALIZAÇÃO</Text>
            </View>
            {penaltyQ.map(q => <QuestCard key={q.id} quest={q} />)}
          </View>
        )}

        <View style={isRestDay ? { opacity: 0.45 } : undefined}>
          {quests.map(q => <QuestCard key={q.id} quest={q} />)}
        </View>

        {/* ── SECTION: MISSÕES EXTRA (pool bonus) ── */}
        {allDailyDone && (
          <>
            <View style={[s.sectionDivider, { marginTop: SPACING.sm }]}>
              <View style={[s.sectionLine, { backgroundColor: C.gold + '55' }]} />
              <Text style={[s.sectionLabel, { color: C.gold }]}>MISSÕES EXTRA</Text>
              <View style={[s.sectionLine, { backgroundColor: C.gold + '55' }]} />
            </View>

            <View style={s.extraInfoBox}>
              <Icon name="star-four-points" size={11} color={C.gold} />
              <Text style={s.extraInfoTxt}>
                {' '}Todas as missões diárias concluídas. O Sistema oferece desafios extras com recompensas 1.5×.
              </Text>
            </View>

            {extraQuests.map(q => (
              <View key={q.id} style={[s.extraCard, q.done && s.extraCardDone]}>
                <View style={s.extraCardLeft}>
                  <Icon
                    name={QUEST_CONFIG[q.type].icon}
                    size={18}
                    color={q.done ? C.dimmed : C.gold}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.extraCardLabel, q.done && { color: C.dimmed }]}>{q.label}</Text>
                  <Text style={s.extraCardDetail}>{q.detail}</Text>
                  <View style={s.extraRewards}>
                    <Icon name="lightning-bolt" size={10} color={q.done ? C.dimmed : C.gold} />
                    <Text style={[s.extraRewardTxt, q.done && { color: C.dimmed }]}> {q.xp} XP</Text>
                    <Icon name="rhombus" size={10} color={q.done ? C.dimmed : C.gold} style={{ marginLeft: 6 }} />
                    <Text style={[s.extraRewardTxt, q.done && { color: C.dimmed }]}> {q.gold} G</Text>
                    <View style={s.extraBonusBadge}>
                      <Text style={s.extraBonusTxt}>×1.5</Text>
                    </View>
                  </View>
                </View>
                {!q.done && (
                  <TouchableOpacity
                    style={s.extraCompleteBtn}
                    onPress={() => completeExtraQuest(q.id)}
                    activeOpacity={0.75}
                  >
                    <Icon name="check-bold" size={14} color={C.gold} />
                  </TouchableOpacity>
                )}
                {q.done && (
                  <Icon name="check-circle" size={20} color={C.dimmed} />
                )}
              </View>
            ))}

            {extraQuests.length < 2 && (
              <TouchableOpacity
                style={s.generateExtraBtn}
                onPress={() => generateExtraQuests()}
                activeOpacity={0.75}
              >
                <Icon name="plus-circle-outline" size={14} color={C.gold} />
                <Text style={s.generateExtraTxt}>
                  {extraQuests.length === 0
                    ? ' GERAR MISSÃO EXTRA'
                    : ' GERAR MAIS UMA MISSÃO EXTRA'}
                </Text>
                <Text style={s.generateExtraSub}> ({2 - extraQuests.length} restante{2 - extraQuests.length !== 1 ? 's' : ''})</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── SECTION: MISSÕES DE BOSS ── */}
        {isBossDay && (
          <>
            <View style={[s.sectionDivider, { marginTop: SPACING.sm }]}>
              <View style={[s.sectionLine, { backgroundColor: C.neonRed + '44' }]} />
              <Text style={[s.sectionLabel, { color: C.neonRed }]}>MISSÕES DE BOSS</Text>
              <View style={[s.sectionLine, { backgroundColor: C.neonRed + '44' }]} />
            </View>

            {!bossDefeatedThisWeek ? (
              <TouchableOpacity style={s.bossBanner} onPress={() => setShowDungeon(true)} activeOpacity={0.8}>
                <View style={s.bossBannerLeft}>
                  <Icon name="gate" size={20} color={C.neonRed} />
                  <View style={{ marginLeft: SPACING.sm }}>
                    <Text style={s.bossTitle}>PORTÃO VERMELHO DETECTADO</Text>
                    <Text style={s.bossSub}>Boss Raid disponível — Entra na Masmorra</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={18} color={C.neonRed} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.bossDefeatedBanner} onPress={() => setShowDungeon(true)} activeOpacity={0.8}>
                <Icon name="sword" size={14} color={C.green} />
                <Text style={s.bossDefeatedTxt}> MASMORRA LIMPA — Clica para ver detalhes</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Forge button — at end of list so combat is the visual priority */}
        <View style={{ marginTop: SPACING.md }}>
          <TouchableOpacity style={s.forgeBtn} onPress={() => setShowForge(true)}>
            <Icon name="hammer-wrench" size={20} color={C.neonBlue} />
            <Text style={s.forgeBtnTxt}> ABRIR FORJA DE MISSÕES</Text>
          </TouchableOpacity>
          <Text style={s.forgeSubtitle}>Cria missões personalizadas para subires de nível.</Text>
        </View>

      </ScrollView>

      {/* Dungeon selection modal */}
      <DungeonModal
        visible={showDungeon}
        onClose={() => setShowDungeon(false)}
        onSelectMission={handleMissionSelect}
        customMissions={customBossMissions}
        defeatedId={weeklyDefeatedBossId}
      />

      {/* Boss focus timer */}
      {activeBossQuest && activeMission?.type === 'focus' && (
        <FocusTimerModal
          quest={activeBossQuest}
          onClose={() => setActiveMission(null)}
          onComplete={() => {
            const mins = Math.round((activeMission.focusDuration ?? 90 * 60_000) / 60_000)
            completeBossMission(activeMission, mins)
          }}
        />
      )}

      {/* Boss GPS tracker */}
      {activeBossQuest && activeMission?.type === 'gps' && (
        <GPSTrackerModal
          quest={activeBossQuest}
          onClose={() => setActiveMission(null)}
          onComplete={() => completeBossMission(activeMission)}
        />
      )}

      {/* Boss training confirm */}
      {activeMission?.type === 'training' && (
        <CustomModal
          visible={confirmBossTraining}
          title="BOSS RAID — CERBERUS"
          message={`Confirmas que completaste:\n\n"${activeMission.detail}"`}
          confirmLabel="BOSS DERROTADO"
          confirmIcon="sword"
          confirmColor={C.neonRed}
          onConfirm={() => { setConfirmBossTraining(false); completeBossMission(activeMission) }}
          onCancel={() => { setConfirmBossTraining(false); setActiveMission(null) }}
        />
      )}

      {/* Victory modal */}
      {victoryInfo && (
        <BossVictoryModal
          info={victoryInfo}
          onClose={() => setVictoryInfo(null)}
        />
      )}

      {showForge && <QuestForgeScreen onClose={() => setShowForge(false)} />}

      {lastExtraction && (
        <ExtractionModal
          result={lastExtraction}
          onDismiss={dismissExtraction}
        />
      )}
    </SafeAreaView>
  )
}

// ── Side Quest rank config ──────────────────────────────────────────────────────

const SIDE_RANK_COLOR: Record<string, string> = {
  E: '#94a3b8',
  D: '#22c55e',
  C: '#00d4ff',
}

// ── Side Quest Card ────────────────────────────────────────────────────────────

function SideQuestCard({ sq }: { sq: SideQuest }) {
  const completeSQ = useGameStore(s => s.completeSideQuest)
  const removeSQ   = useGameStore(s => s.removeSideQuest)
  const [confirm, setConfirm] = useState(false)
  const rankColor = SIDE_RANK_COLOR[sq.rank] ?? C.muted

  function handleComplete() {
    const { leveledUp } = completeSQ(sq.id)
    Vibration.vibrate(leveledUp ? VIB_FOCUS : VIB_COMPLETE)
  }

  return (
    <View style={[sq_s.card, { borderColor: rankColor + '44' }, sq.done && sq_s.cardDone]}>
      <View style={[sq_s.rankBadge, { backgroundColor: rankColor + '18', borderColor: rankColor + '66' }]}>
        <Text style={[sq_s.rankTxt, { color: rankColor }]}>{sq.rank}</Text>
      </View>

      <View style={sq_s.info}>
        <Text style={[sq_s.title, sq.done && sq_s.titleDone]} numberOfLines={2}>{sq.title}</Text>
        <View style={sq_s.rewardRow}>
          <Icon name="star-four-points" size={9} color={sq.done ? C.dimmed : C.neonBlue} />
          <Text style={[sq_s.xp, sq.done && sq_s.dimmed]}> {sq.xp} XP</Text>
          <Text style={[sq_s.gold, sq.done && sq_s.dimmed]}>  ◈{sq.gold}</Text>
        </View>
      </View>

      {sq.done ? (
        <View style={sq_s.doneWrap}>
          <Icon name="check-circle" size={16} color={C.green} />
        </View>
      ) : (
        <TouchableOpacity style={[sq_s.doneBtn, { borderColor: rankColor }]} onPress={() => setConfirm(true)}>
          <Icon name="check-bold" size={13} color={rankColor} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={sq_s.delBtn} onPress={() => removeSQ(sq.id)}>
        <Icon name="close" size={13} color={C.dimmed} />
      </TouchableOpacity>

      <CustomModal
        visible={confirm}
        title="MISSÃO SECUNDÁRIA"
        message={`Concluíste:\n"${sq.title}"?`}
        confirmLabel="SIM, CONCLUÍ"
        confirmIcon="check-circle-outline"
        confirmColor={rankColor}
        onConfirm={() => { setConfirm(false); handleComplete() }}
        onCancel={() => setConfirm(false)}
      />
    </View>
  )
}

// ── Side Quest Section ─────────────────────────────────────────────────────────

function SideQuestSection() {
  const sideQuests = useGameStore(s => s.sideQuests)
  const addSQ      = useGameStore(s => s.addSideQuest)
  const [collapsed, setCollapsed] = useState(false)
  const [input, setInput]         = useState('')

  function handleAdd() {
    const title = input.trim()
    if (!title) return
    addSQ(title)
    setInput('')
  }

  const doneCount  = sideQuests.filter(q => q.done).length
  const totalCount = sideQuests.length

  return (
    <View style={side.container}>
      <TouchableOpacity style={side.header} onPress={() => setCollapsed(v => !v)} activeOpacity={0.7}>
        <Icon name="sword-cross" size={14} color={C.purple} />
        <Text style={side.title}> MISSÕES SECUNDÁRIAS</Text>
        {totalCount > 0 && (
          <View style={side.badge}>
            <Text style={side.badgeTxt}>{doneCount}/{totalCount}</Text>
          </View>
        )}
        <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color={C.muted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {!collapsed && (
        <>
          <Text style={side.sub}>
            Tarefas pessoais. Não contam para streak. O Sistema atribui recompensa aleatória.
          </Text>

          <View style={side.inputRow}>
            <TextInput
              style={side.input}
              value={input}
              onChangeText={setInput}
              placeholder="Nova tarefa..."
              placeholderTextColor={C.dimmed}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity style={side.addBtn} onPress={handleAdd}>
              <Icon name="plus" size={18} color={C.purple} />
            </TouchableOpacity>
          </View>

          {sideQuests.length === 0 ? (
            <Text style={side.empty}>Sem missões secundárias. Adiciona uma acima.</Text>
          ) : (
            sideQuests.map(sq => <SideQuestCard key={sq.id} sq={sq} />)
          )}
        </>
      )}
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: C.bg },
  content:       { padding: SPACING.md, paddingBottom: 96 },
  titleRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  title:         { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },
  forgeBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: C.neonBlue, borderRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: 16, marginBottom: 4 },
  forgeBtnTxt:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 13, letterSpacing: 1, fontWeight: '700' },
  forgeSubtitle: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: SPACING.md },
  restBadge:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.green + '18', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: C.green + '44' },
  restTxt:          { color: C.green, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
  actionRow:        { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  actionBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingVertical: 10, backgroundColor: C.panel },
  actionBtnTxt:     { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  actionBtnSub:     { color: C.dimmed, fontSize: 9, marginTop: 2 },
  restDayBanner:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.green + '12', borderWidth: 1, borderColor: C.green + '55', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.md },
  restDayBannerTxt: { color: C.green, fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 0, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: C.neonBlue, borderRadius: 0 },

  bossBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a0505', borderWidth: 1, borderColor: C.neonRed + '88', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.sm },
  bossBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bossTitle:      { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  bossSub:        { color: '#94a3b8', fontSize: 10, marginTop: 2 },
  bossDefeatedBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.green + '12', borderWidth: 1, borderColor: C.green + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  bossDefeatedTxt: { color: C.green, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },

  weeklyCard:    { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: C.border },
  weeklyHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  weeklyTitle:   { flex: 1, color: '#94a3b8', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  weeklyCount:   { color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  weeklyTrack:   { height: 4, backgroundColor: C.border, borderRadius: 0, overflow: 'hidden', marginBottom: 4 },
  weeklyFill:    { height: '100%', borderRadius: 0 },
  weeklyDone:    { color: C.green, fontSize: 10, fontStyle: 'italic' },
  boostBanner:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fbbf2415', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: '#fbbf2444' },
  boostTxt:      { color: '#fbbf24', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  penalSection:  { marginBottom: SPACING.md, borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 4, padding: SPACING.sm },
  penalHeader:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  penalTitle:    { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },

  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md, marginTop: 4 },
  sectionLine:    { flex: 1, height: 1, backgroundColor: C.neonBlue + '33' },
  sectionLabel:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, fontWeight: '700' },

  statusBar:          { backgroundColor: C.panel, borderWidth: 1, borderColor: C.neonBlue + '33', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.md },
  statusBarRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusBarLabel:     { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 2 },
  statusBarCounter:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 20, fontWeight: '900' },
  statusBarSlash:     { color: C.dimmed, fontSize: 14, fontWeight: '400' },
  statusBarBossRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 6, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 5 },
  statusBarBossLabel: { fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },

  extraInfoBox:      { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.gold + '10', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  extraInfoTxt:      { flex: 1, color: C.gold, fontSize: 11, lineHeight: 16 },

  extraCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.gold + '44', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  extraCardDone:     { opacity: 0.45 },
  extraCardLeft:     { width: 32, alignItems: 'center' },
  extraCardLabel:    { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  extraCardDetail:   { color: C.muted, fontSize: 11, lineHeight: 16, marginBottom: 5 },
  extraRewards:      { flexDirection: 'row', alignItems: 'center' },
  extraRewardTxt:    { color: C.gold, fontSize: 11, fontWeight: '700' },
  extraBonusBadge:   { marginLeft: 8, backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold + '55', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  extraBonusTxt:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5 },
  extraCompleteBtn:  { width: 36, height: 36, borderRadius: 4, borderWidth: 1, borderColor: C.gold, backgroundColor: C.gold + '15', alignItems: 'center', justifyContent: 'center' },

  generateExtraBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: C.gold + '66', borderRadius: 4, paddingVertical: 14, marginBottom: SPACING.sm },
  generateExtraTxt:  { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  generateExtraSub:  { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9 },
})

const qc = StyleSheet.create({
  card:      { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, marginBottom: 16, borderWidth: 1, borderColor: C.neonBlue + '33' },
  cardDone:  { opacity: 0.55 },
  header:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  typeTag:   { width: 28, height: 28, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label:     { flex: 1, color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  labelDone: { color: C.muted },
  rewards:   { flexDirection: 'row', alignItems: 'center' },
  xp:        { color: C.neonBlue, fontSize: 11, fontWeight: '700' },
  gold:      { color: C.gold, fontSize: 11, fontWeight: '700' },
  dimmedTxt: { color: C.dimmed },
  detail:    { color: C.muted, fontSize: 12, marginBottom: SPACING.md, lineHeight: 18 },
  actions:   { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 8 },
  actionTxt: { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  doneRow:   { flexDirection: 'row', alignItems: 'center' },
  doneTag:   { color: C.green, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  undoBtn:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  undoTxt:      { color: C.muted, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
  recordChip:    { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.gold + '10', borderWidth: 1, borderColor: C.gold + '33', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, marginBottom: SPACING.sm },
  recordChipTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9 },
  cardActive:    { borderColor: C.neonBlue + '99', shadowColor: C.neonBlue, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  activeTimerRow:{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.neonBlue + '12', borderWidth: 1, borderColor: C.neonBlue + '55', borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 10 },
  activeTimerTxt:{ color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
})

const fm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: '#000d', alignItems: 'center', justifyContent: 'center' },
  card:      { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.xl, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: '#a855f755' },
  title:     { color: '#a855f7', fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2, marginBottom: 4 },
  subtitle:  { color: C.muted, fontSize: 12, marginBottom: SPACING.lg },
  timerText: { color: '#fff', fontFamily: FONT.orbitron, fontSize: 52, fontWeight: '900' },
  timerSub:  { color: C.dimmed, fontSize: 11, marginTop: 4, marginBottom: SPACING.md },
  track:     { width: '100%', height: 6, backgroundColor: '#a855f718', borderRadius: 0, overflow: 'hidden', marginBottom: SPACING.lg },
  fill:      { height: '100%', backgroundColor: '#a855f7' },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  cancelTxt: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
})

const gm = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: '#000d', alignItems: 'center', justifyContent: 'center' },
  card:     { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.xl, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: C.green + '55' },
  title:    { color: C.green, fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2, marginBottom: 4 },
  subtitle: { color: C.muted, fontSize: 12, marginBottom: SPACING.lg },
  dist:     { color: '#fff', fontFamily: FONT.orbitron, fontSize: 42, fontWeight: '900' },
  distUnit: { color: C.muted, fontSize: 16 },
  track:    { width: '100%', height: 6, backgroundColor: C.green + '18', borderRadius: 0, overflow: 'hidden', marginVertical: SPACING.md },
  fill:     { height: '100%', backgroundColor: C.green },
  warnRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  warn:     { color: C.neonRed, fontSize: 11 },
  error:    { color: C.neonRed, fontSize: 12, textAlign: 'center', marginBottom: SPACING.md },
  cancelBtn:{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: 10, marginTop: SPACING.sm },
  cancelTxt:{ color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
})

const dm = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: '#000000ee', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:          { backgroundColor: '#0a0005', borderRadius: 4, padding: SPACING.lg, width: '100%', alignItems: 'center', borderWidth: 2, borderColor: C.neonRed + '88' },
  warning:       { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 3, marginBottom: 4 },
  title:         { color: '#fff', fontFamily: FONT.orbitron, fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.sm },
  sub:           { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: SPACING.lg },
  missionBtn:    { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  missionIcon:   { width: 40, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  missionInfo:   { flex: 1 },
  missionLabel:  { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  missionDetail: { color: C.muted, fontSize: 11, lineHeight: 15 },
  cancelBtn:        { marginTop: SPACING.sm, paddingVertical: 10, paddingHorizontal: SPACING.xl },
  cancelTxt:        { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  shadowExtractTag: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  shadowExtractTxt: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5 },
})

const bv = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: '#000000ee', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:       { backgroundColor: '#050a00', borderRadius: 4, padding: SPACING.xl, width: '100%', alignItems: 'center', borderWidth: 2, borderColor: C.gold + '66' },
  header:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 22, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.sm },
  sub:        { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginBottom: SPACING.lg },
  rewardsBox: { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, width: '100%', gap: SPACING.sm, marginBottom: SPACING.md },
  rewardRow:  { flexDirection: 'row', alignItems: 'center' },
  rewardTxt:  { color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 16, fontWeight: '700' },
  shadowHint: { color: C.dimmed, fontSize: 10, fontStyle: 'italic', textAlign: 'center', marginBottom: SPACING.md },
  btn:        { backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold, borderRadius: 4, paddingVertical: 14, paddingHorizontal: SPACING.xl },
  btnTxt:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2 },
})

const side = StyleSheet.create({
  container: { marginTop: SPACING.md, borderWidth: 1, borderColor: C.purple + '44', borderRadius: 4, overflow: 'hidden' },
  header:    { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, backgroundColor: C.purple + '0d' },
  title:     { color: C.purple, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  badge:     { backgroundColor: C.purple + '22', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, marginLeft: SPACING.sm },
  badgeTxt:  { color: C.purple, fontFamily: FONT.orbitron, fontSize: 9 },
  sub:       { color: C.dimmed, fontSize: 11, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, lineHeight: 16 },
  inputRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm },
  input:     { flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 10, color: '#e2e8f0', fontSize: 13 },
  addBtn:    { backgroundColor: C.purple + '18', borderWidth: 1, borderColor: C.purple + '66', borderRadius: 4, padding: 10 },
  empty:     { color: C.dimmed, fontSize: 11, fontStyle: 'italic', textAlign: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md },
})

const sq_s = StyleSheet.create({
  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: C.border + '55', gap: SPACING.sm, borderLeftWidth: 2, borderLeftColor: 'transparent' },
  cardDone:   { opacity: 0.5 },
  rankBadge:  { width: 28, height: 28, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankTxt:    { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  info:       { flex: 1 },
  title:      { color: '#e2e8f0', fontSize: 13, lineHeight: 17 },
  titleDone:  { color: C.muted, textDecorationLine: 'line-through' },
  rewardRow:  { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  xp:         { color: C.neonBlue, fontSize: 10, fontWeight: '700' },
  gold:       { color: C.gold, fontSize: 10, fontWeight: '700' },
  dimmed:     { color: C.dimmed },
  doneBtn:    { width: 32, height: 32, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  doneWrap:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  delBtn:     { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
})
