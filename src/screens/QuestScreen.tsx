import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore, { Quest, getDailyMissionTarget } from '../store/useGameStore';
import { RAID_BOSSES, DungeonMission, getActiveEventBossMissions, buildEventTrials, EVENT_BOSS_DEFS } from '../data/bosses';
import QuestForgeScreen from './QuestForgeScreen';
import MissionActiveScreen from './MissionActiveScreen';
import CustomModal from '../components/CustomModal';
import GPSTrackerModal from '../components/GPSTrackerModal';
import QuestCard from '../components/QuestCard';
import EventDungeonModal from '../components/EventDungeonModal';
import ShadowExtractionModal from '../components/ShadowExtractionModal';
import SideQuestSection from '../components/SideQuestSection';
import { useTheme, FONT, SPACING } from '../theme';
import { ALL_DUNGEON_KEYS } from '../data/dungeonKeys';

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
  penalHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
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
});





// Normals moved to dictionary


function formatCountdown(ms: number): string {
  if (ms <= 0) {return 'Termina em 0m';}
  const totalMinutes = Math.floor(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) {return `Termina em ${h}h ${m}m`;}
  return `Termina em ${m}m`;
}

function getEventCountdownMs(endDate: string): number {
  const now = new Date();
  const [month, day] = endDate.split('-').map(n => parseInt(n, 10));
  const year = now.getFullYear();
  let eventEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
  // If already passed this year, the event wraps into next year (e.g. Jan event visible in Dec)
  if (eventEnd.getTime() < now.getTime()) {
    eventEnd = new Date(year + 1, month - 1, day, 23, 59, 59, 999);
  }
  return Math.max(0, eventEnd.getTime() - now.getTime());
}



// ── Screen ─────────────────────────────────────────────────────────────────────

export default function QuestScreen() {
  const C = useTheme();
  const s = getStyles(C);

  const quests = useGameStore(st => st.quests);
  const hasPenalty = useGameStore(st => st.system.hasPenalty);
  const penaltyQ = useGameStore(st => st.system.penaltyQuests);
  const xpBoostNext = useGameStore(st => st.system.xpBoostNext);
  const defeatBoss = useGameStore(st => st.defeatDungeonBoss);
  const recordFocus = useGameStore(st => st.recordFocusTime);
  const triggerEvent = useGameStore(st => st.triggerEvent);
  const questDictionary = useGameStore(st => st.questDictionary);
  const updateSettings = useGameStore(st => st.updateSettings);
  const activeRaidBoss = useGameStore(st => st.system.activeRaidBoss);
  const eventBossKey = useGameStore(st => st.system.eventBossKey);
  const eventBossCompletedIds = useGameStore(st => st.system.eventBossCompletedIds);
  const eventBossDefeated = useGameStore(st => st.system.eventBossDefeated);
  const setEventBossState = useGameStore(st => st.setEventBossState);
  const completeEventTrial = useGameStore(st => st.completeEventTrial);
  const markEventBossDefeated = useGameStore(st => st.markEventBossDefeated);
  const setMissionModalOpen = useGameStore(st => st.setMissionModalOpen);
  const pendingRaidId = useGameStore(st => st.system.pendingRaidExtractionId);
  const clearRaid     = useGameStore(st => st.clearPendingRaidExtraction);
  const pendingKeyId  = useGameStore(st => st.system.pendingKeyId);
  const clearPendingKeyMission = useGameStore(st => st.clearPendingKeyMission);
  const clearActiveDungeonBreak = useGameStore(st => st.clearActiveDungeonBreak);
  const system = useGameStore(st => st.system);
  const enterDungeon = useGameStore(st => st.enterDungeon);
  // Trigger extraction for Raid bosses (which are defeated globally via store)
  useEffect(() => {
    if (pendingRaidId) {
      setExtractionBossId(pendingRaidId);
      setExtractionCategory('raid');
      clearRaid();
    }
  }, [pendingRaidId, clearRaid]);

  // Pick up key mission triggered from Inventory → Cofre de Chaves
  // User already confirmed in DungeonKeyModal — skip the redundant CustomModal
  useEffect(() => {
    if (!pendingKeyId) {return;}
    const key = ALL_DUNGEON_KEYS.find(k => k.id === pendingKeyId);
    clearPendingKeyMission();
    if (!key) {return;}
    const mission: DungeonMission = {
      id: `key_${key.id}`,
      label: key.name,
      detail: key.missionDetail,
      type: key.missionType,
      shadowHint: key.bossId,
      icon: 'key-variant',
      color: key.color,
      category: 'key',
      focusDuration: key.missionType === 'focus' ? key.missionTarget : undefined,
      gpsTarget: key.missionType === 'gps' ? key.missionTarget : undefined,
    };
    if (enterDungeon(key.id)) {
      handleMissionSelect(mission);
    }
  }, [pendingKeyId, clearPendingKeyMission, enterDungeon]);

  const eventBossMissions = React.useMemo(() => getActiveEventBossMissions(), []);
  const activeEventDef = React.useMemo(() =>
    EVENT_BOSS_DEFS.find(def => eventBossMissions.some(m => m.id === def.id)),
    [eventBossMissions]);

  const eventTrials = React.useMemo(() =>
    activeEventDef ? buildEventTrials(activeEventDef, C) : [],
    [activeEventDef, C]);


  const activeEventKey = React.useMemo(() =>
    activeEventDef ? `${activeEventDef.id}-${new Date().getFullYear()}` : '',
    [activeEventDef]);

  const eventCompleted = (activeEventKey && eventBossKey === activeEventKey) ? eventBossCompletedIds : [];
  const eventRequired = activeEventDef?.required ?? 0;
  const eventUnlocked = activeEventDef ? eventCompleted.length >= eventRequired : false;
  const eventBossMission = (activeEventDef && eventUnlocked)
    ? eventBossMissions.find(m => m.id === activeEventDef.id) ?? null
    : null;

  const extraQuests = useGameStore(st => st.extraQuests);
  const generateExtraQuests = useGameStore(st => st.generateExtraQuests);
  const playerLevel = useGameStore(st => st.player.level);
  const missionDifficulty = useGameStore(st => st.settings.missionDifficulty);
  const customDailyMissions = useGameStore(st => st.settings.customDailyMissions);

  const done = quests.filter(q => q.done).length;
  const total = quests.length;
  const allDailyDone = quests.every(q => q.done || q.type === 'limit' || q.type === 'forbidden') && total > 0;

  const isRestDay = useGameStore(st => st.settings.restDay);

  const [showEventDungeon, setShowEventDungeon] = useState(false);
  const [showForge, setShowForge] = useState(false);
  const [activeMission, setActiveMission] = useState<DungeonMission | null>(null);

  const [portalConfirm, setPortalConfirm] = useState<DungeonMission | null>(null);
  const [acceptedPortal, setAcceptedPortal] = useState<DungeonMission | null>(null);
  const [eventProgressInfo, setEventProgressInfo] = useState<{ name: string; completed: number; required: number } | null>(null);
  const [extractionBossId, setExtractionBossId] = useState<string | null>(null);
  const [extractionCategory, setExtractionCategory] = useState<'dungeon' | 'dungeon_break' | 'event' | 'key' | 'raid'>('dungeon');
  const [keyConfirm, setKeyConfirm] = useState<{ type: 'normal' | 'weekly', mission: DungeonMission, key: any } | null>(null);
  const [eventCountdownMs, setEventCountdownMs] = useState(0);
  const [portalCountdownMs, setPortalCountdownMs] = useState(0);
  const [sectionsOpen, setSectionsOpen] = useState({
    now: true,
    today: true,
    events: true,
    extras: true,
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const sectionPositions = useRef<Record<string, number>>({});

  const scrollToSection = (sectionKey: string) => {
    // Open the section first
    setSectionsOpen(prev => ({ ...prev, [sectionKey]: true }));

    // Scroll to the section after a short delay to allow re-render
    setTimeout(() => {
      const yOffset = sectionPositions.current[sectionKey] ?? 0;
      scrollViewRef.current?.scrollTo({ y: Math.max(0, yOffset - 100), animated: true });
    }, 100);
  };

  const toggleSection = (key: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNowPanelQuest = () => {
    // Click handler for "Missão em foco" - could scroll to HOJE section
    scrollToSection('today');
  };

  const handleNowPanelDungeonBreak = () => {
    // Dynamic portal alert is now shown directly above, no need to scroll
  };

  const handleNowPanelEvent = () => {
    // Click handler for event alert
    scrollToSection('events');
  };

  const activeDailyQuest = quests.find(q => !q.done && q.type !== 'limit' && q.type !== 'forbidden');

  useEffect(() => {
    if (!activeEventDef || !activeEventKey) {return;}
    // Only reset/initialize if the key actually changed
    if (eventBossKey !== activeEventKey) {
      setEventBossState(activeEventKey, activeEventDef.required, eventTrials.length);
    }
  }, [activeEventDef, activeEventKey, eventTrials.length, eventBossKey, setEventBossState]);

  // Update portal countdown timer every second
  useEffect(() => {
    const expiresAt = system.activeDungeonBreak?.expiresAt ?? 0;
    if (!expiresAt) {
      setPortalCountdownMs(0);
      return;
    }
    const update = () => setPortalCountdownMs(Math.max(0, expiresAt - Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [system.activeDungeonBreak?.expiresAt]);

  // Update event countdown timer every second
  useEffect(() => {
    if (!activeEventDef) {
      setEventCountdownMs(0);
      return;
    }

    const updateCountdown = () => {
      const ms = getEventCountdownMs(activeEventDef.event.end);
      setEventCountdownMs(ms);
    };

    // Update immediately
    updateCountdown();

    // Then update every second
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeEventDef]);

  useEffect(() => {
    const onBackPress = () => {
      if (activeMission) {
        setActiveMission(null);
        return true;
      }
      if (showEventDungeon) {
        setShowEventDungeon(false);
        return true;
      }
      if (showForge) {
        setShowForge(false);
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [activeMission, showEventDungeon, showForge]);

  function handleMissionSelect(m: DungeonMission) {
    if (m.type === 'focus' || m.type === 'gps' || m.type === 'training') {
      setMissionModalOpen(true);
    }
    setActiveMission(m);
  }

  const handleExtractionClose = (_success: boolean) => {
    // Raid-only extraction close: boss was already defeated by the store
    setExtractionBossId(null);
  };
  function completeBossMission(m: DungeonMission, focusMinutes?: number) {
    setActiveMission(null);
    // Clear accepted portal when mission is completed successfully
    setAcceptedPortal(null);
    // If this was a portal/dungeon-break mission, clear it from the store so it doesn't re-appear
    if (m.category === 'dungeon' || m.category === 'dungeon_break') {
      clearActiveDungeonBreak();
    }

    // Event trials just progress the event, no extraction, no time recording (they're practice)
    if (m.isEventTrial && m.eventKey) {
      const res = completeEventTrial(m.id, m.eventKey, eventRequired, eventTrials.length);
      setEventProgressInfo({ name: m.eventName ?? 'EVENTO', completed: res.completed, required: res.required });
      return;
    }

    // Only real boss missions (not trials) record focus time
    if (focusMinutes) {recordFocus(focusMinutes);}

    // Defeat boss — pushes boss_defeated + shadow to global rewardsQueue (no local modal needed)
    defeatBoss(m.shadowHint, m.customShadow, m.label);

    // Fire event triggers
    const missionId = m.id.startsWith('custom_boss_') ? m.id.slice('custom_boss_'.length) : m.id;
    if (m.id === 'boss_gps' || (m.id.startsWith('custom_boss_') && m.type === 'gps') || (m.isEventBoss && m.type === 'gps') || (m.id.startsWith('normal_dungeon_') && m.type === 'gps'))
      {triggerEvent('boss_gps_completed', { missionId });}
    if (m.id === 'boss_focus' || (m.id.startsWith('custom_boss_') && m.type === 'focus') || (m.isEventBoss && m.type === 'focus') || (m.id.startsWith('normal_dungeon_') && m.type === 'focus'))
      {triggerEvent('boss_focus_completed', { missionId });}
    if (m.id === 'boss_training' || (m.id.startsWith('custom_boss_') && m.type === 'training') || (m.isEventBoss && m.type === 'training') || (m.id.startsWith('normal_dungeon_') && m.type === 'training'))
      {triggerEvent('boss_training_completed', { missionId });}
    if (m.isEventBoss && m.eventKey) {markEventBossDefeated(m.eventKey);}
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
  } : null;

  return (
    <View style={s.safeArea}>
      <ScrollView ref={scrollViewRef} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── GLOBAL RAID BOSS ── */}
        {activeRaidBoss && (() => {
          const def = RAID_BOSSES.find(b => b.id === activeRaidBoss.defId);
          if (!def) {return null;}
          const progress = activeRaidBoss.currentHp / activeRaidBoss.maxHp;
          const timeLeftMs = activeRaidBoss.endDate - Date.now();

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
          );
        })()}

        <TouchableOpacity style={s.collapsibleHeader} onPress={() => toggleSection('now')} activeOpacity={0.8} onLayout={(e) => { sectionPositions.current.now = e.nativeEvent.layout.y; }}>
          <Text style={s.collapsibleTitle}>AGORA</Text>
          <Icon name={sectionsOpen.now ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
        </TouchableOpacity>
        {sectionsOpen.now && (
          <View style={s.nowPanel}>
            <Text style={s.nowHeader}>PAINEL RÁPIDO</Text>
            <TouchableOpacity style={s.nowRow} onPress={handleNowPanelQuest} activeOpacity={0.7}>
              <Icon name="clipboard-play-outline" size={14} color={C.neonBlue} />
              <Text style={s.nowTxt}>{activeDailyQuest ? `Missão em foco: ${activeDailyQuest.label}` : 'Nenhuma missão ativa agora.'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.nowRow} onPress={handleNowPanelDungeonBreak} activeOpacity={0.7}>
              <Icon name="gate" size={14} color={C.neonRed} />
              <Text style={s.nowTxt}>
                {system.activeDungeonBreak ? `Portal dinâmico ativo - ${formatCountdown(portalCountdownMs)}` : 'Nenhum portal dinâmico ativo.'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.nowRow} onPress={handleNowPanelEvent} activeOpacity={0.7}>
              <Icon name="calendar-star" size={14} color={C.gold} />
              <Text style={s.nowTxt}>
                {activeEventDef ? `Evento ${activeEventDef.event.name} disponível (${eventCompleted.length}/${eventRequired})` : 'Nenhum evento ativo neste momento.'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.collapsibleHeader} onPress={() => toggleSection('today')} activeOpacity={0.8} onLayout={(e) => { sectionPositions.current.today = e.nativeEvent.layout.y; }}>
          <Text style={s.collapsibleTitle}>HOJE</Text>
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
            style={s.actionBtn}
            onPress={() => updateSettings({ restDay: !isRestDay })}
            activeOpacity={0.75}
          >
            <Icon name="bed" size={13} color={isRestDay ? C.neonBlue : C.muted} />
            <View>
              <Text style={[s.actionBtnTxt, { color: isRestDay ? C.neonBlue : C.muted }]}>
                {isRestDay ? ' REPOUSO ATIVO' : ' REPOUSO'}
              </Text>
              <Text style={s.actionBtnSub}>
                {isRestDay ? '  Ativo — sem penalidades' : '  Pausa sem penalidades'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

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
          <View style={s.statusBarBossRow}>
              <Icon name="gate" size={9} color={(system.portalDailyCount ?? 0) > 0 ? C.neonBlue : C.dimmed} />
              <Text style={[s.statusBarBossLabel, { color: C.dimmed }]}>
                {' '}PORTAIS HOJE: {system.portalDailyCount ?? 0}/3
              </Text>
            </View>
        </View>

        {/* Accepted Portal Card - Persists as active Boss Card until mission completes */}
        {acceptedPortal && (
          <TouchableOpacity
            style={[s.systemCard, s.cardWarning, s.dungeonBreakBanner, { borderWidth: 2, borderColor: acceptedPortal.color || C.neonRed, opacity: activeMission ? 0.85 : 1 }]}
            onPress={() => { if (!activeMission) {handleMissionSelect(acceptedPortal);} }}
            disabled={!!activeMission}
          >
            <Icon name={activeMission ? 'sword-cross' : (acceptedPortal.icon || 'gate')} size={24} color={acceptedPortal.color || C.neonRed} />
            <Text style={s.dungeonBreakTxt}>{acceptedPortal.label?.toUpperCase()}</Text>
            <Text style={s.dungeonBreakSub}>
              {activeMission ? '⚔ EM PROGRESSO — Conclui a missão para fechar o portal.' : (acceptedPortal.detail || 'Pressiona para abrir a missão.')}
            </Text>
          </TouchableOpacity>
        )}

        {/* Dungeon Break Alert */}
        {!acceptedPortal && system.activeDungeonBreak &&
          Date.now() >= (system.activeDungeonBreak.startsAt ?? 0) &&
          Date.now() < system.activeDungeonBreak.expiresAt && (() => {
            const db = system.activeDungeonBreak!;
            const isQuest = db.source === 'quest';
            const qDef = isQuest ? questDictionary.find(d => d.id === db.bossId) : undefined;
            const rBoss = !isQuest ? RAID_BOSSES.find(b => b.id === db.bossId) : undefined;
            const displayIcon = qDef
              ? (qDef.questType === 'focus' ? 'timer-sand' : qDef.questType === 'gps' ? 'run-fast' : 'arm-flex')
              : 'skull-scan';
            const displayColor = qDef
              ? (qDef.questType === 'focus' ? C.purple : qDef.questType === 'gps' ? C.green : C.neonRed)
              : (rBoss?.color ?? C.neonRed);
            const displayLore = qDef
              ? qDef.description.replace(/{target}/g, String(qDef.baseTarget)).replace(/{unit}/g, qDef.unit)
              : rBoss
                ? `Rank ${rBoss.rank} — Elimina ${rBoss.name} antes que o portal colapse.`
                : 'Um portal dinâmico abriu-se. Entra antes que a janela feche.';
            return (
              <TouchableOpacity
                style={[s.systemCard, s.cardWarning, s.dungeonBreakBanner, { borderWidth: 2, borderColor: displayColor }]}
                onPress={() => {
                  if (!db) {return;}
                  if (db.source === 'quest') {
                    if (!qDef) {return;}
                    const mission: DungeonMission = {
                      id: `portal_${qDef.id}`,
                      label: `Portal Dinâmico: ${qDef.title}`,
                      detail: qDef.description.replace(/{target}/g, String(qDef.baseTarget)).replace(/{unit}/g, qDef.unit),
                      type: qDef.questType,
                      shadowHint: qDef.id,
                      icon: displayIcon,
                      color: displayColor,
                      category: 'dungeon',
                    };
                    setPortalConfirm(mission);
                    return;
                  }
                  if (!rBoss) {return;}
                  const remainingMs = Math.max(0, db.expiresAt - Date.now());
                  const targetFocus = Math.max(10 * 60_000, Math.min(25 * 60_000, Math.floor(remainingMs * 0.5)));
                  const mission: DungeonMission = {
                    id: `break_${rBoss.id}`,
                    label: `Dungeon Break: ${rBoss.name}`,
                    detail: displayLore,
                    type: 'focus',
                    shadowHint: rBoss.id,
                    icon: 'skull-scan',
                    color: rBoss.color,
                    focusDuration: targetFocus,
                    category: 'dungeon_break',
                  };
                  setPortalConfirm(mission);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="alert-octagram" size={22} color={displayColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.dungeonBreakTxt, { color: displayColor }]} numberOfLines={1}>
                      PORTAL DINÂMICO DETECTADO
                    </Text>
                    <Text style={s.dungeonBreakSub} numberOfLines={2}>Anomalia dimensional activa. Toca para investigar.</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                  <Icon name="timer-alert-outline" size={10} color={displayColor + 'cc'} />
                  <Text style={[s.dungeonBreakSub, { color: displayColor }]}>
                    {formatCountdown(portalCountdownMs)} RESTANTES — TOCA PARA ENTRAR
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })()
        }


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
              <Text style={[s.penalTitle, { flex: 1 }]}>Penalizações ativas</Text>
            </View>
            {penaltyQ.map(q => <QuestCard key={q.id} quest={q} isPenalty C={C} />)}
          </View>
        )}

        <View style={isRestDay ? { opacity: 0.7 } : undefined}>
          {quests.length === 0 && !isRestDay ? (
            <View style={{
              alignItems: 'center', paddingVertical: 40,
              borderWidth: 1, borderColor: C.border, borderRadius: 8,
              backgroundColor: C.panel, marginBottom: SPACING.md,
            }}>
              <Icon name="clock-outline" size={40} color={C.dimmed} style={{ marginBottom: SPACING.md }} />
              <Text style={{ color: C.muted, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2, marginBottom: SPACING.sm }}>
                MISSÕES NÃO GERADAS
              </Text>
              <Text style={{ color: C.dimmed, fontSize: 12, textAlign: 'center', paddingHorizontal: SPACING.lg }}>
                O Sistema irá gerar as tuas missões ao iniciar o próximo dia.
              </Text>
            </View>
          ) : (
            quests.map(q => <QuestCard key={q.id} quest={q} C={C} />)
          )}
        </View>

        {/* ── SECTION: MISSÕES SECUNDÁRIAS ── */}
        <SideQuestSection C={C} />
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

            {extraQuests.length < Math.min(3, getDailyMissionTarget(playerLevel, missionDifficulty, customDailyMissions)) && (
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

        <TouchableOpacity style={s.collapsibleHeader} onPress={() => toggleSection('events')} activeOpacity={0.8} onLayout={(e) => { sectionPositions.current.events = e.nativeEvent.layout.y; }}>
          <Text style={s.collapsibleTitle}>MASMORRAS</Text>
          <Icon name={sectionsOpen.events ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
        </TouchableOpacity>
        {sectionsOpen.events && (
          <>
            {/* Event Dungeon */}
            {activeEventDef && eventCountdownMs > 0 && (
              <TouchableOpacity
                style={[s.systemCard, s.cardWarning, s.bossBanner, { marginTop: SPACING.sm, borderColor: C.gold + '88', backgroundColor: C.gold + '08' }]}
                onPress={() => setShowEventDungeon(true)}
                activeOpacity={0.8}
              >
                <View style={s.bossBannerLeft}>
                  <Icon name="calendar-star" size={20} color={C.gold} />
                  <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                    <Text style={[s.bossTitle, { color: C.gold }]}>Masmorra de evento disponível</Text>
                    <Text style={s.bossSub}>Evento: {activeEventDef.event.name} · Provas: {eventCompleted.length}/{eventRequired}</Text>
                    <Text style={[s.bossSub, { fontSize: 10, marginTop: 2, color: C.gold }]}>
                      {eventCountdownMs > 0 ? formatCountdown(eventCountdownMs) : 'Evento terminado'}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={18} color={C.gold} />
              </TouchableOpacity>
            )}
          </>
        )}





      </ScrollView>



      {/* Event Dungeon selection modal */}
      <EventDungeonModal
        visible={showEventDungeon}
        onClose={() => setShowEventDungeon(false)}
        onRequestClose={() => setShowEventDungeon(false)}
        onSelectMission={handleMissionSelect}
        eventTrials={eventTrials}
        eventBossMission={eventBossMission}
        eventProgress={activeEventDef ? { completedIds: eventCompleted, required: eventRequired, defeated: eventBossDefeated && eventBossKey === activeEventKey } : null}
        eventWindow={activeEventDef?.event ?? null}
        C={C}
      />


      {/* Boss focus timer */}
      {activeBossQuest && activeMission?.type === 'focus' && (
        <MissionActiveScreen
          quest={activeBossQuest}
          onClose={() => { setMissionModalOpen(false); setActiveMission(null); }}
          onComplete={() => {
            setMissionModalOpen(false);
            const mins = Math.max(1, Math.round((activeMission.focusDuration ?? 90 * 60_000) / 60_000));
            completeBossMission(activeMission, mins);
          }}
          targetSeconds={activeMission.focusDuration ? activeMission.focusDuration / 1000 : 90 * 60}
          C={C}
        />

      )}

      {/* Boss GPS tracker */}
      {activeBossQuest && activeMission?.type === 'gps' && (
        <GPSTrackerModal
          quest={activeBossQuest}
          onClose={() => { setMissionModalOpen(false); setActiveMission(null); }}
          onComplete={() => { setMissionModalOpen(false); completeBossMission(activeMission); }}
          C={C}
        />

      )}

      {/* Boss training — full timer + notes screen (consistent with focus missions) */}
      {activeBossQuest && activeMission?.type === 'training' && (
        <MissionActiveScreen
          quest={activeBossQuest}
          onClose={() => { setMissionModalOpen(false); setActiveMission(null); }}
          onComplete={() => { setMissionModalOpen(false); completeBossMission(activeMission); }}
          C={C}
        />
      )}

      {/* Portal dinâmico - show details before entry */}
      {portalConfirm && (
        <CustomModal
          visible={!!portalConfirm}
          title={'PORTAL DINÂMICO'}
          message={`${portalConfirm.label ?? 'Portal detectado'}\nEntra para veres os detalhes e iniciares a missão.`}
          confirmLabel="ENTRAR"
          confirmIcon="play"
          confirmColor={portalConfirm.color || C.neonRed}
          onConfirm={() => {
            setAcceptedPortal(portalConfirm);
            setPortalConfirm(null);
          }}
          onCancel={() => { setPortalConfirm(null); }}
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
              handleMissionSelect(keyConfirm.mission);
            }
            setKeyConfirm(null);
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
  );
}





// ── Styles ─────────────────────────────────────────────────────────────────────
