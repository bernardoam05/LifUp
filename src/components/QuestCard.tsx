// src/components/QuestCard.tsx
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Pressable, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import useGameStore, { Quest } from '../store/useGameStore';
import { getQuestConfig } from '../store/questDictionary';
import CustomModal from './CustomModal';
import GPSTrackerModal from './GPSTrackerModal';
import MissionActiveScreen from '../screens/MissionActiveScreen';
import { SPACING, FONT, RANK_COLORS } from '../theme';
import { useRewardedAd, AD_UNIT_REROLL, adsAvailable } from '../hooks/useRewardedAd';

const getQCStyles = (C: any) => StyleSheet.create({
  card: { opacity: 1, backgroundColor: C.panel, borderRadius: 10, padding: SPACING.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: C.neonBlue + '33' },
  cardWarning: { backgroundColor: C.neonRed + '08', borderColor: C.neonRed + '44' },
  cardSuccess: { backgroundColor: C.green + '10', borderColor: C.green + '44' },
  cardDone: { opacity: 0.55 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  typeTag: { width: 32, height: 32, borderRadius: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: C.muted, fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  labelDone: { color: C.muted },
  rewards: { flexDirection: 'row', alignItems: 'center' },
  xp: { color: C.neonBlue, fontSize: 11, fontWeight: '700' },
  gold: { color: C.gold, fontSize: 11, fontWeight: '700' },
  dimmedTxt: { color: C.dimmed },
  detail: { color: C.muted, fontSize: 12, marginBottom: SPACING.md, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: 8 },
  actionTxt: { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  doneRow: { flexDirection: 'row', alignItems: 'center' },
  doneTag: { color: C.green, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 0.5 },
  undoBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: 6, minHeight: 32 },
  undoTxt: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 0.5 },
  recordChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.gold + '10', borderWidth: 1, borderColor: C.gold + '33', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: SPACING.sm },
  recordChipTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9 },
  cardActive: { borderColor: C.neonBlue + '99', shadowColor: C.neonBlue, shadowOpacity: 0.45, shadowRadius: 8, elevation: 6 },
  activeTimerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.neonBlue + '12', borderWidth: 1, borderColor: C.neonBlue + '55', borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: 10 },
  activeTimerTxt: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  forbiddenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  failBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.neonRed + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.neonRed + '40',
  },
  failBtnTxt: {
    color: C.neonRed,
    fontSize: 11,
    fontFamily: FONT.orbitron,
    marginLeft: 4,
  },
  forbiddenStatus: {
    color: C.neonRed,
    fontSize: 10,
    fontFamily: FONT.orbitron,
    letterSpacing: 1,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  limitControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONT.orbitron,
    minWidth: 40,
    textAlign: 'center',
  },
  limitStatus: {
    fontSize: 10,
    fontFamily: FONT.orbitron,
    letterSpacing: 1,
  },
  adRerollBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, backgroundColor: '#f59e0b18', borderWidth: 1, borderColor: '#f59e0b55', borderRadius: 6, paddingVertical: 8 },
  adRerollTxt: { color: '#f59e0b', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
});

// Specific extra badge styles needed internally by QuestCard
const getExtraStyles = (C: any) => StyleSheet.create({
  extraBonusBadge: { marginLeft: 8, backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold + '55', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  extraBonusTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5 },
});


export default function QuestCard({ quest, isExtra, isPenalty, C }: { quest: Quest; isExtra?: boolean; isPenalty?: boolean; C: any }) {
  const { t } = useTranslation('quests');
  const qc = getQCStyles(C);
  const ex = getExtraStyles(C);
  const limitDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cfgInfo = getQuestConfig(quest.type);
  const cfg = { icon: cfgInfo.icon, color: (C as any)[cfgInfo.colorKey] || C.dimmed };

  const completeQuest = useGameStore(s => isExtra ? s.completeExtraQuest : s.completeQuest);
  // Use a stable identity for the no-op function
  const undoQuest = useGameStore(s => isExtra ? undefined : s.undoQuest);
  const recordFocus = useGameStore(s => s.recordFocusTime);
  const questRecords = useGameStore(s => s.questRecords);
  const activeMissionTimers = useGameStore(s => s.activeMissionTimers);
  const failQuest = useGameStore(s => s.failQuest);
  const updateQuestValue = useGameStore(s => s.updateQuestValue);
  const setMissionModalOpen = useGameStore(s => s.setMissionModalOpen);
  const regenerateSingleDailyQuest = useGameStore(s => isExtra ? undefined : s.regenerateSingleDailyQuest);
  const weeklyRegenCount = useGameStore(s => s.system.weeklyRegenCount);
  const rerollQuestViaAd = useGameStore(s => s.rerollQuestViaAd);
  const replaceExtraQuest = useGameStore(s => isExtra ? s.replaceExtraQuest : undefined);

  const { loaded: adRerollLoaded, show: showRerollAd } = useRewardedAd(AD_UNIT_REROLL);
  const extraQuestRerolledIds = useGameStore(s => s.extraQuestRerolledIds);

  const timer = activeMissionTimers[quest.id];
  const isTimerActive = !!timer && !quest.done;
  const isWarningQuest = quest.type === 'forbidden' || quest.type === 'limit';

  const [showGPS, setShowGPS] = useState(false);
  const [showMission, setShowMission] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [showExtraRegenConfirm, setShowExtraRegenConfirm] = useState(false);
  const [extraRegenMsg, setExtraRegenMsg] = useState<string | null>(null);

  const record = questRecords[quest.id];

  // ── Press feedback: spring scale ──────────────────────────────────────────
  const pressScale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    if (quest.done) { return; }
    Animated.spring(pressScale, { toValue: 0.975, tension: 200, friction: 8, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
  };

  function handleCardPress() {
    if (quest.type === 'gps') {
      setMissionModalOpen(true);
      setShowGPS(true);
    } else if (quest.type === 'forbidden' || quest.type === 'limit') {
      // handled inline
    } else if (quest.type === 'focus' || quest.type === 'pomodoro') {
      Linking.openURL('lifup://focus');
    } else {
      setMissionModalOpen(true);
      setShowMission(true);
    }
  }


  function handleComplete() {
    completeQuest(quest.id);
  }

  function handleMissionComplete() {
    setShowMission(false);
    if (quest.type === 'focus') {
      const focusMinutes = Math.max(1, Math.round((quest.focusDuration ?? 30 * 60_000) / 60_000));
      recordFocus(focusMinutes);
    }
    handleComplete();
  }

  return (
    <>
      <Pressable
        onPress={!quest.done ? handleCardPress : undefined}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
      <Animated.View
        style={[
          qc.card,
          isWarningQuest && qc.cardWarning,
          quest.done && !quest.failed && qc.cardSuccess,
          quest.done && qc.cardDone,
          isTimerActive && qc.cardActive,
          { transform: [{ scale: pressScale }] },
        ]}
      >
        <View style={qc.header}>
          <View style={[qc.typeTag, { borderColor: cfg.color + '55' }]}>
            <Icon name={cfg.icon} size={14} color={quest.done ? C.muted : cfg.color} />
          </View>
          <Text style={[qc.label, quest.done && qc.labelDone]} numberOfLines={1}>{quest.label}</Text>
          <View style={qc.rewards}>
            {isExtra && (
              <View style={ex.extraBonusBadge}>
                <Text style={ex.extraBonusTxt}>×1.5</Text>
              </View>
            )}
            {isExtra && !quest.done && replaceExtraQuest && !extraQuestRerolledIds.includes(quest.id) && (
              <TouchableOpacity
                style={{ padding: 4, marginRight: 4 }}
                onPress={() => setShowExtraRegenConfirm(true)}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={14} color={C.gold} />
              </TouchableOpacity>
            )}
            {!isExtra && !isPenalty && !quest.done && regenerateSingleDailyQuest && (
              <TouchableOpacity
                style={{ padding: 2, marginRight: SPACING.sm }}
                onPress={() => {
                  if (weeklyRegenCount >= 7) {
                    setExtraRegenMsg(t('ui.weekly_regen_limit'));
                    setShowExtraRegenConfirm(true);
                  } else {
                    setShowRegenConfirm(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={14} color={C.neonBlue} />
              </TouchableOpacity>
            )}
            <Icon name="star-four-points" size={10} color={quest.done ? C.dimmed : (isExtra ? C.gold : C.neonBlue)} />
            <Text style={[qc.xp, quest.done && qc.dimmedTxt, isExtra && { color: C.gold }]}> {quest.xp}</Text>
            <Text style={[qc.gold, quest.done && qc.dimmedTxt, isExtra && { color: C.gold }]}>  ◈{quest.gold}</Text>
          </View>
        </View>

        <Text style={[qc.detail, quest.done && qc.dimmedTxt]}>{quest.detail}</Text>

        {/* Pomodoro progress bar */}
        {quest.type === 'pomodoro' && quest.pomodoroTarget != null && quest.pomodoroTarget > 0 && (
          <View style={{ marginBottom: SPACING.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Icon name="timer-outline" size={11} color={quest.done ? C.dimmed : C.neonBlue} />
              <Text style={{ color: quest.done ? C.dimmed : C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, marginLeft: 4 }}>
                {t('ui.card_pomodoro_cycles', { current: quest.currentValue ?? 0, target: quest.pomodoroTarget })}
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: C.neonBlue + '22', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: 6, backgroundColor: quest.done ? C.dimmed : C.neonBlue, borderRadius: 3, width: `${Math.min(100, ((quest.currentValue ?? 0) / quest.pomodoroTarget) * 100)}%` }} />
            </View>
          </View>
        )}

        {/* Focus progress (minutes/hours) */}
        {quest.type === 'focus' && (() => {
          const unit = (quest.unit ?? (quest.detail?.toLowerCase().includes('hora') ? 'h' : 'min')).toLowerCase();
          const isHours = unit.startsWith('h');
          const target = quest.targetValue ?? (quest.focusDuration ? (isHours ? quest.focusDuration / 3_600_000 : quest.focusDuration / 60_000) : 0);
          if (!target || target <= 0) {return null;}
          const current = quest.currentValue ?? 0;
          const fmt = (v: number) => (isHours && !Number.isInteger(v) ? v.toFixed(1) : Math.round(v).toString());
          const label = isHours ? 'h' : 'min';
          const progress = Math.min(100, (current / target) * 100);
          return (
            <View style={{ marginBottom: SPACING.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Icon name="lightning-bolt" size={11} color={quest.done ? C.dimmed : C.neonBlue} />
                <Text style={{ color: quest.done ? C.dimmed : C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, marginLeft: 4 }}>
                  {fmt(current)}/{fmt(target)} {label}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: C.neonBlue + '22', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: 6, backgroundColor: quest.done ? C.dimmed : C.neonBlue, borderRadius: 3, width: `${progress}%` }} />
              </View>
            </View>
          );
        })()}

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
          <View style={[qc.doneRow, { paddingRight: 50 }]}>
            <Icon name={quest.failed ? 'close-circle' : 'check-circle'} size={14} color={quest.failed ? C.neonRed : C.green} />
            <Text style={[qc.doneTag, quest.failed && { color: C.neonRed }]}>{quest.failed ? ` ${t('ui.card_failed')}` : ` ${t('ui.card_done')}`}</Text>
            <View style={{ flex: 1 }} />
            {!isExtra && !isPenalty && (
              <TouchableOpacity style={qc.undoBtn} onPress={() => setConfirmUndo(true)}>
                <Icon name="undo-variant" size={13} color={C.muted} />
                <Text style={qc.undoTxt}> {t('ui.card_undo')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : quest.type === 'forbidden' ? (
          <View style={[qc.forbiddenRow, { paddingRight: 50 }]}>
            <TouchableOpacity style={qc.failBtn} onPress={() => failQuest(quest.id)}>
              <Icon name="close-circle-outline" size={14} color={C.neonRed} />
              <Text style={qc.failBtnTxt}> {t('ui.card_fail_btn')}</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Text style={qc.forbiddenStatus}>{t('ui.card_in_force')}</Text>
          </View>
        ) : quest.type === 'limit' ? (
          <View style={[qc.limitRow, { paddingRight: 50 }]}>
            <View style={qc.limitControls}>
              <TouchableOpacity onPress={() => {
                if (limitDebounceRef.current) { return; }
                updateQuestValue(quest.id, Math.max(0, (quest.currentValue ?? 0) - 10));
                limitDebounceRef.current = setTimeout(() => { limitDebounceRef.current = null; }, 300);
              }}>
                <Icon name="minus-box-outline" size={20} color={C.dimmed} />
              </TouchableOpacity>
              <Text style={qc.limitValue}>{Math.max(0, quest.currentValue ?? 0).toString()}</Text>
              <TouchableOpacity onPress={() => {
                if (limitDebounceRef.current) { return; }
                updateQuestValue(quest.id, (quest.currentValue ?? 0) + 10);
                limitDebounceRef.current = setTimeout(() => { limitDebounceRef.current = null; }, 300);
              }}>
                <Icon name="plus-box-outline" size={20} color={C.neonBlue} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={[qc.limitStatus, (quest.currentValue ?? 0) > (quest.targetValue ?? 0) ? { color: C.purple } : { color: C.green }]}>
              Max: {quest.targetValue}
            </Text>
          </View>
        ) : isTimerActive ? (
          <>
            <View style={qc.activeTimerRow}>
              <Icon name="timer-outline" size={13} color={C.neonBlue} />
              <Text style={qc.activeTimerTxt}> A DECORRER</Text>
              <View style={{ flex: 1 }} />
              <Icon name="chevron-right" size={14} color={C.neonBlue} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
              <Text style={{ color: (quest.rank ? RANK_COLORS[quest.rank] : '#94a3b8'), fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
                {quest.rank || 'E'}-RANK
              </Text>
            </View>
          </>
        ) : quest.type === 'focus' ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.6 }}>
              <Icon name="lightning-bolt" size={13} color={C.neonBlue} style={{ opacity: 0.7 }} />
              <Text style={{ color: C.neonBlue, fontSize: 10, fontFamily: FONT.orbitron, marginLeft: 4 }}>
                Toca para abrir Focus Mode e contar automaticamente
              </Text>
            </View>
            <TouchableOpacity
              style={[qc.actionBtn, { borderColor: C.green + '66', backgroundColor: C.green + '12', alignSelf: 'flex-start', paddingHorizontal: 12 }]}
              onPress={e => { e.stopPropagation?.(); handleComplete(); }}
              activeOpacity={0.75}
            >
              <Icon name="check" size={13} color={C.green} />
              <Text style={[qc.actionTxt, { color: C.green, marginLeft: 4 }]}>{t('ui.card_complete_manual')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, opacity: 1, paddingRight: 50 }}>
            <Icon name={quest.type === 'pomodoro' ? 'lightning-bolt' : 'gesture-tap'} size={14} color={C.neonBlue} style={{ opacity: 0.5 }} />
            <Text style={{ color: C.neonBlue, fontSize: 10, fontFamily: FONT.orbitron, marginLeft: 4, opacity: 0.5 }}>
              {t(quest.type === 'pomodoro' ? 'ui.card_open_focus' : 'ui.card_tap_to_start')}
            </Text>
            <View style={{ flex: 1 }} />
          </View>
        )}

        {/* Ad re-roll — appears when weekly regen limit is hit */}
        {adsAvailable && !isExtra && !isPenalty && !quest.done && weeklyRegenCount >= 7 && (
          <TouchableOpacity
            style={[qc.adRerollBtn, !adRerollLoaded && { opacity: 0.45 }]}
            disabled={!adRerollLoaded}
            onPress={() => showRerollAd(() => { rerollQuestViaAd(quest.id); })}
            activeOpacity={0.75}
          >
            <Icon name="play-circle-outline" size={13} color="#f59e0b" />
            <Text style={qc.adRerollTxt}> {t('ui.card_ad_reroll')}</Text>
          </TouchableOpacity>
        )}

        {showGPS && (
          <GPSTrackerModal
            quest={quest}
            onClose={() => { setMissionModalOpen(false); setShowGPS(false); }}
            onComplete={() => { setMissionModalOpen(false); setShowGPS(false); handleComplete(); }}
            C={C}
          />
        )}


        {showMission && (
          <MissionActiveScreen
            quest={quest}
            onClose={() => { setMissionModalOpen(false); setShowMission(false); }}
            onComplete={() => { setMissionModalOpen(false); handleMissionComplete(); }}
            initialElapsed={timer ? (timer.accumulatedMs + (timer.isPaused ? 0 : Date.now() - timer.startTime)) : 0}
            initialPaused={timer?.isPaused}
            targetSeconds={quest.type === 'focus' ? (quest.focusDuration ? quest.focusDuration / 1000 : 30 * 60) : undefined}
            C={C}
          />
        )}


        <CustomModal
          visible={confirmUndo}
          title={t('ui.undo_mission_title')}
          message={t('ui.undo_mission_message', { label: quest.label })}
          confirmLabel={t('ui.undo_confirm')}
          confirmIcon="undo-variant"
          confirmColor={C.neonRed}
          onConfirm={() => { setConfirmUndo(false); undoQuest?.(quest.id); }}
          onCancel={() => setConfirmUndo(false)}
          C={C}
        />

        {/* Indicador de Classe — só mostra absolute quando o timer não está ativo (timer state mostra inline) */}
        {!isTimerActive && (
          <View style={{ position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: (quest.rank ? RANK_COLORS[quest.rank] : '#94a3b8') + (quest.done ? '88' : ''), fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
              {quest.rank || 'E'}-RANK
            </Text>
          </View>
        )}
      </Animated.View>
      </Pressable>


      {/* Reroll extra quest Modal */}
      {isExtra && replaceExtraQuest && (
        <CustomModal
          visible={showExtraRegenConfirm}
          title={t('ui.extra_regen_title')}
          message={extraRegenMsg || t('ui.extra_regen_message')}
          confirmLabel={extraRegenMsg ? 'OK' : t('ui.extra_regen_confirm')}
          confirmIcon={extraRegenMsg ? 'check' : 'refresh'}
          confirmColor={extraRegenMsg ? C.neonRed : C.gold}
          onConfirm={() => {
            if (extraRegenMsg) {
              setExtraRegenMsg(null);
              setShowExtraRegenConfirm(false);
              return;
            }
            const res = replaceExtraQuest(quest.id);
            if (!res.success && res.reason) {
              setExtraRegenMsg(res.reason);
            } else {
              setShowExtraRegenConfirm(false);
            }
          }}
          cancelLabel={extraRegenMsg ? undefined : t('ui.regen_cancel')}
          onCancel={() => { setShowExtraRegenConfirm(false); setExtraRegenMsg(null); }}
          C={C}
        />
      )}

      {/* Reroll single quest Modal */}
      {!isExtra && regenerateSingleDailyQuest && (
        <CustomModal
          visible={showRegenConfirm}
          title={t('ui.regen_confirm_title')}
          message={t('ui.regen_confirm_message', { remaining: Math.max(0, 7 - weeklyRegenCount) })}
          confirmLabel={t('ui.regen_confirm_btn')}
          onConfirm={() => {
            setShowRegenConfirm(false);
            regenerateSingleDailyQuest(quest.id);
          }}
          cancelLabel={t('ui.regen_cancel')}
          onCancel={() => setShowRegenConfirm(false)}
          C={C}
        />
      )}
    </>
  );
}
