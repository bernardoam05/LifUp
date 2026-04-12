import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import MissionHistoryModal from './MissionHistoryModal';
import { CATALOG_MAP } from '../data/shopItems';

// Renders a MCI icon with 'help-circle' as fallback for unknown icon names
const KNOWN_SAFE = new Set([
  'fire','crown','shield-check','feather','script-text-outline','timer-outline','brain',
  'weather-night','undo-variant','timer-sand','sword','castle','run-fast','dog',
  'arrow-up-bold','lightning-bolt','skull-crossbones','calendar-star','check-all',
  'clock-alert','bell-off-outline','refresh','cart-plus','ticket-confirmation-outline',
  'water-outline','rhombus','piggy-bank-outline','dice-3','plus-circle','sword-cross',
  'ghost','cellphone-lock','shield-half','alert-octagon','check-circle-outline',
  'arrow-up-circle','weather-sunset-up','calendar-check','flag','account-group',
  'trophy','star','lock','flash','arm-flex','help-circle','help-circle-outline',
  'lock-outline','check-circle','star-circle-outline','trophy-outline','timer-sand',
  'cash-multiple','check',
  'snowflake','skull','weather-sunny','star-four-points','heart','mask','rabbit','flower','corn','dragon',
  'key-variant','gift-outline','calendar-month','gift',
]);

function SafeIcon({ name, size, color, style }: { name: string; size: number; color: string; style?: object }) {
  const safeName = KNOWN_SAFE.has(name) ? name : 'help-circle';
  return <Icon name={safeName} size={size} color={color} style={style} />;
}
import useGameStore, { getRank, xpForLevel, RankKey, LevelUpReward, CLASS_REQUIREMENTS } from '../store/useGameStore';
import type { CalendarReward } from '../store/types';
import { getJobClass } from '../store/helpers';
import {
  ACHIEVEMENTS_CATALOG, Achievement, AchievementProg,
  TIER_COLORS, getActiveTier, getCompletedTier, isAchievementMaxed, getTierIndex,
} from '../data/achievements';
import { SHADOW_MAP, SHADOW_RANK_COLOR } from '../data/shadows';
import SystemModal from '../components/SystemModal';
import { useTheme, FONT, SPACING, RANK_COLORS as THEME_RANK_COLORS } from '../theme';
import RankModal from '../components/RankModal';

// Format minutes into "Xh Ym" for focus achievements
function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

function fmtVal(a: Achievement, val: number): string {
  if (a.conditionType === 'focus_total_hours') {return formatMinutes(val);}
  return String(val);
}

// ── Stat bar ───────────────────────────────────────────────────────────────────

function StatBar({ label, level, C }: { label: string; level: number; C: any }) {
  const ATTR_ICONS: Record<string, { icon: string; color: string }> = {
    STR: { icon: 'arm-flex',    color: C.neonRed },
    AGI: { icon: 'run-fast',    color: C.green },
    INT: { icon: 'brain',       color: C.neonBlue },
    VIT: { icon: 'heart-pulse', color: C.purple },
  };
  const { icon, color } = ATTR_ICONS[label as keyof typeof ATTR_ICONS] ?? { icon: 'help-circle', color: C.muted };
  const s = getStyles(C);

  return (
    <View style={s.statRow}>
      <Icon name={icon} size={16} color={color} style={s.statIcon} />
      <View style={s.statInfo}>
        <View style={s.statHeader}>
          <Text style={[s.statLabel, { color }]}>{label}</Text>
          <Text style={s.statVal}>{level}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, C }: { icon: string; label: string; C: any }) {
  const s = getStyles(C); // Assuming getStyles is defined later and contains sectionHeader, sectionTitle
  return (
    <View style={s.sectionHeader}>
      <Icon name={icon} size={12} color={C.neonBlue} />
      <Text style={s.sectionTitle}> {label}</Text>
    </View>
  );
}

// ── Statistics panel ───────────────────────────────────────────────────────────

function StatisticsPanel({ C }: { C: any }) {
  const { t } = useTranslation('screens');
  const sp = getSPStyles(C); // Assuming getSPStyles is defined later
  const stats = useGameStore(st => st.statistics);

  const hours   = Math.floor(stats.totalFocusMinutes / 60);
  const minutes = stats.totalFocusMinutes % 60;

  const RANK_ORDER: RankKey[] = ['E', 'D', 'C', 'B', 'A', 'S'];
  const RANK_COLORS = THEME_RANK_COLORS;

  const totalQuestsByRank = RANK_ORDER.reduce((sum, r) => sum + (stats.questsByRank[r] || 0), 0);

  // Counts for extra categories
  const extraCount = stats.questsByRank['Extra' as RankKey] || 0;
  const bossCount  = stats.questsByRank['Boss' as RankKey] || 0;
  const eventCount = stats.questsByRank['Event' as RankKey] || 0;

  const categories = [
    ...RANK_ORDER.map(r => ({ id: r, label: r, count: stats.questsByRank[r] || 0, color: RANK_COLORS[r] })),
    { id: 'Extra', label: 'EXTRA', count: extraCount, color: C.gold },
    { id: 'Boss',  label: 'BOSS',  count: bossCount,  color: C.neonRed },
    { id: 'Event', label: 'EVNT',  count: eventCount, color: C.gold },
  ];

  const grandTotal = totalQuestsByRank + extraCount + bossCount + eventCount;

  return (
    <View style={sp.container}>
      <View style={sp.kpiRow}>
        <KPICard icon="trophy" color={C.gold}     label={t('status.stats_kpi_missions')}       value={String(stats.totalCompleted)} C={C} />
        <KPICard icon="calendar-star" color={C.purple} label={t('status.stats_kpi_perfect_days')} value={String(stats.perfectDays)} C={C} />
        <KPICard icon="timer-outline" color={C.neonBlue} label={t('status.stats_kpi_focus')}
          value={hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`} C={C} />
      </View>

      <View style={sp.rankSection}>
        <Text style={sp.rankTitle}>{t('status.stats_ops_detail')}</Text>
        <View style={sp.rankGrid}>
          {categories.map(cat => {
            const pct = grandTotal > 0 ? (cat.count / grandTotal) * 100 : 0;
            return (
              <View key={cat.id} style={sp.rankItem}>
                <View style={[sp.rankBadge, { borderColor: cat.color + '44', backgroundColor: cat.color + '0a' }]}>
                  <Text style={[sp.rankLetter, { color: cat.color, fontSize: cat.label.length > 2 ? 9 : 11 }]}>{cat.label}</Text>
                </View>
                <View style={sp.rankBarTrack}>
                  <View style={[sp.rankBarFill, { width: `${pct}%` as any, backgroundColor: cat.color }]} />
                </View>
                <Text style={sp.rankCount}>{cat.count}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function KPICard({ icon, color, label, value, C }: { icon: string; color: string; label: string; value: string; C: any }) {
  const kpi = getKPIStyles(C); // Assuming getKPIStyles is defined later
  return (
    <View style={[kpi.card, { borderColor: color + '44' }]}>
      <Icon name={icon} size={20} color={color} />
      <Text style={[kpi.value, { color }]}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
    </View>
  );
}

// ── Achievement Detail Modal ────────────────────────────────────────────────────

function AchievementDetailModal({
  achievement: a, prog, done, onClose, C,
}: { achievement: Achievement; prog: AchievementProg | undefined; done: boolean; onClose: () => void; C: any }) {
  const { t } = useTranslation('screens');
  const am = getAMStyles(C); // Assuming getAMStyles is defined later
  const secret    = a.isSecret && !done && !a.tiers;
  const maxed     = a.tiers ? isAchievementMaxed(a, prog) : done;
  const activeTier    = getActiveTier(a, prog);
  const completedTier = getCompletedTier(a, prog);
  const displayTier   = maxed ? a.tiers?.[a.tiers.length - 1] : (completedTier ?? activeTier);
  const tierColor     = displayTier ? TIER_COLORS[displayTier.rank] : a.color;
  const cardColor     = a.tiers ? (maxed ? C.gold : completedTier ? tierColor : C.dimmed) : (done ? a.color : C.dimmed);

  // Progress bar for active tier
  const currentVal  = prog?.currentValue ?? 0;
  const tierIdx     = prog?.currentTierIndex ?? 0;
  const prevTarget  = a.tiers && tierIdx > 0 ? a.tiers[tierIdx - 1].targetValue : 0;
  const thisTarget  = activeTier?.targetValue ?? 1;
  const range = thisTarget - prevTarget;
  const pct = a.tiers
    ? (maxed ? 100 : range > 0 ? Math.min(100, ((currentVal - prevTarget) / range) * 100) : 0)
    : (done ? 100 : 0);

  return (
    <SystemModal visible onRequestClose={onClose}>
      <View style={[am.card, { borderColor: cardColor + '66' }]}>

          {/* Header */}
          <View style={am.headerRow}>
            <Text style={am.headerLabel}>{t('status.achievement_label')}</Text>
            <TouchableOpacity onPress={onClose} style={am.closeBtn}>
              <Icon name="close" size={16} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Icon */}
          <View style={[am.iconWrap, { backgroundColor: cardColor + '18' }]}>
            <SafeIcon name={secret ? 'help-circle-outline' : a.icon} size={36} color={cardColor} />
          </View>

          {/* Title + tier badge */}
          <View style={am.titleRow}>
            <Text style={[am.title, { color: cardColor }]}>
              {secret ? '???' : a.title}
            </Text>
            {displayTier && (
              <View style={[am.tierBadge, { borderColor: TIER_COLORS[displayTier.rank] }]}>
                <Text style={[am.tierTxt, { color: TIER_COLORS[displayTier.rank] }]}>
                  {maxed ? displayTier.rank : `→ ${displayTier.rank}`}
                </Text>
              </View>
            )}
          </View>

          {/* Badges */}
          <View style={am.badgesRow}>
            <View style={am.categoryBadge}>
              <Text style={am.categoryTxt}>{a.category}</Text>
            </View>
            {a.isSecret && (
              <View style={[am.categoryBadge, { borderColor: C.purple + '44' }]}>
                <Text style={[am.categoryTxt, { color: C.purple }]}>{t('status.achievement_secret')}</Text>
              </View>
            )}
            {maxed && (
              <View style={[am.categoryBadge, { borderColor: C.gold + '66' }]}>
                <Icon name="check-circle" size={9} color={C.gold} />
                <Text style={[am.categoryTxt, { color: C.gold }]}> {t('status.achievement_maxed')}</Text>
              </View>
            )}
            {!a.tiers && done && (
              <View style={[am.categoryBadge, { borderColor: C.green + '44' }]}>
                <Icon name="check-circle" size={9} color={C.green} />
                <Text style={[am.categoryTxt, { color: C.green }]}> {t('status.achievement_unlocked')}</Text>
              </View>
            )}
          </View>

          <View style={am.divider} />

          {/* Description */}
          <Text style={am.desc}>{secret ? '???' : a.description}</Text>

          {/* Tier ladder */}
          {a.tiers && !secret && (
            <View style={am.tiersSection}>
              {a.tiers.map((tier, i) => {
                const isCompleted = i < tierIdx;
                const isActive    = i === tierIdx;
                const tc = TIER_COLORS[tier.rank];
                return (
                  <View key={tier.rank} style={[am.tierRow, isActive && { backgroundColor: tc + '12' }]}>
                    <View style={[am.tierDot, { borderColor: tc, backgroundColor: isCompleted ? tc : 'transparent' }]}>
                      {isCompleted && <Icon name="check" size={8} color={C.bg} />}
                    </View>
                    <Text style={[am.tierRowRank, { color: isCompleted ? tc : isActive ? tc : C.dimmed }]}>
                      {tier.rank}
                    </Text>
                    <Text style={[am.tierRowTarget, { color: isCompleted || isActive ? C.muted : C.dimmed }]}>
                      {fmtVal(a, tier.targetValue)}
                    </Text>
                    <Text style={[am.tierRowReward, { color: isCompleted ? C.gold : C.dimmed }]}>
                      +{tier.rewardGold}G{tier.rewardXP ? ` +${tier.rewardXP}XP` : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Progress bar (active tier) */}
          {a.tiers && !secret && !maxed && activeTier && (
            <View style={am.progSection}>
              <View style={am.progHeader}>
                <Text style={am.progLabel}>{t('status.achievement_progress_label')}</Text>
                <Text style={am.progNums}>
                  {fmtVal(a, currentVal)} / {fmtVal(a, activeTier.targetValue)}
                </Text>
              </View>
              <View style={am.progTrack}>
                <View style={[am.progFill, { width: `${Math.max(pct, 0)}%` as any, backgroundColor: tierColor }]} />
              </View>
            </View>
          )}
          {a.tiers && maxed && (
            <View style={[am.progSection]}>
              <View style={am.progTrack}>
                <View style={[am.progFill, { width: '100%' as any, backgroundColor: C.gold }]} />
              </View>
              <Text style={am.maxLabel}>{t('status.achievement_max_label')}</Text>
            </View>
          )}

          {/* Reward (instant/non-tiered) */}
          {!a.tiers && (
            <View style={am.rewardRow}>
              <Icon name="rhombus" size={12} color={C.gold} />
              <Text style={am.rewardTxt}> {a.rewardGold} G</Text>
              {a.rewardXP != null && (
                <Text style={am.rewardXP}>{'  '}+{a.rewardXP} XP</Text>
              )}
            </View>
          )}

        </View>
    </SystemModal>
  );
}


// ── Achievements panel (compact summary — tap to open full modal) ───────────────

function AchievementsPanel({ onOpen, C }: { onOpen: () => void; C: any }) {
  const { t } = useTranslation('screens');
  const ac = getACStyles(C);
  const unlockedIds         = useGameStore(s => s.unlockedAchievements);
  const achievementProgress = useGameStore(s => s.achievementProgress);
  const unlockedSet = new Set(unlockedIds);
  const total    = ACHIEVEMENTS_CATALOG.length;
  const unlocked = ACHIEVEMENTS_CATALOG.filter(a =>
    unlockedSet.has(a.id) || (a.tiers && isAchievementMaxed(a, achievementProgress[a.id]))
  ).length;

  const preview = ACHIEVEMENTS_CATALOG.filter(a =>
    unlockedSet.has(a.id) || (a.tiers && isAchievementMaxed(a, achievementProgress[a.id]))
  ).slice(-5);

  return (
    <TouchableOpacity style={ac.summaryBtn} onPress={onOpen} activeOpacity={0.75}>
      <View style={ac.summaryRow}>
        <Icon name="trophy-outline" size={12} color={C.gold} />
        <Text style={ac.headerTxt}> {t('status.achievements_title')}</Text>
        <View style={[ac.badge, { marginLeft: SPACING.sm }]}>
          <Text style={ac.badgeTxt}>{unlocked}/{total}</Text>
        </View>
        <Icon name="chevron-right" size={16} color={C.muted} style={{ marginLeft: 'auto' }} />
      </View>
      <View style={ac.previewRow}>
        {preview.length > 0 ? preview.map(a => (
          <View key={a.id} style={[ac.previewDot, { backgroundColor: (a.color ?? C.gold) + '22', borderColor: (a.color ?? C.gold) + '66' }]}>
            <SafeIcon name={a.icon} size={14} color={a.color ?? C.gold} />
          </View>
        )) : (
          <Text style={ac.previewEmpty}>{t('status.achievements_empty')}</Text>
        )}
        {unlocked > 5 && (
          <View style={[ac.previewDot, { backgroundColor: C.border, borderColor: C.border }]}>
            <Text style={{ color: C.muted, fontSize: 8, fontFamily: FONT.orbitron }}>+{unlocked - 5}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Achievements full modal ─────────────────────────────────────────────────────

function AchievementsModal({ visible, onClose, onSelect, C }: {
  visible: boolean
  onClose: () => void
  onSelect: (a: Achievement, prog: AchievementProg | undefined, done: boolean) => void
  C: any
}) {
  const ac = getACStyles(C);
  const unlockedIds         = useGameStore(s => s.unlockedAchievements);
  const achievementProgress = useGameStore(s => s.achievementProgress);
  const unlockedSet = new Set(unlockedIds);
  const total    = ACHIEVEMENTS_CATALOG.length;
  const unlocked = ACHIEVEMENTS_CATALOG.filter(a =>
    unlockedSet.has(a.id) || (a.tiers && isAchievementMaxed(a, achievementProgress[a.id]))
  ).length;

  return (
    <SystemModal visible={visible} onRequestClose={onClose}>
      <View style={ac.modalCard}>
        <View style={ac.modalHeader}>
          <Icon name="trophy-outline" size={12} color={C.gold} />
          <Text style={[ac.headerTxt, { flex: 1 }]}> CONQUISTAS</Text>
          <View style={[ac.badge, { marginRight: SPACING.sm }]}>
            <Text style={ac.badgeTxt}>{unlocked}/{total}</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={16} color={C.dimmed} />
          </TouchableOpacity>
        </View>
        <View style={ac.modalDivider} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ac.modalGrid}>
          {ACHIEVEMENTS_CATALOG.map(a => {
            const prog          = achievementProgress[a.id];
            const fullyDone     = unlockedSet.has(a.id) || (a.tiers ? isAchievementMaxed(a, prog) : false);
            const secret        = a.isSecret && !fullyDone && !a.tiers;
            const completedTier = getCompletedTier(a, prog);
            const activeTier    = getActiveTier(a, prog);
            const maxed         = a.tiers ? isAchievementMaxed(a, prog) : fullyDone;
            const displayTier   = maxed ? a.tiers?.[a.tiers.length - 1] : completedTier;
            const cardColor     = a.tiers
              ? (maxed ? C.gold : completedTier ? TIER_COLORS[completedTier.rank] : C.border)
              : (fullyDone ? a.color : C.border);
            const iconColor     = a.tiers
              ? (maxed ? C.gold : completedTier ? TIER_COLORS[completedTier.rank] : C.dimmed)
              : (fullyDone ? a.color : C.dimmed);
            const currentVal  = prog?.currentValue ?? 0;
            const tierIdx     = getTierIndex(prog);
            const prevTarget  = a.tiers && tierIdx > 0 ? a.tiers[tierIdx - 1].targetValue : 0;
            const thisTarget  = activeTier?.targetValue ?? 1;
            const _range = Math.max(1, thisTarget - prevTarget);
            const progressPct = (a.tiers && !maxed && activeTier)
              ? Math.min(100, ((currentVal - prevTarget) / _range) * 100)
              : (maxed ? 100 : 0);

            return (
              <TouchableOpacity
                key={a.id}
                style={[ac.card, { borderColor: cardColor + (fullyDone || completedTier ? '88' : '33') }]}
                onPress={() => onSelect(a, prog, fullyDone)}
                activeOpacity={0.75}
              >
                <View style={[ac.iconWrap, { backgroundColor: iconColor + '18' }]}>
                  <SafeIcon name={secret ? 'help-circle-outline' : a.icon} size={22} color={iconColor} />
                </View>
                {displayTier && (
                  <View style={[ac.tierChip, { borderColor: TIER_COLORS[displayTier.rank] }]}>
                    <Text style={[ac.tierChipTxt, { color: TIER_COLORS[displayTier.rank] }]}>
                      {maxed ? '★' : displayTier.rank.slice(0, 2)}
                    </Text>
                  </View>
                )}
                <Text style={[ac.cardTitle, { color: iconColor }]} numberOfLines={2}>
                  {secret ? '???' : a.title}
                </Text>
                {maxed ? (
                  <Text style={ac.maxTag}>[ MAX ]</Text>
                ) : (
                  <View style={ac.miniTrack}>
                    <View style={[ac.miniFill, {
                      width: `${Math.max(progressPct, 0)}%` as any,
                      backgroundColor: completedTier ? TIER_COLORS[completedTier.rank] : C.neonBlue,
                    }]} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </SystemModal>
  );
}

// ── Level Up Reward Modal ──────────────────────────────────────────────────────

export function LevelUpRewardModal({ visible = true, reward, onClose, C }: { visible?: boolean; reward: LevelUpReward; onClose: () => void; C: any }) {
  const { t } = useTranslation('screens');
  const lm = getLMStyles(C); // Assuming getLMStyles is defined later
  return (
    <SystemModal visible={visible} onRequestClose={onClose}>
      <View style={lm.card}>

          <Text style={lm.title}>{t('status.levelup_title')}</Text>
          <Text style={lm.levelTxt}>{t('status.levelup_level', { level: reward.level })}</Text>

          <View style={lm.divider} />

          {reward.items.length > 0 ? (
            <>
              <Text style={lm.rewardLabel}>{t('status.levelup_reward_label')}</Text>
              {reward.items.map((id, i) => {
                const item = CATALOG_MAP[id];
                if (!item) {return null;}
                return (
                  <View key={i} style={[lm.itemRow, { borderColor: item.color + '44' }]}>
                    <View style={[lm.itemIcon, { backgroundColor: item.color + '22' }]}>
                      <Icon name={item.icon} size={20} color={item.color} />
                    </View>
                    <View style={lm.itemInfo}>
                      <Text style={[lm.itemName, { color: item.color }]}>{item.name}</Text>
                      <Text style={lm.itemDesc} numberOfLines={2}>{item.description}</Text>
                    </View>
                  </View>
                );
              })}
            </>
          ) : (
            <Text style={lm.noReward}>{t('status.levelup_no_reward')}</Text>
          )}

          <TouchableOpacity style={lm.btn} onPress={onClose}>
            <Text style={lm.btnTxt}>{t('status.levelup_continue')}</Text>
          </TouchableOpacity>

      </View>
    </SystemModal>
  );
}

// ── Job Change Modal ───────────────────────────────────────────────────────────
export function JobChangeModal({ visible = true, job, onClose, C }: { visible?: boolean; job: any; onClose: () => void; C: any }) {
  const { t } = useTranslation('screens');
  const lm = getLMStyles(C);
  return (
    <SystemModal visible={visible} onRequestClose={onClose}>
      <View style={[lm.card, { borderColor: job.color + 'aa' }]}>
        <Text style={[lm.title, { color: job.color }]}>{t('status.job_change_title')}</Text>
        <Icon name="medal" size={60} color={job.color} style={{ marginVertical: SPACING.md }} />
        <Text style={lm.rewardLabel}>{t('status.job_change_new_title')}</Text>
        <Text style={[lm.levelTxt, { color: job.color, fontSize: 24, marginTop: 4 }]}>{job.name}</Text>
        <Text style={[lm.itemDesc, { textAlign: 'center', marginTop: SPACING.md }]}>
          {t('status.job_change_system_msg')}
        </Text>
        <TouchableOpacity style={[lm.btn, { backgroundColor: job.color + '22', borderColor: job.color }]} onPress={onClose}>
          <Text style={[lm.btnTxt, { color: job.color }]}>{t('status.job_change_accept')}</Text>
        </TouchableOpacity>
      </View>
    </SystemModal>
  );
}

// ── Calendar helpers (shared between summary and modal) ───────────────────────

function calRewardIcon(r: CalendarReward) {
  if (r.type === 'gold') {return 'rhombus';}
  if (r.type === 'item') {return CATALOG_MAP[r.itemId]?.icon ?? 'gift-outline';}
  return 'ghost';
}
function calRewardColor(r: CalendarReward, C: any) {
  if (r.type === 'gold') {return C.gold;}
  if (r.type === 'item') {return CATALOG_MAP[r.itemId]?.color ?? C.neonBlue;}
  return C.purple;
}
function calRewardLabel(r: CalendarReward) {
  if (r.type === 'gold') {return `+${r.amount}G`;}
  if (r.type === 'item') {
    const item = CATALOG_MAP[r.itemId];
    const name = (item?.name ?? r.itemId).slice(0, 8);
    return r.quantity > 1 ? `${r.quantity}× ${name}` : name;
  }
  const smap = SHADOW_MAP as Record<string, { name: string }>;
  return (smap[r.shadowId]?.name ?? r.shadowId).slice(0, 8);
}

// ── Calendar full modal ────────────────────────────────────────────────────────

function CalendarModal({ visible, onClose, C }: { visible: boolean; onClose: () => void; C: any }) {
  const { t } = useTranslation('screens');
  const cp = getCalStyles(C);
  const calendarState = useGameStore(st => st.calendarState);
  const claimCalendarDay = useGameStore(st => st.claimCalendarDay);
  const extractionDone = useGameStore(st => st.system.extractionDoneToday);

  const { days, page, claimedToday } = calendarState;
  const firstUnclaimed = days.find(d => !d.claimed);
  const canClaim = extractionDone && !claimedToday && !!firstUnclaimed;
  const claimableDay = canClaim ? firstUnclaimed!.day : null;
  const claimedCount = days.filter(d => d.claimed).length;

  return (
    <SystemModal visible={visible} onRequestClose={onClose}>
      <View style={cp.modalCard}>
        {/* Header */}
        <View style={cp.modalHeader}>
          <Icon name="calendar-star" size={14} color={C.gold} />
          <Text style={[cp.title, { flex: 1 }]}> {t('status.calendar_title')}</Text>
          <View style={cp.progressBadge}>
            <Text style={cp.progressTxt}>{claimedCount}/30</Text>
          </View>
          {page > 0 && <Text style={[cp.month, { marginLeft: SPACING.sm }]}>{t('status.calendar_page', { page: page + 1 })}</Text>}
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginLeft: SPACING.sm }}>
            <Icon name="close" size={16} color={C.dimmed} />
          </TouchableOpacity>
        </View>

        <View style={cp.modalDivider} />

        {!extractionDone && (
          <View style={cp.frozenBanner}>
            <Icon name="ghost" size={11} color={C.neonBlue} />
            <Text style={cp.frozenText}>{t('status.calendar_frozen_banner')}</Text>
          </View>
        )}
        {extractionDone && claimedToday && (
          <View style={[cp.frozenBanner, { borderColor: C.green + '44' }]}>
            <Icon name="check-circle" size={11} color={C.green} />
            <Text style={[cp.frozenText, { color: C.green }]}>{t('status.calendar_claimed_today')}</Text>
          </View>
        )}

        {/* Grid */}
        <View style={cp.grid}>
          {days.map(entry => {
            const isClaimed = entry.claimed;
            const isClaimable = entry.day === claimableDay;
            const rc = calRewardColor(entry.reward, C);
            return (
              <TouchableOpacity
                key={entry.day}
                style={[
                  cp.cell,
                  isClaimed && cp.cellClaimed,
                  isClaimable && { borderColor: C.gold + '99', backgroundColor: C.gold + '12' },
                ]}
                onPress={() => isClaimable && claimCalendarDay(entry.day)}
                disabled={!isClaimable}
                activeOpacity={isClaimable ? 0.7 : 1}
              >
                <Text style={[cp.dayNum, isClaimed && { color: C.dimmed }]}>{entry.day}</Text>
                {isClaimed
                  ? <Icon name="check" size={11} color={C.green} />
                  : <Icon name={calRewardIcon(entry.reward)} size={11} color={isClaimable ? rc : C.dimmed} />
                }
                <Text style={[cp.rewardLabel, { color: isClaimed ? C.dimmed : isClaimable ? rc : C.dimmed }]} numberOfLines={1}>
                  {calRewardLabel(entry.reward)}
                </Text>
                {!isClaimed && !isClaimable && (
                  <View style={cp.lockWrap}><Icon name="lock-outline" size={8} color={C.dimmed} /></View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Claim button */}
        {claimableDay ? (
          <TouchableOpacity
            style={[cp.claimBtn, { borderColor: C.gold }]}
            onPress={() => claimCalendarDay(claimableDay)}
            activeOpacity={0.8}
          >
            <Icon name="gift-outline" size={14} color={C.gold} />
            <Text style={[cp.claimBtnTxt, { color: C.gold }]}> {t('status.calendar_claim_day', { day: claimableDay })}</Text>
          </TouchableOpacity>
        ) : claimedCount === 30 ? (
          <View style={[cp.claimBtn, { borderColor: C.green + '66', backgroundColor: C.green + '10' }]}>
            <Icon name="check-circle" size={14} color={C.green} />
            <Text style={[cp.claimBtnTxt, { color: C.green }]}> {t('status.calendar_cycle_complete_badge')}</Text>
          </View>
        ) : null}
      </View>
    </SystemModal>
  );
}

// ── Calendar summary button (compact, opens modal) ────────────────────────────

function CalendarSummaryButton({ onOpen, C }: { onOpen: () => void; C: any }) {
  const { t } = useTranslation('screens');
  const cp = getCalStyles(C);
  const calendarState = useGameStore(st => st.calendarState);
  const extractionDone = useGameStore(st => st.system.extractionDoneToday);

  const { days, claimedToday } = calendarState;
  const firstUnclaimed = days.find(d => !d.claimed);
  const canClaim = extractionDone && !claimedToday && !!firstUnclaimed;
  const claimedCount = days.filter(d => d.claimed).length;
  const nextReward = firstUnclaimed?.reward;

  return (
    <TouchableOpacity style={cp.summaryBtn} onPress={onOpen} activeOpacity={0.75}>
      <View style={cp.summaryRow}>
        <Icon name="calendar-star" size={12} color={C.gold} />
        <Text style={cp.title}> {t('status.calendar_title')}</Text>
        <View style={cp.progressBadge}>
          <Text style={cp.progressTxt}>{claimedCount}/30</Text>
        </View>
        <Icon name="chevron-right" size={16} color={C.muted} style={{ marginLeft: 'auto' }} />
      </View>

      {/* Next reward preview */}
      <View style={cp.summaryPreview}>
        {nextReward ? (
          <View style={cp.nextRewardRow}>
            <Icon name="gift-outline" size={11} color={C.gold} />
            <Text style={cp.nextRewardTxt}>{t('status.calendar_next_reward', { day: firstUnclaimed!.day })}</Text>
            <Icon name={calRewardIcon(nextReward)} size={11} color={calRewardColor(nextReward, C)} />
            <Text style={[cp.nextRewardTxt, { color: calRewardColor(nextReward, C) }]}> {calRewardLabel(nextReward)}</Text>
            {canClaim && (
              <View style={cp.claimBadge}>
                <Text style={cp.claimBadgeTxt}>{t('status.calendar_available')}</Text>
              </View>
            )}
            {!extractionDone && (
              <View style={[cp.claimBadge, { backgroundColor: C.neonBlue + '22', borderColor: C.neonBlue + '55' }]}>
                <Text style={[cp.claimBadgeTxt, { color: C.neonBlue }]}>{t('status.calendar_extract_first')}</Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={[cp.nextRewardTxt, { color: C.green }]}>{t('status.calendar_cycle_complete')}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function StatusScreen() {
  const { t } = useTranslation('screens');
  const C = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);

  const player = useGameStore(st => st.player);
  const statistics         = useGameStore(st => st.statistics);
  const system             = useGameStore(st => st.system);
  const customShadows      = useGameStore(st => st.customShadows);
  const activeShadowIds    = useGameStore(st => st.player.activeShadowIds);
  const activeBuffs         = useGameStore(st => st.activeBuffs);

  const qualifiedRankInfo = getRank(player.level, statistics.totalCompleted, system.bossesDefeated, statistics.questsByRank);
  const playerRankLetter = player.rank || 'E';
  const currentRankInfo = CLASS_REQUIREMENTS.find(r => r.rank === playerRankLetter) || CLASS_REQUIREMENTS[0];

  const currentIdx = CLASS_REQUIREMENTS.findIndex(r => r.rank === currentRankInfo.rank);
  const qualifiedIdx = CLASS_REQUIREMENTS.findIndex(r => r.rank === qualifiedRankInfo.rank);
  const canRankUp = qualifiedIdx > currentIdx;
  const rank = currentRankInfo;
  const jobClass = getJobClass(player.level);

  const xpNeeded = xpForLevel(player.level);
  const xpPct    = Math.min((player.xp / xpNeeded) * 100, 100);

  const [selectedAch, setSelectedAch] = useState<{ a: Achievement; prog: AchievementProg | undefined; done: boolean } | null>(null);
  const [showRankInfo, setShowRankInfo] = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <View style={s.titleRow}>
          <Text style={s.pageTitle}>{t('status.title')}</Text>
        </View>

        {/* Rank card */}
        <View style={[s.rankCard, { borderColor: rank.color + '66' }]}>
          <TouchableOpacity
            style={[s.rankBadge, { borderColor: C.neonBlue }]}
            onPress={() => setShowRankInfo(true)}
            activeOpacity={0.75}
          >
            <Text style={[s.rankBig, { color: rank.color }]}>{rank.rank}</Text>
            {canRankUp && (
              <View style={s.rankUpIndicator}>
                <Text style={s.rankUpIndicatorText}>!</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={s.rankInfo}>
            <Text style={[s.playerName, { maxWidth: '85%' }]} numberOfLines={1} ellipsizeMode="tail">{jobClass.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Text style={s.lvlText}>{t('status.level', { level: player.level })}</Text>
            </View>
          </View>
          <View style={s.goldBlock}>
            <Icon name="rhombus" size={22} color={C.gold} />
            <Text style={s.goldAmt}>{player.gold.toLocaleString()}</Text>
          </View>
        </View>

        {/* Active Buffs Bar */}
        {activeBuffs.length > 0 && (
          <View style={s.buffsBar}>
            {activeBuffs.filter(b => Date.now() < b.expiresAt).map(buff => (
              <View key={buff.id} style={s.buffChip}>
                <Icon name={buff.stat === 'xp' ? 'chevron-double-up' : 'piggy-bank'} size={14} color={C.neonBlue} />
                <Text style={s.buffLabel}>{buff.label}</Text>
                <Text style={s.buffValue}>+{Math.round((buff.multiplier - 1) * 100)}% {buff.stat}</Text>
              </View>
            ))}
          </View>
        )}

        {/* XP bar */}
        <View style={s.xpSection}>
          <View style={s.xpHeader}>
            <Text style={s.xpLabel}>{t('status.xp_label')}</Text>
            <Text style={s.xpNumbers}>{player.xp} / {xpNeeded} XP</Text>
          </View>
          <View style={s.xpTrack}>
            <View style={[s.xpFill, { width: `${xpPct}%` as any }]} />
          </View>
          <Text style={s.xpSub}>{t('status.xp_next', { xp: xpNeeded - player.xp })}</Text>
        </View>

        {/* Attributes */}
        <SectionHeader icon="trending-up" label={t('status.section_attributes')} C={C} />
        <View style={s.statsBlock}>
          <StatBar label="STR" level={player.str} C={C} />
          <StatBar label="AGI" level={player.agi} C={C} />
          <StatBar label="INT" level={player.int} C={C} />
          <StatBar label="VIT" level={player.vit} C={C} />
        </View>

        {/* History */}
        <SectionHeader icon="history" label={t('status.section_history')} C={C} />
        <TouchableOpacity style={s.historyBtn} onPress={() => setShowHistory(true)}>
          <Text style={s.historyBtnTxt}>{t('status.history_btn')}</Text>
          <Icon name="chevron-right" size={18} color={C.neonBlue} />
        </TouchableOpacity>

        {/* Statistics Panel */}
        <StatisticsPanel C={C} />

        {/* Login Calendar — compact button, opens full modal */}
        <CalendarSummaryButton onOpen={() => setShowCalendar(true)} C={C} />

        {/* Achievements Panel */}
        <AchievementsPanel onOpen={() => setShowAchievements(true)} C={C} />

        {/* Shadows Panel — compact vanguard summary */}
        <SectionHeader icon="ghost" label={t('status.section_shadows')} C={C} />
        <View style={s.shadowsBlock}>
          {player.shadows.length === 0 ? (
            <Text style={s.empty}>{t('status.shadows_empty')}</Text>
          ) : (
            <>
              {/* Active vanguard icons */}
              {activeShadowIds.length > 0 ? (
                <View style={s.shadowVanguardRow}>
                  {activeShadowIds.map(id => {
                    const data = SHADOW_MAP[id as keyof typeof SHADOW_MAP] ?? customShadows.find(cs => cs.id === id);
                    if (!data) {return null;}
                    const rankColor = SHADOW_RANK_COLOR[data.rank as keyof typeof SHADOW_RANK_COLOR] ?? C.purple;
                    return (
                      <View key={id} style={[s.shadowVanguardCard, { borderColor: rankColor + '55' }]}>
                        <Icon name={data.icon || 'ghost'} size={20} color={rankColor} />
                        <Text style={[s.shadowVanguardName, { color: rankColor }]} numberOfLines={2}>{data.name}</Text>
                        <View style={[s.shadowVanguardEffect, { borderColor: rankColor + '33', backgroundColor: rankColor + '10' }]}>
                          <Text style={[s.shadowVanguardEffectTxt, { color: rankColor }]} numberOfLines={2}>
                            {data.passiveEffect?.description ?? ''}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <Text style={s.shadowHint}>{t('status.shadows_no_vanguard')}</Text>
              )}
              {/* Army count + hint */}
              <Text style={s.shadowCount}>
                {player.shadows.length === 1 ? t('status.shadows_count_singular', { count: 1 }) : t('status.shadows_count_plural', { count: player.shadows.length })}{t('status.shadows_vanguard_count', { active: activeShadowIds.length })}
              </Text>
            </>
          )}
        </View>

      </ScrollView>

      {/* Modals */}
      <AchievementsModal
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
        onSelect={(a, pr, d) => { setShowAchievements(false); setSelectedAch({ a, prog: pr, done: d }); }}
        C={C}
      />

      {selectedAch && (
        <AchievementDetailModal
          achievement={selectedAch.a}
          prog={selectedAch.prog}
          done={selectedAch.done}
          onClose={() => setSelectedAch(null)}
          C={C}
        />
      )}

      <RankModal
        visible={showRankInfo}
        level={player.level}
        totalCompleted={statistics.totalCompleted}
        bossesDefeated={system.bossesDefeated}
        questsByRank={statistics.questsByRank}
        onClose={() => setShowRankInfo(false)}
        C={C}
      />



      <MissionHistoryModal visible={showHistory} onClose={() => setShowHistory(false)} C={C} />

      <CalendarModal visible={showCalendar} onClose={() => setShowCalendar(false)} C={C} />

      {/* Modals are now handled globally in App.tsx rewardsQueue */}

    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: C.bg },
  content:    { padding: SPACING.md, paddingBottom: SPACING.xl },
  titleRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  pageTitle:  { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },
  rankCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderRadius: 4, padding: SPACING.md, gap: 12, marginBottom: 12 },
  rankBadge:  { width: 52, height: 52, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rankBig:    { fontSize: 28, fontFamily: FONT.orbitron, fontWeight: '900' },
  rankUpIndicator: { position: 'absolute', top: -6, right: -6, backgroundColor: C.neonRed, borderRadius: 12, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.muted },
  rankUpIndicatorText: { color: C.muted, fontSize: 13, fontFamily: FONT.orbitron, fontWeight: '900' },
  rankInfo:   { flex: 1 },
  playerName: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 14, fontWeight: '700' },
  rankLabel:  { fontSize: 13, fontFamily: FONT.orbitron, fontWeight: '700', letterSpacing: 1 },
  buffsBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingHorizontal: 4 },
  buffChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.panel, borderWidth: 1, borderColor: C.neonBlue + '44', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  buffLabel: { color: C.muted, fontSize: 10, fontFamily: FONT.orbitron },
  buffValue: { color: C.neonBlue, fontSize: 10, fontWeight: '700', fontFamily: FONT.orbitron },
  lvlText:    { color: C.muted, fontSize: 11, marginTop: 2 },
  goldBlock:  { alignItems: 'center', gap: 2 },
  goldAmt:    { color: C.gold, fontWeight: '700', fontSize: 14 },

  xpSection:  { marginBottom: SPACING.lg },
  xpHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel:    { color: C.text.primary, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  xpNumbers:  { color: C.muted, fontSize: 10 },
  xpTrack:    { height: 8, backgroundColor: C.bg, borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: C.neonBlue + '30' },
  xpFill:     { height: '100%', backgroundColor: C.neonBlue, borderRadius: 0 },
  xpSub:      { color: C.dimmed, fontSize: 10, marginTop: 4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, marginTop: 4 },
  sectionTitle:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },

  statsBlock: { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, borderWidth: 1, borderColor: C.border, marginBottom: SPACING.lg },
  statRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 12 },
  statIcon:   { width: 20 },
  statInfo:   { flex: 1 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  statLabel:  { fontFamily: FONT.orbitron, fontSize: 11 },
  track:      { height: 4, backgroundColor: C.bg, borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  fill:       { height: '100%', borderRadius: 0 },
  statVal:    { color: C.muted, fontSize: 12, fontFamily: FONT.orbitron, fontWeight: '700' },

  shadowsBlock:           { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, borderWidth: 1, borderColor: C.purple + '33', marginBottom: SPACING.lg, gap: SPACING.sm },
  shadowVanguardRow:      { flexDirection: 'row', gap: SPACING.sm },
  shadowVanguardCard:     { flex: 1, backgroundColor: C.bg, borderWidth: 1, borderRadius: 4, padding: SPACING.sm, alignItems: 'center', gap: 6 },
  shadowVanguardName:     { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 0.5, textAlign: 'center', lineHeight: 13 },
  shadowVanguardEffect:   { borderWidth: 1, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 3, width: '100%' },
  shadowVanguardEffectTxt:{ fontFamily: FONT.orbitron, fontSize: 7, textAlign: 'center', lineHeight: 11 },
  shadowHint:             { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9 },
  shadowCount:            { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5, marginTop: 4 },

  empty:  { color: C.dimmed, fontSize: 12, fontStyle: 'italic', marginBottom: SPACING.lg },

  historyBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.neonBlue + '44', borderRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: 10, marginBottom: SPACING.lg },
  historyBtnTxt: { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
});

const getKPIStyles = (C: any) => StyleSheet.create({
  card:  { flex: 1, backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.sm, alignItems: 'center', gap: 4 },
  value: { fontFamily: FONT.orbitron, fontSize: 18, fontWeight: '900', color: C.text.primary },
  label: { color: C.text.secondary, fontSize: 10, fontFamily: FONT.orbitron, letterSpacing: 1 },
});


const getSPStyles = (C: any) => StyleSheet.create({
  container:    { marginBottom: SPACING.lg },
  kpiRow:       { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  rankSection:  { backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.border, padding: SPACING.md },
  rankTitle:    { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, marginBottom: SPACING.md },
  rankGrid:     { gap: SPACING.sm },
  rankItem:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rankBadge:    { width: 28, height: 28, borderRadius: 2, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rankLetter:   { fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '900' },
  rankBarTrack: { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 0, overflow: 'hidden' },
  rankBarFill:  { height: '100%', borderRadius: 0, minWidth: 2 },
  rankCount:    { color: C.muted, fontSize: 12, fontFamily: FONT.orbitron, width: 28, textAlign: 'right' },
});

const getACStyles = (C: any) => StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  header:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  headerTxt: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  badge:     { backgroundColor: C.neonBlue + '22', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.neonBlue + '44' },
  badgeTxt:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9 },
  grid:      { gap: SPACING.sm, paddingBottom: 4, paddingRight: 4 },
  card:      {
    width: 80, backgroundColor: C.panel, borderRadius: 4, borderWidth: 1,
    padding: SPACING.sm, alignItems: 'center', gap: 6,
  },
  iconWrap:  { width: 44, height: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  cardTitle:  { fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5, textAlign: 'center', lineHeight: 11 },
  cardGold:   { fontFamily: FONT.orbitron, fontSize: 8, fontWeight: '700' },
  miniTrack:  { width: '100%', height: 3, backgroundColor: C.bg, borderRadius: 0, overflow: 'hidden', marginTop: 2 },
  miniFill:   { height: '100%', backgroundColor: C.neonBlue, borderRadius: 0 },
  tierChip:   { borderWidth: 1, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  tierChipTxt:{ fontFamily: FONT.orbitron, fontSize: 6, letterSpacing: 0.5, fontWeight: '700' },
  maxTag:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1 },

  // Compact summary panel
  summaryBtn:   { backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.border, padding: SPACING.md, marginBottom: SPACING.lg },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  previewRow:   { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  previewDot:   { width: 28, height: 28, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  previewEmpty: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9 },

  // Full achievements modal
  modalCard:    { width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.lg },
  modalHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  modalDivider: { height: 1, backgroundColor: C.border, marginBottom: SPACING.md },
  modalGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, paddingBottom: SPACING.md },
});

const getAMStyles = (C: any) => StyleSheet.create({
  card:          { width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.lg, alignItems: 'center' },
  headerRow:     { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: SPACING.md },
  headerLabel:   { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  closeBtn:      { padding: 4 },
  iconWrap:      { width: 72, height: 72, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  title:         { fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '700', letterSpacing: 1, textAlign: 'center', flex: 1 },
  badgesRow:     { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap', justifyContent: 'center' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.neonBlue + '44', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  categoryTxt:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1 },
  divider:       { width: '100%', height: 1, backgroundColor: C.border, marginBottom: SPACING.md },
  desc:          { color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: SPACING.md },
  titleRow:      { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  tierBadge:     { borderWidth: 1, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  tierTxt:       { fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1 },
  progSection:   { width: '100%', marginBottom: SPACING.md },
  progHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progLabel:     { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 2 },
  progNums:      { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9 },
  progTrack:     { height: 6, backgroundColor: C.bg, borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: C.neonBlue + '30' },
  progFill:      { height: '100%', borderRadius: 0 },
  rewardRow:     { flexDirection: 'row', alignItems: 'center' },
  rewardTxt:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '700' },
  rewardXP:      { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12 },

  tiersSection:  { width: '100%', marginBottom: SPACING.md },
  tierRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 5, paddingHorizontal: SPACING.sm, borderRadius: 3, marginBottom: 2 },
  tierDot:       { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tierRowRank:   { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1, fontWeight: '700', width: 56 },
  tierRowTarget: { flex: 1, fontFamily: FONT.orbitron, fontSize: 9 },
  tierRowReward: { fontFamily: FONT.orbitron, fontSize: 8 },
  maxLabel:      { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, textAlign: 'center', marginTop: 4 },
});

const getCalStyles = (C: any) => StyleSheet.create({
  // Shared
  title:        { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  month:        { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 8 },
  progressBadge:{ backgroundColor: C.gold + '22', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.gold + '44' },
  progressTxt:  { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9 },
  frozenBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.neonBlue + '12', borderWidth: 1, borderColor: C.neonBlue + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  frozenText:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 8, flex: 1 },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: SPACING.sm },
  cell:         { width: '18%', backgroundColor: C.bg, borderRadius: 4, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 2, position: 'relative', minHeight: 56 },
  cellClaimed:  { borderColor: C.green + '33', backgroundColor: C.green + '08', opacity: 0.55 },
  dayNum:       { color: C.muted, fontFamily: FONT.orbitron, fontSize: 8, fontWeight: '900', marginBottom: 2 },
  rewardLabel:  { fontFamily: FONT.orbitron, fontSize: 6, marginTop: 2, textAlign: 'center' },
  lockWrap:     { position: 'absolute', bottom: 2, right: 3 },
  claimBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 4, paddingVertical: 10, gap: SPACING.sm, backgroundColor: C.gold + '10' },
  claimBtnTxt:  { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  // Summary button
  summaryBtn:     { backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.border, padding: SPACING.md, marginBottom: SPACING.lg },
  summaryRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  summaryPreview: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
  nextRewardRow:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 },
  nextRewardTxt:  { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9 },
  claimBadge:     { backgroundColor: C.gold + '22', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: C.gold + '55', marginLeft: SPACING.sm },
  claimBadgeTxt:  { color: C.gold, fontFamily: FONT.orbitron, fontSize: 7, fontWeight: '900' },

  // Full modal
  modalCard:      { width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.lg },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  modalDivider:   { height: 1, backgroundColor: C.border, marginBottom: SPACING.md },
});

const getLMStyles = (C: any) => StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: C.bg + 'ee', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:      { width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.neonBlue + '55', padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm },
  title:     { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 4 },
  levelTxt:  { color: C.muted, fontFamily: FONT.orbitron, fontSize: 28, fontWeight: '900' },
  divider:   { width: '100%', height: 1, backgroundColor: C.border },
  rewardLabel: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, textAlign: 'center', alignSelf: 'center' },
  itemRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, padding: SPACING.sm, gap: SPACING.sm, width: '100%' },
  itemIcon:  { width: 40, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  itemInfo:  { flex: 1 },
  itemName:  { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  itemDesc:  { color: C.muted, fontSize: 11, lineHeight: 15 },
  noReward:  { color: C.dimmed, fontSize: 11, textAlign: 'center' },
  btn:       { marginTop: SPACING.sm, borderWidth: 1, borderColor: C.neonBlue + '66', borderRadius: 4, paddingVertical: 10, paddingHorizontal: SPACING.xl },
  btnTxt:    { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
});
