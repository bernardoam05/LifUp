import './src/i18n';
import React, { useEffect, useState, useCallback, Fragment } from 'react';
import { View, Text, StyleSheet, StatusBar, NativeModules, TouchableOpacity, Vibration, Animated } from 'react-native';
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
import ShadowsScreen from './src/screens/ShadowsScreen';
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
  'Status': 'sword-cross',
  'Missões': 'clipboard-list-outline',
  'Loja': 'shopping-outline',
  'Inventário': 'bag-personal',
  'Focus Mode': 'brain',
  'Sombras': 'account-group-outline',
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

function ShadowSkillToast({ msg, onDismiss }: { msg: string | null; onDismiss: () => void }) {
  const anim = React.useRef(new Animated.Value(120)).current;
  React.useEffect(() => {
    if (!msg) { anim.setValue(120); return; }
    Animated.spring(anim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 120, duration: 300, useNativeDriver: true }).start(onDismiss);
    }, 4000);
    return () => clearTimeout(t);
  }, [msg]);

  if (!msg) { return null; }
  return (
    <Animated.View style={{ position: 'absolute', bottom: 90, left: 16, right: 16, transform: [{ translateY: anim }] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f1a2e', borderWidth: 1, borderColor: '#a855f744', borderRadius: 8, padding: 12, gap: 10 }}>
        <Icon name="shield-star" size={18} color="#a855f7" />
        <Text style={{ flex: 1, color: '#e2e8f0', fontSize: 12, fontFamily: 'Orbitron-Regular' }}>{msg}</Text>
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
  const statistics = useGameStore(s => s.statistics);
  const bossesDefeated = useGameStore(s => s.system.bossesDefeated);
  const playerLevel = useGameStore(s => s.player.level);
  // missionModalOpen excluded: reward shows on top of mission modals, not blocked by them
  const rewardsBlocked = penaltyTriggered || showSettings || showRankInfo || !!currentLootReward;
  const toastBlocked = rewardsBlocked || rewardsQueue.length > 0;

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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />

        <SystemHUD onSettings={() => setShowSettings(true)} onRankPress={() => setShowRankInfo(true)} />

        {hasPenalty && (
          <View style={styles.penalBanner}>
            <Icon name="alert" size={13} color={C.neonRed} />
            <Text style={styles.penalBannerText}>
              ZONA DE PENALIDADE ATIVA — Completa as missões de penalização!
            </Text>
          </View>
        )}

        <NavigationContainer
          ref={navigationRef}
          linking={{
            prefixes: ['sololeveling://'],
            config: {
              screens: {
                'Status': 'status',
                'Missões': 'missions',
                'Focus Mode': 'focus',
                'Loja': 'shop',
                'Inventário': 'inventory',
                'Sombras': 'shadows',
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
            <Tab.Screen name="Status" component={StatusScreen} />
            <Tab.Screen
              name="Missões"
              component={QuestScreen}
              options={{
                tabBarBadge: hasPenalty ? PenaltyBadge : undefined,
              }}
            />
            <Tab.Screen name="Loja" component={ShopScreen} />
            <Tab.Screen
              name="Inventário"
              component={InventoryScreen}
              options={{
                tabBarBadge: invTotal > 0 ? () => <InventoryBadge count={invTotal} /> : undefined,
              }}
            />
            <Tab.Screen name="Focus Mode" component={FocusScreen} />
            <Tab.Screen
              name="Sombras"
              component={ShadowsScreen}
              options={{
                tabBarActiveTintColor: C.purple,
              }}
            />
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
                    <Text style={styles.shadowMissTitle}>A SOMBRA FUGIU!</Text>
                    <Text style={styles.shadowMissName}>{(activeReward.data as any).shadowName}</Text>
                    <Text style={styles.shadowMissChance}>
                      Chance de drop: {Math.round(((activeReward.data as any).dropChance ?? 0) * 100)}%
                    </Text>
                    <Text style={styles.shadowMissLore}>
                      "A escuridão recua... mas a sombra aguarda uma próxima oportunidade."
                    </Text>
                    <TouchableOpacity
                      style={styles.shadowMissBtn}
                      onPress={() => { Vibration.vibrate(30); handlePopReward(); }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.shadowMissBtnTxt}>ENTENDIDO</Text>
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
          <ShadowSkillToast msg={shadowSkillFiredMsg} onDismiss={dismissShadowSkillMsg} />
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
    fontSize: 8,
    letterSpacing: 0.5,
    margin: 0,
    marginTop: -4,
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
    borderRadius: 12,
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
