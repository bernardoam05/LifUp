import React, { useRef, useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, AppState, AppStateStatus,
  Vibration, TextInput, BackHandler, Alert,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { Quest, SideQuest, getDailyMissionTarget, isWeeklyBossDefinition } from '../store/useGameStore'
import { SHADOW_MAP } from '../data/shadows'
import { RAID_BOSSES, DungeonMission, getActiveEventBossMissions, buildEventTrials, EVENT_BOSS_DEFS } from '../data/bosses'
import { ALL_DUNGEON_KEYS, getKeyByBossId } from '../data/dungeonKeys'
import QuestForgeScreen from './QuestForgeScreen'
import MissionActiveScreen from './MissionActiveScreen'
import CustomModal from '../components/CustomModal'
import SoloLevelingModal from '../components/SoloLevelingModal'
import { useLocationTracker } from '../hooks/useLocationTracker'
import { scheduleSideQuestNotification, cancelSideQuestNotification } from '../utils/notifications'
import BottomSheetModal from '../components/BottomSheetModal'
import GPSTrackerModal from '../components/GPSTrackerModal'
import QuestCard from '../components/QuestCard'
import WeeklyDungeonModal from '../components/WeeklyDungeonModal'
import EventDungeonModal from '../components/EventDungeonModal'
import BossVictoryModal from '../components/BossVictoryModal'
import ShadowExtractionModal from '../components/ShadowExtractionModal'
import { useTheme, FONT, SPACING, RANK_COLORS } from '../theme'

// Vibration patterns
const VIB_COMPLETE = [0, 80, 40, 120]
const VIB_FOCUS = [0, 200, 80, 200, 80, 400]

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  content: { padding: SPACING.md, paddingBottom: 96 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  title: { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },
  forgeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: C.neonBlue, borderRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: 16, marginBottom: 4 },
  forgeBtnTxt: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 13, letterSpacing: 1, fontWeight: '700' },
  forgeSubtitle: { color: C.muted, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: SPACING.md },
  restBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.green + '18', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: C.green + '44' },
  restTxt: { color: C.green, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingVertical: 10, backgroundColor: C.panel },
  actionBtnTxt: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  actionBtnSub: { color: C.dimmed, fontSize: 9, marginTop: 2 },
  restDayBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.green + '12', borderWidth: 1, borderColor: C.green + '55', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.md },
  restDayBannerTxt: { color: C.green, fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  systemCard: { borderRadius: 4, borderWidth: 1, padding: SPACING.sm, marginBottom: SPACING.sm },
  cardNormal: { backgroundColor: C.panel, borderColor: C.neonBlue + '33' },
  cardWarning: { backgroundColor: C.neonRed + '10', borderColor: C.neonRed + '66' },
  cardSuccess: { backgroundColor: C.green + '12', borderColor: C.green + '44' },
  progressTrack: { height: 4, backgroundColor: C.border, borderRadius: 0, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.neonBlue, borderRadius: 0 },

  bossBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.md },
  bossBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  bossTitle: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  bossSub: { color: C.muted, fontSize: 10, marginTop: 2 },
  bossDefeatedBanner: { flexDirection: 'row', alignItems: 'center', padding: SPACING.sm },
  bossDefeatedTxt: { color: C.green, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  eventCard: { backgroundColor: C.gold + '08', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  eventHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  eventHeaderTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  eventSub: { color: C.dimmed, fontSize: 10, marginBottom: 6 },
  eventTrack: { height: 6, backgroundColor: C.gold + '12', borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: C.gold + '33', marginBottom: 6 },
  eventFill: { height: '100%', backgroundColor: C.gold },
  eventTrialsList: { marginBottom: 6 },
  eventTrialRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  eventTrialTxt: { color: C.muted, fontSize: 10 },
  eventTrialDone: { color: C.green },
  eventHint: { color: C.muted, fontSize: 10 },

  weeklyCard: { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm, borderWidth: 1, borderColor: C.border },
  weeklyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  weeklyTitle: { flex: 1, color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  weeklyCount: { color: '#fff', fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  weeklyTrack: { height: 4, backgroundColor: C.border, borderRadius: 0, overflow: 'hidden', marginBottom: 4 },
  weeklyFill: { height: '100%', borderRadius: 0 },
  weeklyDone: { color: C.green, fontSize: 10, fontStyle: 'italic' },
  boostBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.gold + '15', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  boostTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  penalSection: { marginBottom: SPACING.md, borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 4, padding: SPACING.sm },
  penalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  penalTitle: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },

  sectionDivider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md, marginTop: 4 },
  sectionLine: { flex: 1, height: 1, backgroundColor: C.neonBlue + '33' },
  sectionLabel: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  regenBtnInline: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.neonBlue + '15', borderWidth: 1, borderColor: C.neonBlue + '44', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  regenBtnTxt: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },

  statusBar: { padding: SPACING.sm, marginBottom: SPACING.md },
  statusBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  statusBarLabel: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 2 },
  statusBarCounter: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 20, fontWeight: '900' },
  statusBarSlash: { color: C.dimmed, fontSize: 14, fontWeight: '400' },
  statusBarBossRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 5 },
  statusBarBossLabel: { fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
  nowPanel: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.neonBlue + '33', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.md, gap: 6 },
  nowHeader: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  nowRow: { flexDirection: 'row', alignItems: 'center' },
  nowTxt: { color: C.muted, fontSize: 11, marginLeft: 6, flex: 1 },
  collapsibleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 10, marginBottom: SPACING.sm },
  collapsibleTitle: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 1 },

  extraInfoBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.gold + '10', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  extraInfoTxt: { flex: 1, color: C.gold, fontSize: 11, lineHeight: 16 },

  dungeonBreakBanner: { padding: SPACING.md, marginBottom: SPACING.md, alignItems: 'center', gap: 6 },
  dungeonBreakTxt: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  dungeonBreakSub: { color: C.muted, fontSize: 10, textAlign: 'center' },

  extraCard: { opacity: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.gold + '44', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  extraCardDone: { opacity: 0.45 },
  extraCardLeft: { width: 32, alignItems: 'center' },
  extraCardLabel: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 },
  extraCardDetail: { color: C.muted, fontSize: 11, lineHeight: 16, marginBottom: 5 },
  extraRewards: { flexDirection: 'row', alignItems: 'center' },
  extraRewardTxt: { color: C.gold, fontSize: 11, fontWeight: '700' },
  extraBonusBadge: { marginLeft: 8, backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold + '55', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  extraBonusTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5 },
  extraCompleteBtn: { width: 36, height: 36, borderRadius: 4, borderWidth: 1, borderColor: C.gold, backgroundColor: C.gold + '15', alignItems: 'center', justifyContent: 'center' },

  generateExtraBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: C.gold + '66', borderRadius: 4, paddingVertical: 14, marginBottom: SPACING.sm },
  generateExtraTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  generateExtraSub: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9 },
})


const getSKStyles = (C: any) => StyleSheet.create({
  keyGrid: { gap: SPACING.md, paddingRight: SPACING.md, marginTop: 4 },
  keyCard: { 
    flexDirection: 'row', 
    width: 200, 
    height: 70, 
    backgroundColor: C.panel, 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: SPACING.sm, 
    alignItems: 'center', 
    gap: SPACING.sm 
  },
  keyIconWrap: { 
    width: 44, 
    height: 44, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
  },
  keyInfo: { flex: 1, justifyContent: 'center' },
  keyName: { fontFamily: FONT.orbitron, fontSize: 9, fontWeight: '900', marginBottom: 2 },
  keyBoss: { color: C.dimmed, fontSize: 7, textTransform: 'uppercase', fontFamily: FONT.orbitron },
})






// Normals moved to dictionary


function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Termina em 0m'
  const totalMinutes = Math.floor(ms / 60_000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h > 0) return `Termina em ${h}h ${m}m`
  return `Termina em ${m}m`
}



// ── Screen ─────────────────────────────────────────────────────────────────────

export default function QuestScreen() {
  const C = useTheme()
  const s = getStyles(C)
  const sk = getSKStyles(C)
  const insets = useSafeAreaInsets()

  const quests = useGameStore(s => s.quests)
  const hasPenalty = useGameStore(s => s.system.hasPenalty)
  const penaltyQ = useGameStore(s => s.system.penaltyQuests)
  const xpBoostNext = useGameStore(s => s.system.xpBoostNext)
  const bossDefeatedThisWeek = useGameStore(s => s.system.bossDefeatedThisWeek)
  const weeklyDefeatedBossId = useGameStore(s => s.system.weeklyDefeatedBossId)
  const defeatBoss = useGameStore(s => s.defeatDungeonBoss)
  const recordFocus = useGameStore(s => s.recordFocusTime)
  const triggerEvent = useGameStore(s => s.triggerEvent)
  const questDictionary = useGameStore(s => s.questDictionary)
  const updateSettings = useGameStore(s => s.updateSettings)
  const activeRaidBoss = useGameStore(s => s.system.activeRaidBoss)
  // Custom boss missions filtered by weekly rotation
  const weeklyBossIds = useGameStore(s => s.system.weeklyBossIds || [])
  const eventBossKey = useGameStore(s => s.system.eventBossKey)
  const eventBossCompletedIds = useGameStore(s => s.system.eventBossCompletedIds)
  const eventBossRequired = useGameStore(s => s.system.eventBossRequired)
  const eventBossDefeated = useGameStore(s => s.system.eventBossDefeated)
  const setEventBossState = useGameStore(s => s.setEventBossState)
  const completeEventTrial = useGameStore(s => s.completeEventTrial)
  const markEventBossDefeated = useGameStore(s => s.markEventBossDefeated)
  const pendingRaidId = useGameStore(s => s.system.pendingRaidExtractionId)
  const clearRaid     = useGameStore(s => s.clearPendingRaidExtraction)

  // Trigger extraction for Raid bosses (which are defeated globally via store)
  useEffect(() => {
    if (pendingRaidId) {
      setExtractionBossId(pendingRaidId)
      setExtractionCategory('raid')
      clearRaid()
    }
  }, [pendingRaidId])
  const playerDungeonKeys = useGameStore(s => s.player.dungeonKeys)
  const system = useGameStore(s => s.system)
  const enterDungeon = useGameStore(s => s.enterDungeon)
  const customBossMissions: DungeonMission[] = questDictionary
    .filter(def => isWeeklyBossDefinition(def) && weeklyBossIds.includes(def.id))
    .map(def => ({
      id: `custom_boss_${def.id}`,
      label: def.title,
      detail: def.description
        .replace(/{target}/g, String(def.baseTarget))
        .replace(/{unit}/g, def.unit),
      type: def.questType,
      shadowHint: def.id,
      icon: 'sword',
      color: C.gold,
      category: def.id.startsWith('key_boss_') ? 'key' : def.id.startsWith('break_boss_') ? 'dungeon_break' : 'dungeon' as any,
      customShadow: def.shadowName
        ? { name: def.shadowName, icon: def.shadowIcon ?? 'ghost', questType: def.questType }
        : undefined,
    }))
  const eventBossMissions = React.useMemo(() => getActiveEventBossMissions(), [])
  const activeEventDef = React.useMemo(() =>
    EVENT_BOSS_DEFS.find(def => eventBossMissions.some(m => m.id === def.id)),
    [eventBossMissions])

  const eventTrials = React.useMemo(() =>
    activeEventDef ? buildEventTrials(activeEventDef, C) : [],
    [activeEventDef, C])


  const activeEventKey = React.useMemo(() =>
    activeEventDef ? `${activeEventDef.id}-${new Date().getFullYear()}` : '',
    [activeEventDef])

  const eventCompleted = (activeEventKey && eventBossKey === activeEventKey) ? eventBossCompletedIds : []
  const eventRequired = activeEventDef?.required ?? 0
  const eventUnlocked = activeEventDef ? eventCompleted.length >= eventRequired : false
  const eventBossMission = (activeEventDef && eventUnlocked)
    ? eventBossMissions.find(m => m.id === activeEventDef.id) ?? null
    : null

  const extraQuests = useGameStore(s => s.extraQuests)
  const generateExtraQuests = useGameStore(s => s.generateExtraQuests)
  const completeExtraQuest = useGameStore(s => s.completeExtraQuest)
  const playerLevel = useGameStore(s => s.player.level)
  const missionDifficulty = useGameStore(s => s.settings.missionDifficulty)
  const normalBossIds = useGameStore(s => s.system.normalBossIds || [])

  const done = quests.filter(q => q.done).length
  const total = quests.length
  const allDailyDone = quests.every(q => q.done || q.type === 'limit' || q.type === 'forbidden') && total > 0

  const dayOfWeek = new Date().getDay()
  const isRestDay = useGameStore(s => s.settings.restDay)
  const isBossDay = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0  // Fri/Sat/Sun

  const [showDungeon, setShowDungeon] = useState(false)
  const [showEventDungeon, setShowEventDungeon] = useState(false)
  const [showForge, setShowForge] = useState(false)
  const [activeMission, setActiveMission] = useState<DungeonMission | null>(null)
  const [confirmBossTraining, setConfirmBossTraining] = useState(false)
  const [victoryInfo, setVictoryInfo] = useState<{ xp: number; gold: number; shadowName?: string; leveledUpShadow?: boolean } | null>(null)
  const [eventProgressInfo, setEventProgressInfo] = useState<{ name: string; completed: number; required: number } | null>(null)
  const [extractionBossId, setExtractionBossId] = useState<string | null>(null)
  const [extractionCategory, setExtractionCategory] = useState<'dungeon' | 'dungeon_break' | 'event' | 'key' | 'raid'>('dungeon')
  const [pendingMission, setPendingMission] = useState<{ m: DungeonMission, focusMinutes?: number } | null>(null)
  const [keyConfirm, setKeyConfirm] = useState<{ type: 'normal' | 'weekly', mission: DungeonMission, key: any } | null>(null)
  const [sectionsOpen, setSectionsOpen] = useState({
    now: true,
    today: true,
    portals: true,
    events: true,
    extras: true,
  })

  const toggleSection = (key: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const nowForReset = new Date()
  const resetAt = new Date(nowForReset)
  resetAt.setHours(24, 0, 0, 0)
  const nextReset = formatCountdown(resetAt.getTime() - nowForReset.getTime())

  const activeDailyQuest = quests.find(q => !q.done && q.type !== 'limit' && q.type !== 'forbidden')

  useEffect(() => {
    if (!activeEventDef || !activeEventKey) return
    // Only reset/initialize if the key actually changed
    // Use a ref or the current state from store to compare
    if (eventBossKey !== activeEventKey) {
      console.log('[QuestScreen] Event key changed, updating boss state:', activeEventKey);
      setEventBossState(activeEventKey, activeEventDef.required, eventTrials.length)
    }
  }, [activeEventKey, activeEventDef?.required, eventTrials.length, eventBossKey, setEventBossState])

  useEffect(() => {
    const onBackPress = () => {
      if (activeMission) {
        setActiveMission(null)
        setConfirmBossTraining(false)
        return true
      }
      if (showEventDungeon) {
        setShowEventDungeon(false)
        return true
      }
      if (showDungeon) {
        setShowDungeon(false)
        return true
      }
      if (showForge) {
        setShowForge(false)
        return true
      }
      return false
    }
    BackHandler.addEventListener('hardwareBackPress', onBackPress)
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress)
  }, [activeMission, showEventDungeon, showDungeon, showForge])

  function handleMissionSelect(m: DungeonMission) {
    setActiveMission(m)
    if (m.type === 'training') setConfirmBossTraining(true)
  }

  const handleExtractionClose = (success: boolean) => {
    setExtractionBossId(null)
    if (pendingMission) {
      const { m, focusMinutes } = pendingMission
      const shadowToGive = success ? m.shadowHint : ''
      const result = defeatBoss(shadowToGive, m.customShadow)
      setVictoryInfo(result)
      const missionId = m.id.startsWith('custom_boss_') ? m.id.slice('custom_boss_'.length) : m.id
      if (m.id === 'boss_gps' || (m.id.startsWith('custom_boss_') && m.type === 'gps') || (m.isEventBoss && m.type === 'gps') || (m.id.startsWith('normal_dungeon_') && m.type === 'gps'))
        triggerEvent('boss_gps_completed', { missionId })
      if (m.id === 'boss_focus' || (m.id.startsWith('custom_boss_') && m.type === 'focus') || (m.isEventBoss && m.type === 'focus') || (m.id.startsWith('normal_dungeon_') && m.type === 'focus'))
        triggerEvent('boss_focus_completed', { missionId })
      if (m.id === 'boss_training' || (m.id.startsWith('custom_boss_') && m.type === 'training') || (m.isEventBoss && m.type === 'training') || (m.id.startsWith('normal_dungeon_') && m.type === 'training'))
        triggerEvent('boss_training_completed', { missionId })
      if (m.isEventBoss && m.eventKey) {
        markEventBossDefeated(m.eventKey)
      }
      setPendingMission(null)
    }
  }
  function completeBossMission(m: DungeonMission, focusMinutes?: number) {
    setActiveMission(null)
    if (focusMinutes) recordFocus(focusMinutes)

    // Event trials just progress the event, no extraction
    if (m.isEventTrial && m.eventKey) {
      const res = completeEventTrial(m.id, m.eventKey, eventRequired, eventTrials.length)
      setEventProgressInfo({ name: m.eventName ?? 'EVENTO', completed: res.completed, required: res.required })
      return
    }

    // All real boss kills trigger the Shadow Extraction (Arise) modal
    setExtractionBossId(m.shadowHint)
    setExtractionCategory(m.category || 'dungeon')
    setPendingMission({ m, focusMinutes })
  }

  // Convert active dungeon mission to Quest shape for existing tracker modals
  const activeBossQuest: Quest | null = activeMission ? {
    id: activeMission.id,
    label: activeMission.label,
    detail: activeMission.detail,
    xp: 0,
    gold: 0,
    type: activeMission.type,
    done: false,
    gpsTarget: activeMission.gpsTarget,
    focusDuration: activeMission.focusDuration,
  } : null

  return (
    <View style={s.safeArea}>
      <ScrollView contentContainerStyle={s.content}>

        {/* ── GLOBAL RAID BOSS ── */}
        {activeRaidBoss && (() => {
          const def = RAID_BOSSES.find(b => b.id === activeRaidBoss.defId)
          if (!def) return null
          const progress = activeRaidBoss.currentHp / activeRaidBoss.maxHp
          const timeLeftMs = activeRaidBoss.endDate - Date.now()

          return (
            <View style={[s.systemCard, s.cardWarning, { marginBottom: 20, padding: 12, backgroundColor: def.color + '15', borderColor: def.color + '50', borderRadius: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Icon name={def.icon} size={24} color={def.color} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: FONT.orbitron, fontSize: 10, color: def.color, letterSpacing: 1 }}>RAID BOSS GLOBAL · RANK {def.rank}</Text>
                  <Text style={{ fontFamily: FONT.orbitron, fontSize: 14, color: '#fff', fontWeight: 'bold', marginTop: 2 }}>{def.name}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Icon name="timer-sand" size={12} color={C.dimmed} />
                  <Text style={{ fontFamily: FONT.orbitron, fontSize: 9, color: C.dimmed, marginTop: 2 }}>{formatCountdown(timeLeftMs)}</Text>
                </View>
              </View>

              <View style={{ height: 6, backgroundColor: C.bg, borderRadius: 3, overflow: 'hidden', marginBottom: 4, borderWidth: 1, borderColor: C.border }}>
                <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: def.color }} />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: FONT.orbitron, fontSize: 9, color: C.dimmed }}>HP RESTANTE</Text>
                <Text style={{ fontFamily: FONT.orbitron, fontSize: 10, color: C.muted }}>{Math.floor(activeRaidBoss.currentHp)} <Text style={{ fontSize: 9, color: C.dimmed }}>/ {activeRaidBoss.maxHp}</Text></Text>
              </View>
            </View>
          )
        })()}

        <TouchableOpacity style={[s.collapsibleHeader, { backgroundColor: C.surface.base }]} onPress={() => toggleSection('now')} activeOpacity={0.8}>
          <Text style={s.collapsibleTitle}>HOJE</Text>
          <Icon name={sectionsOpen.now ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
        </TouchableOpacity>
        {sectionsOpen.now && (
          <View style={s.nowPanel}>
            <Text style={s.nowHeader}>PAINEL RÁPIDO</Text>
            <View style={s.nowRow}>
              <Icon name="clipboard-play-outline" size={14} color={C.neonBlue} />
              <Text style={s.nowTxt}>
                {activeDailyQuest ? (
                  <TouchableOpacity onPress={() => setActiveMission(null)}>
                    <Text style={{ color: C.neonBlue, textDecorationLine: 'underline' }}>Missão em foco: {activeDailyQuest.label} - TAP PARA ACESSAR</Text>
                  </TouchableOpacity>
                ) : 'Nenhuma missão ativa agora.'}
              </Text>
            </View>
            <View style={s.nowRow}>
              <Icon name="gate" size={14} color={C.neonRed} />
              <Text style={s.nowTxt}>
                {system.activeDungeonBreak ? (
                  <TouchableOpacity onPress={() => setShowDungeon(true)}>
                    <Text style={{ color: C.neonRed, textDecorationLine: 'underline' }}>Portal dinâmico ativo - {formatCountdown(Math.max(0, system.activeDungeonBreak.expiresAt - Date.now()))} - TAP PARA ACESSAR</Text>
                  </TouchableOpacity>
                ) : 'Nenhum portal dinâmico ativo.'}
              </Text>
            </View>
            <View style={s.nowRow}>
              <Icon name="calendar-star" size={14} color={C.gold} />
              <Text style={s.nowTxt}>
                {activeEventDef ? (
                  <TouchableOpacity onPress={() => setShowEventDungeon(true)}>
                    <Text style={{ color: C.neonBlue, textDecorationLine: 'underline' }}>Evento {activeEventDef.event.name} disponível ({eventCompleted.length}/{eventRequired}) - TAP PARA ACESSAR</Text>
                  </TouchableOpacity>
                ) : 'Nenhum evento ativo neste momento.'}
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity style={[s.collapsibleHeader, { backgroundColor: C.surface.base }]} onPress={() => toggleSection('today')} activeOpacity={0.8}>
          <Text style={s.collapsibleTitle}>MISSÕES</Text>
          <Icon name={sectionsOpen.today ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
        </TouchableOpacity>
        {sectionsOpen.portals && (
          <>
        {/* ── KEY INVENTORY / INSTANT ACCESS ── */}
        {playerDungeonKeys.length > 0 && (
          <View style={{ marginBottom: SPACING.lg }}>
            <View style={s.sectionHeaderRow}>
               <View style={[s.sectionDivider, { marginBottom: 0, flex: 1 }]}>
                <View style={s.sectionLine} />
                <Text style={s.sectionLabel}>CHAVES DE MASMORRA ({playerDungeonKeys.length})</Text>
                <View style={s.sectionLine} />
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -SPACING.md }} contentContainerStyle={{ paddingHorizontal: SPACING.md, gap: SPACING.sm }}>
              {playerDungeonKeys.map(keyId => {
                const key = ALL_DUNGEON_KEYS.find(k => k.id === keyId)
                if (!key) return null
                return (
                  <TouchableOpacity
                    key={keyId}
                    style={[sk.keyCard, { borderColor: key.color + '44' }]}
                    onPress={() => {
                      const mission: DungeonMission = {
                        id: `key_mission_${key.id}`,
                        label: key.name,
                        detail: key.missionDetail,
                        type: key.missionType,
                        shadowHint: key.bossId,
                        icon: 'gate',
                        color: key.color,
                        category: 'key',
                        focusDuration: key.missionType === 'focus' ? key.missionTarget : undefined,
                        gpsTarget: key.missionType === 'gps' ? key.missionTarget : undefined,
                      }
                      setKeyConfirm({ type: 'normal', mission, key })
                    }}
                  >
                    <View style={[sk.keyIconWrap, { backgroundColor: key.color + '12', borderColor: key.color + '44' }]}>
                      <Icon name="key-variant" size={20} color={key.color} />
                    </View>
                    <View style={sk.keyInfo}>
                      <Text style={[sk.keyName, { color: key.color }]} numberOfLines={1}>{key.name.toUpperCase()}</Text>
                      <Text style={sk.keyBoss} numberOfLines={1}>ALVO: {key.bossId.replace(/_/g, ' ')}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* ── SECTION: PORTÕES NORMAIS (Periodic) ── */}
        {normalBossIds.length > 0 && (
          <View style={{ marginBottom: SPACING.lg }}>
            <View style={s.sectionHeaderRow}>
               <View style={[s.sectionDivider, { marginBottom: 0, flex: 1 }]}>
                <View style={[s.sectionLine, { backgroundColor: C.neonBlue + '55' }]} />
                <Text style={[s.sectionLabel, { color: C.neonBlue }]}>DUNGEONS DISPONÍVEIS ({normalBossIds.length})</Text>
                <View style={[s.sectionLine, { backgroundColor: C.neonBlue + '55' }]} />
              </View>
            </View>
            <View style={{ gap: SPACING.sm }}>
              {normalBossIds.filter(id => !system.completedNormalBossIds?.includes(id)).map(id => {
                const b = questDictionary.find(d => d.id === id)
                if (!b) return null
                
                // Convert definition to simple mission for handler
                const mission: DungeonMission = {
                  id: `normal_dungeon_${b.id}`,
                  label: b.title,
                  detail: b.description.replace(/{target}/g, String(b.baseTarget)).replace(/{unit}/g, b.unit),
                  type: b.questType,
                  shadowHint: b.id,
                  icon: b.questType === 'focus' ? 'timer-sand' : b.questType === 'gps' ? 'run-fast' : 'arm-flex',
                  color: b.questType === 'focus' ? C.purple : b.questType === 'gps' ? C.green : C.neonRed,
                }

                const isRedGate = b.id === 'normal_boss_cerberus' || b.id === 'normal_boss_igris' || b.questType === 'training'
                const gateColor = isRedGate ? C.neonRed : C.neonBlue
                const badgeText = isRedGate ? 'RED GATE' : 'PORTAL'

                return (
                  <TouchableOpacity
                    key={id}
                    style={[s.systemCard, {
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: gateColor + '0d',
                      borderRadius: 4,
                      borderLeftWidth: 4,
                      borderColor: gateColor + '66',
                      padding: SPACING.md,
                      gap: SPACING.md,
                    }]}
                    onPress={() => handleMissionSelect(mission)}
                  >
                    <View style={{ width: 44, height: 56, backgroundColor: gateColor + '15', borderWidth: 1, borderColor: gateColor, alignItems: 'center', justifyContent: 'center', borderRadius: 2, borderStyle: 'dashed' }}>
                      <Text style={{ fontFamily: FONT.orbitron, color: gateColor, fontSize: 8, marginTop: 4 }}>RANK</Text>
                      <Text style={{ fontFamily: FONT.orbitron, color: gateColor, fontSize: 16, fontWeight: 'bold' }}>{b.baseXP >= 600 ? 'A' : b.baseXP >= 500 ? 'B' : 'C'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <View style={{ backgroundColor: gateColor, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 2, marginRight: 6 }}>
                          <Text style={{ fontFamily: FONT.orbitron, color: '#000', fontSize: 7, fontWeight: 'bold', letterSpacing: 0.5 }}>{badgeText}</Text>
                        </View>
                        <Icon name="timer-sand" size={10} color={C.dimmed} />
                        <Text style={{ fontFamily: FONT.orbitron, fontSize: 9, color: C.dimmed, marginLeft: 2 }}>{nextReset}</Text>
                      </View>
                      <Text style={{ fontFamily: FONT.orbitron, fontSize: 13, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 }}>{mission.label}</Text>
                      <Text style={{ fontSize: 10, color: C.muted, marginTop: 2, lineHeight: 14 }}>{mission.detail}</Text>
                      {b.rewards && b.rewards.length > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                          <Icon name="diamond-stone" size={10} color={C.gold} />
                          <Text style={{ fontFamily: FONT.orbitron, fontSize: 8, color: C.gold, marginLeft: 4 }}>LOOT: {b.rewards[0].replace(/_/g, ' ').toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Icon name="chevron-right" size={24} color={gateColor + 'aa'} />
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}
          </>
        )}

        <TouchableOpacity style={[s.collapsibleHeader, { backgroundColor: C.surface.base }]} onPress={() => toggleSection('today')} activeOpacity={0.8}>
          <Text style={s.collapsibleTitle}>MISSÕES</Text>
          <Icon name={sectionsOpen.today ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
        </TouchableOpacity>
        {sectionsOpen.today && (
          <>
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


        {/* Unified daily status bar */}
        <View style={[s.systemCard, s.cardNormal, s.statusBar]}>
          <View style={s.statusBarRow}>
            <Text style={s.statusBarLabel}>PROGRESSO DE HOJE</Text>
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

        {/* Dungeon Break Alert */}
        {system.activeDungeonBreak &&
          Date.now() >= (system.activeDungeonBreak.startsAt ?? 0) &&
          Date.now() < system.activeDungeonBreak.expiresAt && (
          <TouchableOpacity
            style={[s.systemCard, s.cardWarning, s.dungeonBreakBanner, { borderWidth: 2, borderColor: C.neonRed }]}
            onPress={() => {
              const db = system.activeDungeonBreak;
              if (!db) return;
              if (db.source === 'quest') {
                const def = questDictionary.find(d => d.id === db.bossId)
                if (!def) return
                const mission: DungeonMission = {
                  id: `portal_${def.id}`,
                  label: `Portal Dinâmico: ${def.title}`,
                  detail: def.description.replace(/{target}/g, String(def.baseTarget)).replace(/{unit}/g, def.unit),
                  type: def.questType,
                  shadowHint: def.id,
                  icon: def.questType === 'focus' ? 'timer-sand' : def.questType === 'gps' ? 'run-fast' : 'arm-flex',
                  color: def.questType === 'focus' ? C.purple : def.questType === 'gps' ? C.green : C.neonRed,
                  category: 'dungeon',
                }
                handleMissionSelect(mission)
                return
              }

              const boss = RAID_BOSSES.find(b => b.id === db.bossId)
              if (!boss) return
              const remainingMs = Math.max(0, db.expiresAt - Date.now())
              const targetFocus = Math.max(10 * 60_000, Math.min(25 * 60_000, Math.floor(remainingMs * 0.5)))
              const mission: DungeonMission = {
                id: `break_${boss.id}`,
                label: `Dungeon Break: ${boss.name}`,
                detail: `Um portal abriu-se numa zona civil! Elimina ${boss.name} antes que o tempo se esgote.`,
                type: 'focus',
                shadowHint: boss.id,
                icon: 'skull-scan',
                color: C.neonRed,
                focusDuration: targetFocus,
                category: 'dungeon_break',
              }
              handleMissionSelect(mission)
            }}
          >
            <Icon name="skull-scan" size={24} color={C.neonRed} />
            <Text style={s.dungeonBreakTxt}>Portal Dinamico ativo</Text>
            <Text style={s.dungeonBreakSub}>Portal aleatório ativo. Entra antes que a janela feche.</Text>
          </TouchableOpacity>
        )}


        {/* ── SECTION: MISSÕES DIÁRIAS ── */}
        <View style={s.sectionHeaderRow}>
          <View style={[s.sectionDivider, { marginBottom: 0, flex: 1 }]}>
            <View style={s.sectionLine} />
            <Text style={s.sectionLabel}>MISSÕES DIÁRIAS</Text>
            <View style={s.sectionLine} />
          </View>
        </View>

        {/* XP Boost active indicator */}
        {xpBoostNext && (
          <View style={s.boostBanner}>
            <Icon name="timer-sand-complete" size={12} color={C.gold} />
            <Text style={s.boostTxt}> AMPULHETA ATIVA — próxima missão com XP x2</Text>
          </View>
        )}

        {hasPenalty && (
          <View style={s.penalSection}>
            <View style={s.penalHeader}>
              <Icon name="alert-circle" size={12} color={C.neonRed} />
              <Text style={s.penalTitle}>Penalizacoes ativas</Text>
            </View>
            {penaltyQ.map(q => <QuestCard key={q.id} quest={q} C={C} />)}
          </View>
        )}

        <View style={isRestDay ? { opacity: 0.45 } : undefined}>
          {quests.map(q => <QuestCard key={q.id} quest={q} C={C} />)}
        </View>
          </>
        )}


        {allDailyDone && (
          <>
            <TouchableOpacity style={s.collapsibleHeader} onPress={() => toggleSection('extras')} activeOpacity={0.8}>
              <Text style={s.collapsibleTitle}>EXTRAS</Text>
              <Icon name={sectionsOpen.extras ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
            </TouchableOpacity>
            {sectionsOpen.extras && (
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

            {extraQuests.map(q => <QuestCard key={q.id} quest={q} isExtra C={C} />)}

            {extraQuests.length < getDailyMissionTarget(playerLevel, missionDifficulty) && (
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
                <Text style={s.generateExtraSub}> ({Math.max(0, 3 - extraQuests.length)} restante{3 - extraQuests.length === 1 ? '' : 's'} hoje)</Text>
              </TouchableOpacity>
            )}
              </>
            )}
          </>
        )}

        <TouchableOpacity style={s.collapsibleHeader} onPress={() => toggleSection('events')} activeOpacity={0.8}>
          <Text style={s.collapsibleTitle}>EVENTOS E BOSSES</Text>
          <Icon name={sectionsOpen.events ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
        </TouchableOpacity>
        {/* ── SECTION: MISSÕES DE BOSS ── */}
        {sectionsOpen.events && isBossDay && (
          <>
            <View style={[s.sectionDivider, { marginTop: SPACING.sm }]}>
              <View style={[s.sectionLine, { backgroundColor: C.neonRed + '44' }]} />
              <Text style={[s.sectionLabel, { color: C.neonRed }]}>MISSÕES DE BOSS</Text>
              <View style={[s.sectionLine, { backgroundColor: C.neonRed + '44' }]} />
            </View>

            {!bossDefeatedThisWeek ? (
              <TouchableOpacity style={[s.systemCard, s.cardWarning, s.bossBanner]} onPress={() => setShowDungeon(true)} activeOpacity={0.8}>
                <View style={s.bossBannerLeft}>
                  <Icon name="gate" size={20} color={C.neonRed} />
                  <View style={{ marginLeft: SPACING.sm }}>
                    <Text style={s.bossTitle}>Portal vermelho disponivel</Text>
                    <Text style={s.bossSub}>Boss Raid disponível — Entra na Masmorra</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={18} color={C.neonRed} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[s.systemCard, s.cardSuccess, s.bossDefeatedBanner]} onPress={() => setShowDungeon(true)} activeOpacity={0.8}>
                <Icon name="sword" size={14} color={C.green} />
                <Text style={s.bossDefeatedTxt}> MASMORRA LIMPA — Clica para ver detalhes</Text>
              </TouchableOpacity>
            )}

            {activeEventDef && (
              <TouchableOpacity
                style={[s.systemCard, s.cardWarning, s.bossBanner, { marginTop: SPACING.md, borderColor: C.gold + '88', backgroundColor: C.gold + '08' }]}
                onPress={() => setShowEventDungeon(true)}
                activeOpacity={0.8}
              >
                <View style={s.bossBannerLeft}>
                  <Icon name="calendar-star" size={20} color={C.gold} />
                  <View style={{ marginLeft: SPACING.sm }}>
                    <Text style={[s.bossTitle, { color: C.gold }]}>Masmorra de evento disponivel</Text>
                    <Text style={s.bossSub}>Provas de {activeEventDef.event.name} disponíveis</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={18} color={C.gold} />
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

      {/* Weekly Dungeon selection modal */}
      <WeeklyDungeonModal
        visible={showDungeon}
        onClose={() => setShowDungeon(false)}
        onRequestClose={() => setShowDungeon(false)}
        onSelectMission={(m) => {
          const key = getKeyByBossId(m.shadowHint)
          if (key && weeklyDefeatedBossId !== m.shadowHint) {
            setKeyConfirm({ type: 'weekly', mission: m, key })
          } else {
            setShowDungeon(false)
            handleMissionSelect(m)
          }
        }}
        customMissions={customBossMissions}
        defeatedId={weeklyDefeatedBossId ?? undefined}
        playerKeys={playerDungeonKeys}
        C={C}
      />


      {/* Event Dungeon selection modal */}
      <EventDungeonModal
        visible={showEventDungeon}
        onClose={() => setShowEventDungeon(false)}
        onRequestClose={() => setShowEventDungeon(false)}
        onSelectMission={handleMissionSelect}
        eventTrials={eventTrials}
        eventBossMission={eventBossMission}
        eventProgress={activeEventDef ? { completedIds: eventCompleted, required: eventRequired, defeated: eventBossDefeated && eventBossKey === activeEventKey } : null}
        C={C}
      />


      {/* Boss focus timer */}
      {activeBossQuest && activeMission?.type === 'focus' && (
        <MissionActiveScreen
          quest={activeBossQuest}
          onClose={() => setActiveMission(null)}
          onComplete={() => {
            const mins = Math.max(1, Math.round((activeMission.focusDuration ?? 90 * 60_000) / 60_000))
            completeBossMission(activeMission, mins)
          }}
          targetSeconds={activeMission.focusDuration ? activeMission.focusDuration / 1000 : 90 * 60}
          C={C}
        />

      )}

      {/* Boss GPS tracker */}
      {activeBossQuest && activeMission?.type === 'gps' && (
        <GPSTrackerModal
          quest={activeBossQuest}
          onClose={() => setActiveMission(null)}
          onComplete={() => completeBossMission(activeMission)}
          C={C}
        />

      )}

      {/* Boss training confirm */}
      {activeMission?.type === 'training' && (
        <CustomModal
          visible={confirmBossTraining}
          title={`BOSS RAID — ${activeMission?.label?.toUpperCase() || 'CERBERUS'}`}
          message={`Confirmas que completaste:\n\n"${activeMission?.detail || ''}"`}
          confirmLabel="BOSS DERROTADO"
          confirmIcon="sword"
          confirmColor={activeMission?.isEventTrial ? C.gold : C.neonRed}
          onConfirm={() => { setConfirmBossTraining(false); completeBossMission(activeMission) }}
          onCancel={() => { setConfirmBossTraining(false); setActiveMission(null) }}
          C={C}
        />
      )}

      {eventProgressInfo && (
        <CustomModal
          visible={!!eventProgressInfo}
          title={eventProgressInfo.name}
          message={`Evento ${eventProgressInfo.name} — ${eventProgressInfo.completed}/${eventProgressInfo.required} provas concluídas.`}
          confirmLabel="OK"
          confirmIcon="check"
          confirmColor={C.neonBlue}
          onConfirm={() => setEventProgressInfo(null)}
          onCancel={() => setEventProgressInfo(null)}
          C={C}
        />
      )}

      {/* Victory modal */}
      {victoryInfo && (
        <BossVictoryModal
          visible={!!victoryInfo}
          info={victoryInfo}
          onClose={() => setVictoryInfo(null)}
          onRequestClose={() => setVictoryInfo(null)}
          C={C}
        />
      )}

      {keyConfirm && (
        <CustomModal
          visible={!!keyConfirm}
          title={keyConfirm.type === 'weekly' ? 'ABRIR PORTÃO' : 'USAR CHAVE'}
          message={`Desejas usar a ${keyConfirm.key.name} para entrar na Masmorra?\nA chave será consumida.`}
          confirmLabel="ENTRAR"
          confirmIcon="key-variant"
          confirmColor={keyConfirm.key.color || C.neonBlue}
          onConfirm={() => {
            if (enterDungeon(keyConfirm.key.id)) {
              if (keyConfirm.type === 'weekly') setShowDungeon(false)
              handleMissionSelect(keyConfirm.mission)
            }
            setKeyConfirm(null)
          }}
          cancelLabel="CANCELAR"
          onCancel={() => setKeyConfirm(null)}
          C={C}
        />
      )}

      <ShadowExtractionModal
        visible={!!extractionBossId}
        shadowId={extractionBossId ?? ''}
        category={extractionCategory}
        onClose={handleExtractionClose}
        C={C}
      />

      {showForge && <QuestForgeScreen onClose={() => setShowForge(false)} />}
    </View>
  )
}





// ── Styles ─────────────────────────────────────────────────────────────────────

