import type { GameState, GameActions, StoreRef, TriggerPayload } from './types';
import { ACHIEVEMENTS_MAP, ACHIEVEMENTS_CATALOG } from '../data/achievements';
import type { AchievementProg, AchievementTier, EventTrigger } from '../data/achievements';
import { SHADOW_BY_ACHIEVEMENT } from '../data/shadows';
import { getRank, applyXP, CLASS_REQUIREMENTS } from './helpers';
import { APP_THEMES } from '../theme';
import type { ThemeDef } from '../data/themes';

// ── Achievement Evaluation ───────────────────────────────────────────────────

export function evaluateAchievementCondition(
  achievementId: string,
  state: GameState,
  payload: TriggerPayload,
  time: { hour: number; minute: number },
): boolean {
  const { player, statistics, system } = state;
  const { hour, minute } = time;

  switch (achievementId) {
    // Streak
    case 'streak_phoenix': {
      const prev = Number(payload.prevStreak ?? 0);
      return player.currentStreak >= 3 && prev > 10;
    }
    case 'streak_scroll_save': return player.currentStreak >= 7;

    // Focus
    case 'focus_night_owl': return hour >= 1 && hour < 6;
    case 'focus_hardcore_surrender': return true;
    case 'focus_crimson_knight': return payload.missionId === 'boss_focus';
    case 'focus_long_session': return Number(payload.minutes ?? 0) >= 120;

    // Boss
    case 'boss_runner': return payload.missionId === 'boss_gps';
    case 'boss_cerberus': return payload.missionId === 'boss_training';
    case 'boss_omega_slayer': return payload.missionId === 'boss_crypt_omega';
    case 'boss_eclipse_survivor': return payload.missionId === 'boss_astral_eclipse';
    case 'boss_seraph_fall': return payload.missionId === 'boss_seraphim';
    case 'boss_archlich_prime': return payload.missionId === 'boss_archlich_prime';
    case 'boss_soul_reaper': return payload.missionId === 'boss_soul_reaper';
    case 'boss_astral_nebula': return payload.missionId === 'boss_astral_nebula';

    // Event bosses
    case 'event_halloween_reaper': return payload.missionId === 'event_halloween_reaper';
    case 'event_winter_lich': return payload.missionId === 'event_winter_lich';
    case 'event_summer_titan': return payload.missionId === 'event_summer_titan';
    case 'event_new_year_ashen': return payload.missionId === 'event_new_year_ashen';
    case 'event_valentine_oath': return payload.missionId === 'event_valentine_oath';
    case 'event_carnival_mask': return payload.missionId === 'event_carnival_mask';
    case 'event_equinox_guardian': return payload.missionId === 'event_equinox_guardian';
    case 'event_easter_hare': return payload.missionId === 'event_easter_hare';
    case 'event_spring_bloom': return payload.missionId === 'event_spring_bloom';
    case 'event_harvest_king': return payload.missionId === 'event_harvest_king';
    case 'event_black_friday_merchant': return payload.missionId === 'event_black_friday_merchant';
    case 'event_yule_seraph': return payload.missionId === 'event_yule_seraph';
    case 'event_midnight_wraith': return payload.missionId === 'event_midnight_wraith';
    case 'event_festival_drake': return payload.missionId === 'event_festival_drake';

    // Quests
    case 'quests_perfect_week': return (statistics.perfectDaysStreak ?? 0) >= 7 && Boolean(payload.afterPerfectDay);
    case 'side_quest_first': return true;
    case 'side_quest_daily_five': return (statistics.sideQuestsCompletedToday ?? 0) >= 5;

    // Economy
    case 'economy_first_purchase': return true;
    case 'economy_system_pass': return payload.itemId === 'system_pass';
    case 'economy_lagrima_clutch': return system.hasPenalty;
    case 'economy_reloj': return Boolean(payload.duringBoss);
    case 'economy_hoarder': return false;
    case 'economy_spender': return false;

    // Clutch / time
    case 'clutch_last_minute': {
      const minsLeft = (23 * 60 + 59) - (hour * 60 + minute);
      return minsLeft <= 30 && minsLeft >= 0 && Boolean(payload.isLastQuest);
    }
    case 'clutch_late_night': return hour === 23 && minute >= 30 && Boolean(payload.isLastQuest);
    case 'clutch_undo_redo': return true;
    case 'dawn_warrior': return hour < 7;

    // Rebellion
    case 'rebellion_spam': return true;
    case 'rebellion_resist': return true;
    case 'rebellion_c_rank': return payload.rank === 'C';

    // Penalty
    case 'penalty_first': return true;
    case 'penalty_cleared': return true;
    case 'penalty_comeback': return Boolean(payload.afterPenalty);
    case 'penalty_veteran': return (state.system.consecutiveFails ?? 0) >= 5;

    // Secret
    case 'secret_first_day': return Boolean(payload.firstDay) && statistics.perfectDays === 0;
    case 'secret_all_bosses': return false;
    case 'shadow_elite': return false;
    case 'secret_monarch': return false;

    case 'shadow_collector_10': return player.shadows.length >= 10;
    case 'perfect_week_1': return (statistics.perfectDaysStreak ?? 0) >= 7 && Boolean(payload.afterPerfectDay);
    case 'level_50_milestone': return player.level >= 50;
    case 'boss_slayer_20': return state.statistics.totalBossesCompleted >= 20 || system.bossesDefeated >= 20;
    case 'dungeon_master_50': return state.statistics.totalBossesCompleted >= 50 || system.bossesDefeated >= 50;

    default: return false;
  }
}

// ── Action Helpers ────────────────────────────────────────────────────────────

export function unlockAchievements(ids: string[], { get, set }: StoreRef) {
  if (ids.length === 0) {return;}
  const totalGold = ids.reduce((sum, id) => sum + (ACHIEVEMENTS_MAP[id]?.rewardGold ?? 0), 0);
  const totalXP = ids.reduce((sum, id) => sum + (ACHIEVEMENTS_MAP[id]?.rewardXP ?? 0), 0);

  // Collect any achievement-unlocked shadows not yet owned
  const currentShadows = get().player.shadows;
  const shadowRewards = ids
    .map(id => SHADOW_BY_ACHIEVEMENT[id])
    .filter((sh): sh is NonNullable<typeof sh> =>
      Boolean(sh) && !currentShadows.some(e => e.id === sh.id)
    );

  set((s: GameState & GameActions) => {
    let { xp, level } = s.player;
    let leveledUp = false;
    let isNewLevel = false;
    if (totalXP > 0) {
      const res = applyXP(xp, level, totalXP);
      xp = res.xp; level = res.level;
      leveledUp = res.leveledUp;
      isNewLevel = level > s.player.maxLevelReached;
    }
    const newShadows = shadowRewards.map(sh => ({ id: sh.id, level: 1 }));

    // Add achievements to rewards queue
    const achievementRewards = ids.map(id => ({ type: 'achievement' as const, id }));
    // Add shadow rewards to queue
    const shadowRewardsQueue = shadowRewards.map(sh => ({ type: 'shadow' as const, id: sh.id, isLevelUp: false, newLevel: 1 }));

    return {
      rewardsQueue: [
        ...s.rewardsQueue,
        ...achievementRewards,
        ...shadowRewardsQueue,
        ...(leveledUp && level % 5 === 0 ? [{ type: 'level_up' as const, id: String(level), data: { level, items: [] } }] : []),
      ],
      unlockedAchievements: [...s.unlockedAchievements, ...ids],
      ...(leveledUp && isNewLevel ? { levelUpReward: { level, items: [] } } : {}),
      player: {
        ...s.player,
        gold: s.player.gold + totalGold,
        xp, level,
        shadows: [...s.player.shadows, ...newShadows],
        maxLevelReached: isNewLevel ? level : s.player.maxLevelReached,
      },
    };
  });
}

export function checkAndUnlockThemes(ref: StoreRef) {
  const state = ref.get();
  const p = state.player;
  const currentRankInfo = getRank(p.level, state.statistics.totalCompleted, state.system.bossesDefeated, state.statistics.questsByRank);

  const rankIndex = CLASS_REQUIREMENTS.findIndex(r => r.rank === currentRankInfo.rank);
  const newlyUnlocked = [...(p.unlockedThemes || ['theme_e_rank'])];
  let hasNew = false;

  APP_THEMES.forEach((theme: ThemeDef) => {
    if (theme.unlockRank && !newlyUnlocked.includes(theme.id)) {
      const themeRankIdx = CLASS_REQUIREMENTS.findIndex(r => r.rank === theme.unlockRank);
      if (themeRankIdx !== -1 && rankIndex >= themeRankIdx) {
        newlyUnlocked.push(theme.id);
        hasNew = true;
      }
    }
  });

  if (hasNew) {
    ref.set((s: GameState & GameActions) => ({ player: { ...s.player, unlockedThemes: newlyUnlocked } }));
  }
}

export function getStateValueForTrigger(event: EventTrigger, state: GameState): number | null {
  switch (event) {
    case 'boss_defeated': return state.system.bossesDefeated;
    case 'focus_total_hours': return state.statistics.totalFocusMinutes;
    case 'all_quests_completed': return state.statistics.perfectDays;
    case 'streak_updated': return state.player.currentStreak;
    case 'level_up': return state.player.level;
    case 'shadow_collected': return state.player.shadows.length;
    default: return null;
  }
}

export function isFullyDone(a: { id: string; tiers?: AchievementTier[] }, state: GameState): boolean {
  if (state.unlockedAchievements.includes(a.id)) {return true;}
  if (!a.tiers) {return false;}
  const prog = state.achievementProgress[a.id];
  if (!prog) {return false;}
  return prog.currentTierIndex >= a.tiers.length;
}

export function progressAchievements(event: EventTrigger, value: number, ref: StoreRef, useLiveValue = false) {
  const { set } = ref;

  set((s: GameState & GameActions) => {
    const nextProgress = { ...s.achievementProgress };
    let anyUnlocked = false;
    const unlockedInThisPass: string[] = [];
    let totalGold = 0;
    let totalXP = 0;
    const notifyIds: string[] = [];

    const candidates = ACHIEVEMENTS_CATALOG.filter(
      a => a.tiers != null && a.conditionType === event && !isFullyDone(a, s)
    );

    if (candidates.length === 0) {return {};}

    const stateValue = getStateValueForTrigger(event, s);

    for (const a of candidates) {
      const raw = s.achievementProgress[a.id];
      const prog: AchievementProg = (raw && typeof raw === 'object' && 'currentTierIndex' in raw)
        ? raw
        : { currentValue: 0, currentTierIndex: 0 };

      let { currentValue, currentTierIndex } = prog;
      const newValue = useLiveValue
        ? (stateValue !== null ? stateValue : currentValue)
        : currentValue + value;

      let idx = currentTierIndex;
      while (idx < a.tiers!.length && newValue >= a.tiers![idx].targetValue) {
        const tier = a.tiers![idx];
        totalGold += tier.rewardGold;
        totalXP += tier.rewardXP ?? 0;
        if (!notifyIds.includes(a.id)) {notifyIds.push(a.id);}
        idx++;
      }

      nextProgress[a.id] = { currentValue: newValue, currentTierIndex: idx };
      if (idx >= a.tiers!.length) {
        unlockedInThisPass.push(a.id);
        anyUnlocked = true;
      }
    }

    let { xp, level } = s.player;
    let leveledUp = false;
    let isNewLevel = false;
    if (totalXP > 0) {
      const res = applyXP(xp, level, totalXP);
      xp = res.xp; level = res.level;
      leveledUp = res.leveledUp;
      isNewLevel = level > s.player.maxLevelReached;
    }

    // Add tier notifications to queue
    const tierRewards = notifyIds.map(id => ({ type: 'achievement' as const, id }));

    return {
      achievementProgress: nextProgress,
      unlockedAchievements: anyUnlocked ? [...s.unlockedAchievements, ...unlockedInThisPass] : s.unlockedAchievements,
      rewardsQueue: [...s.rewardsQueue, ...tierRewards],
      ...(leveledUp && isNewLevel ? { levelUpReward: { level, items: [] } } : {}),
      player: (totalGold > 0 || totalXP > 0) ? {
        ...s.player,
        gold: s.player.gold + totalGold,
        xp,
        level,
        maxLevelReached: isNewLevel ? level : s.player.maxLevelReached,
      } : s.player,
    };
  });
}

export function checkAndUnlockAchievements(ref: StoreRef) {
  checkAndUnlockThemes(ref);
  const { player, statistics, unlockedAchievements } = ref.get();

  const conditions: Record<string, boolean> = {
    economy_hoarder: player.gold >= 5000,
    economy_spender: (statistics.totalGoldSpent ?? 0) >= 3000,
    secret_monarch: player.level >= 20,
    shadow_elite: player.activeShadowIds.length >= 3,
    secret_all_bosses: ['boss_runner', 'boss_cerberus', 'focus_crimson_knight', 'boss_omega_slayer', 'boss_eclipse_survivor', 'boss_seraph_fall']
      .every(id => unlockedAchievements.includes(id)),
  };

  const newlyUnlocked = Object.entries(conditions)
    .filter(([id, met]) => met && !unlockedAchievements.includes(id))
    .map(([id]) => id);

  unlockAchievements(newlyUnlocked, ref);

  // Sync all tiered achievements backed by live state values
  progressAchievements('streak_updated', 1, ref, true);
  progressAchievements('level_up', 1, ref, true);
  progressAchievements('shadow_collected', 1, ref, true);
  progressAchievements('boss_defeated', 1, ref, true);
  progressAchievements('focus_total_hours', 1, ref, true);
  progressAchievements('all_quests_completed', 1, ref, true);
}

export function fireEvent(event: EventTrigger, payload: TriggerPayload = {}, ref: StoreRef, value: number = 1) {
  const state = ref.get();
  const now = new Date();
  const time = { hour: now.getHours(), minute: now.getMinutes() };

  // Instant (non-tiered) achievements
  const candidates = ACHIEVEMENTS_CATALOG.filter(
    a => !a.tiers && a.conditionType === event && !state.unlockedAchievements.includes(a.id)
  );
  if (candidates.length > 0) {
    const toUnlock = candidates
      .filter(a => evaluateAchievementCondition(a.id, state, payload, time))
      .map(a => a.id);
    unlockAchievements(toUnlock, ref);
  }

  // Tiered achievements
  progressAchievements(event, value, ref);
}
