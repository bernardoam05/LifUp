import './src/i18n';
import React, { useEffect, useState, useCallback, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, StatusBar, NativeModules, TouchableOpacity, Vibration, Animated, AppState } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore from './src/store/useGameStore';
import { setupNotifications, requestNotificationPermission } from './src/utils/notifications';
import { initializeAudio } from './src/utils/audioService';
import { SHADOW_MAP } from './src/data/shadows';
import RankModal from './src/components/RankModal';
import ExtractionModal from './src/components/ExtractionModal';
import LevelUpModal from './src/components/LevelUpModal';
import BossVictoryModal from './src/components/BossVictoryModal';


import LevelUpToast from './src/components/LevelUpToast';

import StatusScreen from './src/screens/StatusScreen';
import QuestScreen from './src/screens/QuestScreen';
import ShopScreen from './src/screens/ShopScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import FocusScreen from './src/screens/FocusScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { C, FONT, SPACING } from './src/theme';
import { useDayWatcher } from './src/hooks/useDayWatcher';

import AchievementModal from './src/components/AchievementModal';
import { JobChangeModal } from './src/screens/StatusScreen';
import TutorialOverlay from './src/components/TutorialOverlay';
import PenaltyModal from './src/components/PenaltyModal';
import SystemHUD from './src/components/SystemHUD';
import { LootBoxModal } from './src/components/LootBoxModal';

/* eslint-disable react/no-unstable-nested-components */

const Tab = createMaterialTopTabNavigator();

const TAB_ICONS: Record<string, string> = {
  'Missões': 'clipboard-list-outline',
  'Status': 'sword-cross',
  'Loja': 'shopping-outline',
  'Inventário': 'bag-personal',
  'Focus': 'brain',
};

const navigationRef = createNavigationContainerRef<any>();
const { FocusBlocker } = NativeModules;

function PenaltyBadge() {
  return (
    <View style={styles.penaltyBadge}>
      <Text style={styles.penaltyBadgeText}>!</Text>
    </View>
  );
}

function ShadowSkillToast({ msg, blocked = false, onDismiss }: { msg: string | null; blocked?: boolean; onDismiss: () => void }) {
  const anim = React.useRef(new Animated.Value(120)).current;
  React.useEffect(() => {
    // While blocked (a native Modal is covering the toast layer) keep the message
    // queued and only animate/dismiss once unblocked, so it is never lost unseen.
    if (!msg || blocked) { anim.setValue(120); return; }
    Animated.spring(anim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 120, duration: 300, useNativeDriver: true }).start(() => onDismiss());
    }, 4000);
    return () => clearTimeout(t);
  }, [msg, blocked]);

  if (!msg || blocked) { return null; }
  return (
    <Animated.View style={{ position: 'absolute', bottom: 90, left: 16, right: 16, transform: [{ translateY: anim }] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f1a2e', borderWidth: 1, borderColor: '#a855f744', borderRadius: 8, padding: 12, gap: 10 }}>
        <Icon name="shield-star" size={18} color="#a855f7" />
        <Text style={{ flex: 1, color: '#e2e8f0', fontSize: 12, fontFamily: FONT.orbitron }}>{msg}</Text>
        <TouchableOpacity onPress={onDismiss}>
          <Icon name="close" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function InventoryBadge({ count }: { count: number }) {
  return (
    <View style={styles.inventoryBadge}>
      <Text style={styles.inventoryBadgeText}>{count}</Text>
    </View>
  );
}

// ── App Root ───────────────────────────────────────────────────────────────────

export default function App() {
  const { t } = useTranslation('common');
  const levelUpToastQueue = useGameStore(s => s.levelUpToastQueue);
  const dismissLevelUpToast = useGameStore(s => s.dismissLevelUpToast);
  const shadowSkillFiredMsg = useGameStore(s => s.system.shadowSkillFiredMsg);
  const dismissShadowSkillMsg = useGameStore(s => s.dismissShadowSkillMsg);
  const currentLootReward = useGameStore(s => s.currentLootReward);
  const dismissLootReward = useGameStore(s => s.dismissLootReward);
  const missionModalOpen = useGameStore(s => s.missionModalOpen);

  const focusActive = useGameStore(s => s.system.focusModeActive);
  const focusEndTime = useGameStore(s => s.system.focusEndTime);
  const setFocusActive = useGameStore(s => s.setFocusModeActive);

  const bootSystem = useGameStore(s => s.bootSystem);
  const hasPenalty = useGameStore(s => s.system.hasPenalty);
  const penaltyBlockStart = useGameStore(s => s.system.penaltyBlockStart);
  const penaltyBlockEnd = useGameStore(s => s.system.penaltyBlockEnd);
  const blockedApps = useGameStore(s => s.system.blockedApps);
  const autoBlockApps = useGameStore(s => s.settings.autoBlockApps);
  const penaltyTriggered = useGameStore(s => s.system.penaltyTriggered);
  const dismissPenalty = useGameStore(s => s.dismissPenaltyModal);
  const inventory = useGameStore(s => s.player.inventory);
  const invTotal = inventory.filter(e => e.quantity > 0).reduce((sum, e) => sum + e.quantity, 0);
  const rewardsQueue = useGameStore(s => s.rewardsQueue);
  const popReward = useGameStore(s => s.popReward);
  const customShadows = useGameStore(s => s.customShadows);
  const tutorialPhase = useGameStore(s => s.system.tutorialPhase);
  const advanceTutorial = useGameStore(s => s.advanceTutorialPhase);

  const [showSettings, setShowSettings] = useState(false);
  const [showRankInfo, setShowRankInfo] = useState(false);
  const [penaltyCountdown, setPenaltyCountdown] = useState('');

  useEffect(() => {
    if (!hasPenalty || !penaltyBlockEnd || penaltyBlockEnd <= Date.now()) {
      setPenaltyCountdown('');
      return;
    }
    let id: ReturnType<typeof setInterval>;
    const update = () => {
      const ms = penaltyBlockEnd - Date.now();
      if (ms <= 0) { setPenaltyCountdown(''); clearInterval(id); return; }
      const h = Math.floor(ms / 3_600_000);
      const m = Math.floor((ms % 3_600_000) / 60_000);
      setPenaltyCountdown(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    id = setInterval(update, 30_000);
    const sub = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(id); sub.remove(); };
  }, [hasPenalty, penaltyBlockEnd]);
  const statistics = useGameStore(s => s.statistics);
  const bossesDefeated = useGameStore(s => s.system.bossesDefeated);
  const playerLevel = useGameStore(s => s.player.level);
  // missionModalOpen excluded from rewards: reward modals stack on top of mission modals.
  const rewardsBlocked = penaltyTriggered || showSettings || showRankInfo || !!currentLootReward;
  // Toasts are plain Views (not native Modals) so any open Modal hides them —
  // defer them while a mission modal or reward is on screen instead of losing them.
  const toastBlocked = rewardsBlocked || rewardsQueue.length > 0 || missionModalOpen;

  // Latch: once a reward starts showing, keep it until explicitly dismissed
  type RewardItem = typeof rewardsQueue[0];
  const [activeReward, setActiveReward] = useState<RewardItem | null>(null);

  useEffect(() => {
    if (!rewardsBlocked && rewardsQueue.length > 0 && !activeReward) {
      setActiveReward(rewardsQueue[0]);
    }
  }, [rewardsBlocked, rewardsQueue.length, activeReward]);

  const handlePopReward = useCallback(() => {
    setActiveReward(null);
    popReward();
  }, [popReward]);

  // Register the midnight reset watcher
  useDayWatcher();

  // Decide if tutorial should run
  const activeTutorialPhase = tutorialPhase === 0 ? 1 : (tutorialPhase === 1 && playerLevel >= 10 ? 2 : null);

  useEffect(() => {
    bootSystem();
    initializeAudio().catch((err: any) => { console.warn('[App] Audio init failed:', err?.message ?? err); });
    setupNotifications()
      .then(() => requestNotificationPermission())
      .catch((err: any) => { console.warn('[App] Notifications setup failed:', err?.message ?? err); });

    // Sync RN store with native focus state — handles Quick Settings Tile toggles
    // made while the app was closed (tile writes to FocusBlockerPrefs directly).
    FocusBlocker?.getFocusNativeState?.()
      .then((native: any) => {
        const { system } = useGameStore.getState();
        const nativeActive = native?.isRunning && native?.endTimeMs > Date.now();
        if (nativeActive && !system.focusModeActive) {
          useGameStore.getState().setFocusModeActive(true, native.endTimeMs);
          useGameStore.getState().setHardcoreFocusMode(native.isHardcoreMode ?? true);
        } else if (!nativeActive && system.focusModeActive && !system.hasPenalty) {
          useGameStore.getState().setFocusModeActive(false, 0);
          useGameStore.getState().setHardcoreFocusMode(false);
        }
      })
      .catch(() => {});
  }, [bootSystem]);


  // Unified Background Service Sync: Restores Focus Blocker if killed by OS/Force Close
  useEffect(() => {
    const isPenaltySession =
      hasPenalty &&
      penaltyBlockEnd > Date.now() &&
      focusEndTime &&
      focusEndTime === penaltyBlockEnd;
    const isPenaltyBlock = hasPenalty && autoBlockApps && penaltyBlockEnd > Date.now();
    const isNormalBlock = focusActive && focusEndTime && focusEndTime > Date.now() && !isPenaltySession;

    if (isNormalBlock) {
      FocusBlocker?.startFocusMode(
        blockedApps,
        Date.now(),
        focusEndTime,
        false
      ).catch(() => {});
    } else if (isPenaltyBlock) {
      FocusBlocker?.startFocusMode(
        blockedApps,
        penaltyBlockStart || Date.now(),
        penaltyBlockEnd,
        true
      ).catch((err: any) => {
        console.warn('[App] Penalty focus sync failed:', err?.message ?? err);
      });
    } else if (!isNormalBlock && !isPenaltyBlock) {
      FocusBlocker?.stopFocusMode().catch(() => {});
    }
  }, [
    hasPenalty, autoBlockApps, penaltyBlockStart, penaltyBlockEnd,
    blockedApps, focusActive, focusEndTime,
  ]);

  // Schedule penalty focus activation so the UI timer starts on time.
  useEffect(() => {
    if (!hasPenalty || !autoBlockApps || penaltyBlockEnd <= Date.now()) {return;}
    const start = penaltyBlockStart ?? 0;
    if (start > Date.now()) {
      const id = setTimeout(() => {
        setFocusActive(true, penaltyBlockEnd);
      }, start - Date.now());
      return () => clearTimeout(id);
    }
    if (!focusActive) {
      setFocusActive(true, penaltyBlockEnd);
    }
  }, [hasPenalty, autoBlockApps, penaltyBlockStart, penaltyBlockEnd, focusActive, setFocusActive]);

  // If auto-block is turned off, clear any penalty-driven focus state.
  useEffect(() => {
    if (!autoBlockApps && hasPenalty && focusActive && focusEndTime === penaltyBlockEnd) {
      setFocusActive(false, 0);
    }
  }, [autoBlockApps, hasPenalty, focusActive, focusEndTime, penaltyBlockEnd, setFocusActive]);


  return (
    <SafeAreaProvider>
      {/* 'bottom' edge included: with targetSdk 35 (Android 15 edge-to-edge) the
          system nav/gesture bar would otherwise overlap the tab bar */}
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />

        <SystemHUD onSettings={() => setShowSettings(true)} onRankPress={() => setShowRankInfo(true)} />

        {hasPenalty && (
          <View style={styles.penalBanner}>
            <Icon name="alert" size={13} color={C.neonRed} />
            <Text style={styles.penalBannerText}>
              {t('app.penalty_banner')}
            </Text>
            {!!penaltyCountdown && (
              <Text style={styles.penalCountdownText}>{penaltyCountdown}</Text>
            )}
          </View>
        )}

        <NavigationContainer
          ref={navigationRef}
          linking={{
            // 'sololeveling://' kept for backwards-compat with old shortcuts/widgets
            prefixes: ['lifup://', 'sololeveling://'],
            config: {
              screens: {
                'Missões': 'missions',
                'Status': 'status',
                'Loja': 'shop',
                'Inventário': 'inventory',
                'Focus': 'focus',
              },
            },
          }}
          theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.panel, border: C.border } }}
        >
          <Tab.Navigator
            id="main-tabs"
            tabBarPosition="bottom"
            screenOptions={({ route }) => ({
              tabBarShowIcon: true,
              tabBarStyle: styles.tabBar,
              tabBarIndicatorStyle: { backgroundColor: C.neonBlue, height: 2, top: 0 },
              tabBarActiveTintColor: C.neonBlue,
              tabBarInactiveTintColor: C.dimmed,
              tabBarLabelStyle: styles.tabLabel,
              tabBarIcon: ({ color, ...rest }) => {
                const iconSize = (rest as any).size ?? 22;
                return <Icon name={TAB_ICONS[route.name] ?? 'circle'} size={iconSize - 2} color={color} />;
              },
            })}
          >
            <Tab.Screen
              name="Missões"
              component={QuestScreen}
              options={{
                tabBarLabel: t('tabs.missions'),
                tabBarBadge: hasPenalty ? PenaltyBadge : undefined,
              }}
            />
            <Tab.Screen name="Status" component={StatusScreen} options={{ tabBarLabel: t('tabs.status') }} />
            <Tab.Screen name="Loja" component={ShopScreen} options={{ tabBarLabel: t('tabs.shop') }} />
            <Tab.Screen
              name="Inventário"
              component={InventoryScreen}
              options={{
                tabBarLabel: t('tabs.inventory'),
                tabBarBadge: invTotal > 0 ? () => <InventoryBadge count={invTotal} /> : undefined,
              }}
            />
            <Tab.Screen name="Focus" component={FocusScreen} options={{ tabBarLabel: t('tabs.focus') }} />
          </Tab.Navigator>
        </NavigationContainer>

        {/* Scary penalty modal */}
        <PenaltyModal visible={penaltyTriggered} onDismiss={dismissPenalty} />

        {/* Sequential Reward System — activeReward latches once started, stays until dismissed */}
        {!!activeReward && (
          <View style={styles.rewardsLayer} pointerEvents="box-none">
            <Fragment key={`${activeReward.type}-${activeReward.id}`}>
              {activeReward.type === 'boss_defeated' && activeReward.data && (
                <BossVictoryModal
                  visible={true}
                  info={activeReward.data}
                  onClose={handlePopReward}
                  onRequestClose={handlePopReward}
                  C={C}
                />
              )}
              {activeReward.type === 'achievement' && (
                <AchievementModal
                  achievementId={activeReward.id}
                  onDismiss={handlePopReward}
                />
              )}
              {activeReward.type === 'shadow' && (() => {
                const shadowData = SHADOW_MAP[activeReward.id] || customShadows.find(cs => cs.id === activeReward.id);
                if (!shadowData) { handlePopReward(); return null; }
                return (
                  <ExtractionModal
                    result={{
                      shadow: shadowData,
                      isLevelUp: !!activeReward.isLevelUp,
                      newLevel: activeReward.newLevel || 1,
                    }}
                    onDismiss={handlePopReward}
                  />
                );
              })()}
              {activeReward.type === 'level_up' && activeReward.data && (
                <LevelUpModal
                  level={(activeReward.data as any).level}
                  items={(activeReward.data as any).items || []}
                  onDismiss={handlePopReward}
                />
              )}
              {activeReward.type === 'shadow_miss' && activeReward.data && (
                <View style={styles.shadowMissOverlay} pointerEvents="box-none">
                  <View style={styles.shadowMissCard}>
                    <Text style={styles.shadowMissTitle}>{t('app.shadow_miss.title')}</Text>
                    <Text style={styles.shadowMissName}>{(activeReward.data as any).shadowName}</Text>
                    <Text style={styles.shadowMissChance}>
                      {t('app.shadow_miss.drop_chance', { pct: Math.round(((activeReward.data as any).dropChance ?? 0) * 100) })}
                    </Text>
                    <Text style={styles.shadowMissLore}>
                      {t('app.shadow_miss.lore')}
                    </Text>
                    <TouchableOpacity
                      style={styles.shadowMissBtn}
                      onPress={() => { Vibration.vibrate(30); handlePopReward(); }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.shadowMissBtnTxt}>{t('app.shadow_miss.btn')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              {activeReward.type === 'job_change' && (
                <JobChangeModal
                  job={activeReward.data}
                  onClose={handlePopReward}
                  C={C}
                />
              )}
            </Fragment>
          </View>
        )}

        {/* Rank requirements modal */}
        {showRankInfo && (
          <RankModal
            level={playerLevel}
            totalCompleted={statistics.totalCompleted}
            bossesDefeated={bossesDefeated}
            questsByRank={statistics.questsByRank}
            onClose={() => setShowRankInfo(false)}
            C={C}
          />
        )}

        {/* Loot Box Modal — suppressed while another reward modal is on screen */}
        {currentLootReward && !penaltyTriggered && rewardsQueue.length === 0 && (
          <LootBoxModal
            reward={currentLootReward}
            onClose={dismissLootReward}
          />
        )}

        {/* Settings screen */}
        {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}

          {/* Simple level-up toast for non-multiples of 5 (levels 1,2,3,4,6,7,8,9...) */}
        {/* Toast is suppressed while a modal/reward is on screen to avoid late/short display */}
        <View style={styles.toastLayer} pointerEvents="box-none">
          <LevelUpToast
            reward={levelUpToastQueue.length ? { level: levelUpToastQueue[0], items: [] } : null}
            blocked={toastBlocked}
            onDismiss={dismissLevelUpToast}
          />
          <ShadowSkillToast msg={shadowSkillFiredMsg} blocked={toastBlocked} onDismiss={dismissShadowSkillMsg} />
        </View>

        {/* Tutorial Overlay */}
        {activeTutorialPhase !== null && (
          <TutorialOverlay
            phase={activeTutorialPhase as 1 | 2}
            onDone={advanceTutorial}
            onChangeTab={(tab: string) => {
              if (navigationRef.isReady()) {
                navigationRef.navigate(tab);
              }
            }}
          />
        )}

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  tabBar: {
    backgroundColor: C.panel,
    borderTopWidth: 1,
    borderTopColor: C.border,
    height: 62,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabLabel: {
    fontFamily: FONT.orbitron,
    fontSize: 10,
    letterSpacing: 0,
    margin: 0,
  },
  penalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0505',
    borderBottomWidth: 1,
    borderBottomColor: '#ef444455',
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
  },
  penalBannerText: {
    flex: 1,
    marginLeft: 8,
    color: C.neonRed,
    fontFamily: FONT.orbitron,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  penalCountdownText: {
    color: C.neonRed,
    fontFamily: FONT.orbitron,
    fontSize: 9,
    opacity: 0.75,
    marginLeft: 6,
  },
  penaltyBadge: {
    backgroundColor: C.neonRed,
    borderRadius: 10,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  penaltyBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: FONT.orbitron,
  },
  inventoryBadge: {
    backgroundColor: C.neonBlue,
    borderRadius: 10,
    minWidth: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  inventoryBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: FONT.orbitron,
  },
  rewardsLayer: {
    zIndex: 10000,
  },
  toastLayer: {
    zIndex: 10001,
  },
  shadowMissOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  shadowMissCard: {
    backgroundColor: '#0d0d1a',
    borderWidth: 1,
    borderColor: '#7c3aed55',
    borderRadius: 10,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    marginHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  shadowMissTitle: {
    fontFamily: FONT.orbitron,
    fontSize: 20,
    fontWeight: '900',
    color: '#7c3aed',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
  },
  shadowMissName: {
    fontFamily: FONT.orbitron,
    fontSize: 14,
    color: '#c4b5fd',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  shadowMissChance: {
    fontFamily: FONT.orbitron,
    fontSize: 11,
    color: '#6b7280',
    marginBottom: SPACING.md,
  },
  shadowMissLore: {
    fontSize: 12,
    color: '#4b5563',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 18,
  },
  shadowMissBtn: {
    borderWidth: 1,
    borderColor: '#7c3aed',
    borderRadius: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  shadowMissBtnTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 11,
    color: '#7c3aed',
    letterSpacing: 1,
  },
});
