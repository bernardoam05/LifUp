import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, BackHandler,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore, { Quest, getDailyMissionTarget } from '../store/useGameStore';
import { RAID_BOSSES, DungeonMission, getActiveEventBossMissions, buildEventTrials, EVENT_BOSS_DEFS } from '../data/bosses';
import QuestForgeScreen from './QuestForgeScreen';
import MissionActiveScreen from './MissionActiveScreen';
import CustomModal from '../components/CustomModal';
import GPSTrackerModal from '../components/GPSTrackerModal';
import QuestCard from '../components/QuestCard';
import EventDungeonModal from '../components/EventDungeonModal';
import DailyBossDungeonModal from '../components/DailyBossDungeonModal';
import ShadowExtractionModal from '../components/ShadowExtractionModal';
import SideQuestSection from '../components/SideQuestSection';
import { useTheme, FONT, SPACING } from '../theme';
import { ALL_DUNGEON_KEYS } from '../data/dungeonKeys';
import { useRewardedAd, AD_UNIT_STREAK, AD_UNIT_PENALTY, AD_UNIT_XP_BOOST, AD_UNIT_BOSS_HP } from '../hooks/useRewardedAd';
import { computeActivePassives } from '../store/helpers'; // used for shadow streak_protect check

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
  adRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f59e0b55', borderRadius: 4, paddingVertical: 8, marginBottom: SPACING.sm, backgroundColor: '#f59e0b10' },
  adRowTxt: { color: '#f59e0b', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1, marginLeft: 6 },
  adShieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#22d3ee55', borderRadius: 4, paddingVertical: 8, marginTop: 6, marginBottom: 2, backgroundColor: '#22d3ee10' },
  adShieldTxt: { color: '#22d3ee', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1, marginLeft: 6 },
  adShieldActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#22d3ee15', borderWidth: 1, borderColor: '#22d3ee55', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  adShieldActiveTxt: { color: '#22d3ee', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },

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

// Creative task descriptions for raid boss dungeon breaks — varied by boss id / rank
const RAID_BREAK_TASKS: Record<string, string[]> = {
  B: [
    'Realiza 40 flexões + 40 agachamentos no menor tempo possível.',
    'Medita em silêncio por {min} min. Elimina o ruído interior antes que o portal se expanda.',
    'Salta à corda ou faz jumping jacks durante {min} min seguidos. Ritmo constante.',
    'Escreve 3 objetivos desta semana com detalhe e prazo concreto.',
    'Corre em passo acelerado durante {min} min sem parar. O portal fecha-se ao teu ritmo.',
    'Faz 50 squats + 50 abdominais. O corpo é a tua primeira arma.',
    'Bebe 1,5L de água e lê 10 páginas de um livro não-ficção.',
    '3 séries de prancha até ao limite. Regista os tempos de cada série.',
    'Vai à janela/exterior durante {min} min: caminha ou faz respirações profundas.',
    'Escreve um diário de 10 min sobre o que te está a impedir de avançar.',
    'Completa uma tarefa pequena que adiaste há mais de 3 dias.',
    'Faz 30 burpees + 30 mountain climbers. Portal de baixo rank — ainda assim exige sangue.',
  ],
  A: [
    'Foco absoluto em trabalho ou estudo durante {min} min. Sem notificações, sem pausas.',
    '60 burpees + 60 agachamentos consecutivos. Paga o tributo ao portal com suor.',
    'Lê {min} páginas de um livro de desenvolvimento pessoal ou técnico. Sem distrações.',
    'Sessão de treino de força: 4 séries de push-ups até falha + 4 séries de squats.',
    'Escreve um plano detalhado para o teu maior desafio atual. Inclui próximos 3 passos.',
    'Shadowboxing ou sombra de luta durante {min} min. Intensidade máxima nos últimos 3 min.',
    'Estuda ou pratica uma skill técnica específica por {min} min. Documenta o que aprendeste.',
    'Corre ao ritmo que conseguires durante {min} min. Não pares. O portal não espera.',
    'Prepara e come uma refeição saudável do zero. Sem fast food ou processados.',
    'Resolve um problema concreto que estás a adiar. Escreve a solução em 3 passos.',
    'Faz {min} min de alongamentos dinâmicos avançados. Mobilidade é poder.',
    'Aprende algo novo durante {min} min: tutorial, curso ou artigo técnico. Tira notas.',
    'Organiza o teu espaço de trabalho e planeia as próximas 24h com detalhe.',
    'Faz tabata: 8 rounds de 20s esforço máximo + 10s repouso (burpees ou sprints).',
  ],
  S: [
    'Modo Foco ativo durante {min} min. Define um entregável concreto antes de começar.',
    'Corre {min} min em ritmo constante ao ar livre. Sem música — só tu e o silêncio.',
    '100 repetições à escolha: burpees, flexões ou agachamentos. Regista o tempo total.',
    'Estuda algo difícil durante {min} min: matemática, código, filosofia ou ciência.',
    'Escreve e revê um plano de ação para o próximo mês. Mínimo 5 ações concretas.',
    'Sessão de respiração Wim Hof: 3 rounds de 30 respirações + retenção + {min} min de meditação.',
    'Técnica Feynman: explica em voz alta (ou por escrito) um conceito complexo que dominas.',
    'Cria um protótipo funcional, esboço ou plano detalhado de um projeto teu em {min} min.',
    'Lê {min} páginas de um livro denso (filosofia, ciência ou estratégia). Toma notas.',
    'Treino de alta intensidade: 5 séries de (10 burpees + 15 push-ups + 20 squats). Sem pausa entre exercícios.',
    'Documenta 3 lições que aprendeste este mês e o que vais mudar por causa delas.',
    'Pratica uma habilidade criativa durante {min} min: escrita, código, desenho ou música.',
    'Resolve 3 desafios de lógica ou matemática. Cronometra cada um.',
    'Executa {min} min de trabalho profundo no teu projeto mais importante. Zero distrações.',
    'Faz uma corrida de {min} min em terreno variado ou com sprints intercalados.',
  ],
  National: [
    'O maior portal exige o maior sacrifício. Foco total por {min} min. Zero distrações absolutas.',
    'Treino épico: 60 push-ups + 100 squats + 40 burpees + prancha até ao limite. Executa tudo.',
    'Lê 40 páginas de um livro técnico ou de desenvolvimento pessoal. Escreve um resumo de meia página ao terminar.',
    'Corre o mais longe possível em {min} min. Regista a distância e bate o teu recorde.',
    'Define e documenta a tua visão de longo prazo em {min} min de escrita focada sem interrupções.',
    'Medita em silêncio absoluto por {min} min. Nenhum pensamento sem resolução — só presença.',
    'Estuda o tema mais difícil que tens em mãos durante {min} min. Técnica Pomodoro proibida — foco contínuo.',
    'Escreve o teu manifesto pessoal: valores, missão e o legado que queres deixar.',
    'Treino final: 20 min corrida + 50 push-ups + 80 squats + 30 burpees + 5 min prancha.',
    'Aprende algo novo do zero: 45 min de leitura ou tutorial + 45 min de prática. Toma notas ao longo.',
    'Identifica a tua maior fraqueza atual e escreve um plano de 30 dias para a eliminar — com ações diárias.',
    'Realiza {min} min de prática deliberada na tua skill principal. Sem atalhos, sem conteúdo passivo.',
    'Sessão de recuperação profunda: {min} min de yoga avançado ou alongamentos + 10 min de meditação.',
    'Lê 50 páginas de uma obra densa. Anota 5 insights e 2 mudanças concretas que vais fazer.',
    '{min} min de escrita de diário: objetivos da semana, o que falhaste, o que vais mudar e porquê.',
  ],
};

function getRaidBossBreakDetail(rank: string, minutes: number, bossId: string): string {
  const pool = RAID_BREAK_TASKS[rank] ?? RAID_BREAK_TASKS.A;
  // deterministic pick based on boss id to avoid changing on re-render
  let hash = 0;
  for (let i = 0; i < bossId.length; i++) {hash = (hash * 31 + bossId.charCodeAt(i)) >>> 0;}
  const template = pool[hash % pool.length];
  return template.replace(/{min}/g, String(minutes));
}

function formatCountdown(ms: number, t: (key: string, opts?: any) => string): string {
  if (ms <= 0) {return t('ui.timer_ends_in_0');}
  const totalMinutes = Math.floor(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const time = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return t('ui.timer_ends_in', { time });
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
  const { t } = useTranslation('quests');

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
  const weeklyDefeatedBossId = useGameStore(st => st.system.weeklyDefeatedBossId);
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
  const player = useGameStore(st => st.player);
  const customShadows = useGameStore(st => st.customShadows);
  const activeBuffs = useGameStore(st => st.activeBuffs ?? []);
  const claimAdStreakShield = useGameStore(st => st.claimAdStreakShield);
  const claimAdPenaltyReduction = useGameStore(st => st.claimAdPenaltyReduction);
  const claimAdXpBoost = useGameStore(st => st.claimAdXpBoost);
  const claimAdBossHp = useGameStore(st => st.claimAdBossHp);

  // Compute whether shadow streak_protect is still available (priority over ad)
  const { streakProtect } = React.useMemo(
    () => computeActivePassives(player.activeShadowIds, player.shadows, customShadows, activeBuffs),
    [player.activeShadowIds, player.shadows, customShadows, activeBuffs]
  );
  const usedShadowSkills = system.usedShadowSkills ?? {};
  const shadowCanProtect = streakProtect && (!usedShadowSkills.streak_protect || Date.now() - usedShadowSkills.streak_protect > 7 * 24 * 3600_000);
  const showStreakShieldAd = !shadowCanProtect && !system.adStreakShieldActive && !system.adStreakShieldUsedWeek && player.currentStreak > 0;

  const { loaded: adStreakLoaded, show: showStreakAd } = useRewardedAd(AD_UNIT_STREAK);
  const { loaded: adPenaltyLoaded, show: showPenaltyAd } = useRewardedAd(AD_UNIT_PENALTY);
  const { loaded: adXpLoaded, show: showXpAd } = useRewardedAd(AD_UNIT_XP_BOOST);
  const { loaded: adBossLoaded, show: showBossAd } = useRewardedAd(AD_UNIT_BOSS_HP);
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
  const [showWeeklyDungeon, setShowWeeklyDungeon] = useState(false);
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
      if (showWeeklyDungeon) {
        setShowWeeklyDungeon(false);
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
  }, [activeMission, showEventDungeon, showWeeklyDungeon, showForge]);

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


        <TouchableOpacity style={s.collapsibleHeader} onPress={() => toggleSection('now')} activeOpacity={0.8} onLayout={(e) => { sectionPositions.current.now = e.nativeEvent.layout.y; }}>
          <Text style={s.collapsibleTitle}>{t('ui.now')}</Text>
          <Icon name={sectionsOpen.now ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
        </TouchableOpacity>
        {sectionsOpen.now && (
          <View style={s.nowPanel}>
            <Text style={s.nowHeader}>{t('ui.quick_panel')}</Text>
            <TouchableOpacity style={s.nowRow} onPress={handleNowPanelQuest} activeOpacity={0.7}>
              <Icon name="clipboard-play-outline" size={14} color={C.neonBlue} />
              <Text style={s.nowTxt}>{activeDailyQuest ? t('ui.mission_in_focus', { label: activeDailyQuest.label }) : t('ui.no_active_mission')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.nowRow} onPress={handleNowPanelDungeonBreak} activeOpacity={0.7}>
              <Icon name="gate" size={14} color={C.neonRed} />
              <Text style={s.nowTxt}>
                {system.activeDungeonBreak ? t('ui.dynamic_portal_active', { countdown: formatCountdown(portalCountdownMs, t) }) : t('ui.no_dynamic_portal')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.nowRow} onPress={handleNowPanelEvent} activeOpacity={0.7}>
              <Icon name="calendar-star" size={14} color={C.gold} />
              <Text style={s.nowTxt}>
                {activeEventDef ? t('ui.event_available', { name: activeEventDef.event.name, completed: eventCompleted.length, required: eventRequired }) : t('ui.no_active_event')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.collapsibleHeader} onPress={() => toggleSection('today')} activeOpacity={0.8} onLayout={(e) => { sectionPositions.current.today = e.nativeEvent.layout.y; }}>
          <Text style={s.collapsibleTitle}>{t('ui.today')}</Text>
          <Icon name={sectionsOpen.today ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
        </TouchableOpacity>
        {sectionsOpen.today && (
          <>
        {/* Compact tactical action row */}
        <View style={s.actionRow}>
          <TouchableOpacity style={s.actionBtn} onPress={() => setShowForge(true)} activeOpacity={0.75}>
            <Icon name="hammer-wrench" size={13} color={C.neonBlue} />
            <View>
              <Text style={s.actionBtnTxt}> {t('ui.forge_btn')}</Text>
              <Text style={s.actionBtnSub}>  {t('ui.forge_subtitle')}</Text>
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
                {isRestDay ? ` ${t('ui.rest_active')}` : ` ${t('ui.rest')}`}
              </Text>
              <Text style={s.actionBtnSub}>
                {isRestDay ? `  ${t('ui.rest_active_sub')}` : `  ${t('ui.rest_sub')}`}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.titleRow}>
          <Icon name="clipboard-list-outline" size={16} color={C.neonBlue} />
          <Text style={s.title}> {t('ui.daily_missions_title')}</Text>
          {isRestDay && (
            <View style={s.restBadge}>
              <Icon name="bed" size={10} color={C.green} />
              <Text style={s.restTxt}> {t('ui.rest_badge')}</Text>
            </View>
          )}
        </View>


        {/* Unified daily status bar */}
        <View style={[s.systemCard, s.cardNormal, s.statusBar]}>
          <View style={s.statusBarRow}>
            <Text style={s.statusBarLabel}>{t('ui.today_progress')}</Text>
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
                {' '}{t('ui.portals_today', { count: system.portalDailyCount ?? 0 })}
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
              {activeMission ? t('ui.mission_in_progress') : (acceptedPortal.detail || t('ui.press_to_open'))}
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
            return (
              <TouchableOpacity
                style={[s.systemCard, s.cardWarning, s.dungeonBreakBanner, { borderWidth: 2, borderColor: displayColor }]}
                onPress={() => {
                  if (!db) {return;}
                  if (db.source === 'quest') {
                    if (!qDef) {return;}
                    const mission: DungeonMission = {
                      id: `portal_${qDef.id}`,
                      label: t('ui.portal_dynamic_label', { title: qDef.title }),
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
                  const breakMinutes = Math.round(targetFocus / 60_000);
                  const mission: DungeonMission = {
                    id: `break_${rBoss.id}`,
                    label: t('ui.dungeon_break_label', { name: rBoss.name }),
                    detail: getRaidBossBreakDetail(rBoss.rank, breakMinutes, rBoss.id),
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
                      {t('ui.dynamic_portal_detected')}
                    </Text>
                    <Text style={s.dungeonBreakSub} numberOfLines={2}>{t('ui.portal_anomaly')}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                  <Icon name="timer-alert-outline" size={10} color={displayColor + 'cc'} />
                  <Text style={[s.dungeonBreakSub, { color: displayColor }]}>
                    {t('ui.portal_remaining', { countdown: formatCountdown(portalCountdownMs, t) })}
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
            <Text style={s.sectionLabel}>{t('ui.daily_missions_section')}</Text>
            <View style={s.sectionLine} />
          </View>
        </View>

        {/* Streak shield active indicator */}
        {system.adStreakShieldActive && (
          <View style={s.adShieldActive}>
            <Icon name="shield-check" size={12} color="#22d3ee" />
            <Text style={s.adShieldActiveTxt}> {t('ui.streak_shield_active')}</Text>
          </View>
        )}

        {/* Streak shield ad button — only when shadow protect not available */}
        {showStreakShieldAd && (
          <TouchableOpacity
            style={[s.adShieldRow, !adStreakLoaded && { opacity: 0.45 }]}
            disabled={!adStreakLoaded}
            onPress={() => showStreakAd(() => { claimAdStreakShield(); })}
            activeOpacity={0.75}
          >
            <Icon name="play-circle-outline" size={13} color="#22d3ee" />
            <Text style={s.adShieldTxt}>{t('ui.ad_streak_shield')}</Text>
          </TouchableOpacity>
        )}

        {/* XP Boost active indicator */}
        {xpBoostNext && (
          <View style={s.boostBanner}>
            <Icon name="timer-sand-complete" size={12} color={C.gold} />
            <Text style={s.boostTxt}> {t('ui.xp_boost_active')}</Text>
          </View>
        )}

        {/* XP Boost ad — when no boost active and not used today */}
        {!xpBoostNext && !system.adXpBoostToday && (
          <TouchableOpacity
            style={[s.adRow, !adXpLoaded && { opacity: 0.45 }]}
            disabled={!adXpLoaded}
            onPress={() => showXpAd(() => { claimAdXpBoost(); })}
            activeOpacity={0.75}
          >
            <Icon name="play-circle-outline" size={13} color="#f59e0b" />
            <Text style={s.adRowTxt}>{t('ui.ad_xp_boost')}</Text>
          </TouchableOpacity>
        )}

        {hasPenalty && (
          <View style={s.penalSection}>
            <View style={s.penalHeader}>
              <Icon name="alert-circle" size={12} color={C.neonRed} />
              <Text style={[s.penalTitle, { flex: 1 }]}>{t('ui.penalties_active')}</Text>
            </View>
            {!system.adPenaltyUsedWeek && penaltyQ.length > 0 && (
              <TouchableOpacity
                style={[s.adRow, { borderColor: C.neonRed + '55', backgroundColor: C.neonRed + '10', marginBottom: SPACING.sm }, !adPenaltyLoaded && { opacity: 0.45 }]}
                disabled={!adPenaltyLoaded}
                onPress={() => showPenaltyAd(() => { claimAdPenaltyReduction(); })}
                activeOpacity={0.75}
              >
                <Icon name="play-circle-outline" size={13} color={C.neonRed} />
                <Text style={[s.adRowTxt, { color: C.neonRed }]}>{t('ui.ad_penalty_reduce')}</Text>
              </TouchableOpacity>
            )}
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
                {t('ui.missions_not_generated')}
              </Text>
              <Text style={{ color: C.dimmed, fontSize: 12, textAlign: 'center', paddingHorizontal: SPACING.lg }}>
                {t('ui.missions_generated_next_day')}
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
              <Text style={s.collapsibleTitle}>{t('ui.extras')}</Text>
              <Icon name={sectionsOpen.extras ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
            </TouchableOpacity>
            {sectionsOpen.extras && (
              <>
            <View style={[s.sectionDivider, { marginTop: SPACING.sm }]}>
              <View style={[s.sectionLine, { backgroundColor: C.gold + '55' }]} />
              <Text style={[s.sectionLabel, { color: C.gold }]}>{t('ui.extras_section')}</Text>
              <View style={[s.sectionLine, { backgroundColor: C.gold + '55' }]} />
            </View>

            <View style={s.extraInfoBox}>
              <Icon name="star-four-points" size={11} color={C.gold} />
              <Text style={s.extraInfoTxt}>
                {' '}{t('ui.extras_info')}
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
                    ? ` ${t('ui.generate_extra')}`
                    : ` ${t('ui.generate_more_extra')}`}
                </Text>
                <Text style={s.generateExtraSub}> {t('ui.extras_remaining', { count: Math.max(0, 3 - extraQuests.length), plural: 3 - extraQuests.length === 1 ? '' : 's' })}</Text>
              </TouchableOpacity>
            )}
              </>
            )}
          </>
        )}

        <TouchableOpacity style={s.collapsibleHeader} onPress={() => toggleSection('events')} activeOpacity={0.8} onLayout={(e) => { sectionPositions.current.events = e.nativeEvent.layout.y; }}>
          <Text style={s.collapsibleTitle}>{t('ui.dungeons')}</Text>
          <Icon name={sectionsOpen.events ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} />
        </TouchableOpacity>
        {sectionsOpen.events && (
          <>
            {/* Raid Boss Global */}
            {activeRaidBoss && (() => {
              const def = RAID_BOSSES.find(b => b.id === activeRaidBoss.defId);
              if (!def) {return null;}
              const progress = activeRaidBoss.currentHp / activeRaidBoss.maxHp;
              const timeLeftMs = activeRaidBoss.endDate - Date.now();
              return (
                <View style={[s.systemCard, s.cardWarning, { marginBottom: SPACING.sm, padding: 12, backgroundColor: def.color + '15', borderColor: def.color + '50', borderRadius: 8 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Icon name={def.icon} size={22} color={def.color} style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontFamily: FONT.orbitron, fontSize: 9, color: def.color, letterSpacing: 1 }}>{t('ui.raid_boss_label', { rank: def.rank })}</Text>
                      <Text style={{ fontFamily: FONT.orbitron, fontSize: 13, color: '#fff', fontWeight: 'bold', marginTop: 2 }}>{def.name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Icon name="timer-sand" size={11} color={C.dimmed} />
                      <Text style={{ fontFamily: FONT.orbitron, fontSize: 9, color: C.dimmed, marginTop: 2 }}>{formatCountdown(timeLeftMs, t)}</Text>
                    </View>
                  </View>
                  <View style={{ height: 5, backgroundColor: C.bg, borderRadius: 3, overflow: 'hidden', marginBottom: 4, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: def.color }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontFamily: FONT.orbitron, fontSize: 9, color: C.dimmed }}>{t('ui.hp_remaining')}</Text>
                    <Text style={{ fontFamily: FONT.orbitron, fontSize: 9, color: C.muted }}>{Math.floor(activeRaidBoss.currentHp)} <Text style={{ color: C.dimmed }}>/ {activeRaidBoss.maxHp}</Text></Text>
                  </View>
                  {system.adBossUsedForId !== activeRaidBoss.defId && (
                    <TouchableOpacity
                      style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, borderWidth: 1, borderColor: def.color + '66', borderRadius: 4, paddingVertical: 7, backgroundColor: def.color + '12' }, !adBossLoaded && { opacity: 0.45 }]}
                      disabled={!adBossLoaded}
                      onPress={() => showBossAd(() => { claimAdBossHp(); })}
                      activeOpacity={0.75}
                    >
                      <Icon name="play-circle-outline" size={12} color={def.color} />
                      <Text style={{ color: def.color, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1, marginLeft: 6 }}>{t('ui.ad_boss_hp')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}

            {/* Boss Dungeon */}
            <TouchableOpacity
              style={[s.systemCard, s.bossBanner, { borderColor: C.neonRed + '66', backgroundColor: C.neonRed + '08' }]}
              onPress={() => setShowWeeklyDungeon(true)}
              activeOpacity={0.8}
            >
              <View style={s.bossBannerLeft}>
                <Icon name="gate" size={20} color={C.neonRed} />
                <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                  <Text style={s.bossTitle}>{t('ui.boss_dungeon')}</Text>
                  <Text style={s.bossSub}>
                    {weeklyDefeatedBossId ? t('ui.boss_defeated_this_week') : t('ui.defeat_boss_to_extract')}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={18} color={C.neonRed} />
            </TouchableOpacity>

            {/* Event Dungeon */}
            {activeEventDef && eventCountdownMs > 0 && (
              <TouchableOpacity
                style={[s.systemCard, s.cardWarning, s.bossBanner, { borderColor: C.gold + '88', backgroundColor: C.gold + '08' }]}
                onPress={() => setShowEventDungeon(true)}
                activeOpacity={0.8}
              >
                <View style={s.bossBannerLeft}>
                  <Icon name="calendar-star" size={20} color={C.gold} />
                  <View style={{ marginLeft: SPACING.sm, flex: 1 }}>
                    <Text style={[s.bossTitle, { color: C.gold }]}>{t('ui.event_dungeon_available')}</Text>
                    <Text style={s.bossSub}>{t('ui.event_label', { name: activeEventDef.event.name, completed: eventCompleted.length, required: eventRequired })}</Text>
                    <Text style={[s.bossSub, { fontSize: 10, marginTop: 2, color: C.gold }]}>
                      {eventCountdownMs > 0 ? formatCountdown(eventCountdownMs, t) : t('ui.event_ended')}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={18} color={C.gold} />
              </TouchableOpacity>
            )}

            {/* Empty state */}
            {!activeRaidBoss && !activeEventDef && (
              <View style={{ alignItems: 'center', paddingVertical: SPACING.lg }}>
                <Icon name="gate" size={28} color={C.dimmed} />
                <Text style={{ color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, marginTop: SPACING.sm }}>
                  {t('ui.no_active_event_dungeons')}
                </Text>
              </View>
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

      {/* Boss Dungeon selection modal */}
      <DailyBossDungeonModal
        visible={showWeeklyDungeon}
        onClose={() => setShowWeeklyDungeon(false)}
        onRequestClose={() => setShowWeeklyDungeon(false)}
        onSelectMission={handleMissionSelect}
        customMissions={[]}
        defeatedId={weeklyDefeatedBossId}
        playerKeys={player.dungeonKeys ?? []}
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
          title={t('ui.portal_modal_title')}
          message={`${portalConfirm.label ?? t('ui.dynamic_portal_detected')}\n${t('ui.portal_entry_hint')}`}
          confirmLabel={t('ui.portal_enter')}
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
          message={t('ui.event_progress_message', { name: eventProgressInfo.name, completed: eventProgressInfo.completed, required: eventProgressInfo.required })}
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
          title={keyConfirm.type === 'weekly' ? t('ui.key_confirm_weekly') : t('ui.key_confirm_use')}
          message={t('ui.key_confirm_message', { keyName: keyConfirm.key.name })}
          confirmLabel={t('ui.key_enter')}
          confirmIcon="key-variant"
          confirmColor={keyConfirm.key.color || C.neonBlue}
          onConfirm={() => {
            if (enterDungeon(keyConfirm.key.id)) {
              handleMissionSelect(keyConfirm.mission);
            }
            setKeyConfirm(null);
          }}
          cancelLabel={t('ui.key_cancel')}
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
