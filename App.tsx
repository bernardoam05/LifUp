import React, { useEffect, useState, Fragment } from 'react'
import { View, Text, StyleSheet, StatusBar, Modal, TouchableOpacity, Vibration, NativeModules } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { NavigationContainer, DarkTheme, createNavigationContainerRef } from '@react-navigation/native'
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { getRank, xpForLevel, CLASS_REQUIREMENTS } from './src/store/useGameStore'
import { setupNotifications, requestNotificationPermission } from './src/utils/notifications'
import { initializeAudio } from './src/utils/audioService'
import { ACHIEVEMENTS_MAP } from './src/data/achievements'
import { SHADOW_MAP } from './src/data/shadows'
import RankModal from './src/components/RankModal'
import ExtractionModal from './src/components/ExtractionModal'
import LevelUpModal from './src/components/LevelUpModal'


import LevelUpToast from "./src/components/LevelUpToast"

import StatusScreen from './src/screens/StatusScreen'
import QuestScreen from './src/screens/QuestScreen'
import ShopScreen from './src/screens/ShopScreen'
import InventoryScreen from './src/screens/InventoryScreen'
import FocusScreen from './src/screens/FocusScreen'
import ShadowsScreen from './src/screens/ShadowsScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import { C, FONT, SPACING } from './src/theme'
import { useDayWatcher } from './src/hooks/useDayWatcher'

import AchievementModal from './src/components/AchievementModal'
import { JobChangeModal } from './src/screens/StatusScreen'
import TutorialOverlay from './src/components/TutorialOverlay'
import PenaltyModal from './src/components/PenaltyModal'
import SystemHUD from './src/components/SystemHUD'
import { LootBoxModal } from './src/components/LootBoxModal'

const Tab = createMaterialTopTabNavigator()

const TAB_ICONS: Record<string, string> = {
  'Status': 'sword-cross',
  'Missões': 'clipboard-list-outline',
  'Loja': 'shopping-outline',
  'Inventário': 'bag-personal',
  'Focus Mode': 'brain',
  'Sombras': 'account-group-outline',
}

const navigationRef = createNavigationContainerRef<any>()
const { FocusBlocker } = NativeModules

// ── App Root ───────────────────────────────────────────────────────────────────

export default function App() {
  const levelUpReward = useGameStore(s => s.levelUpReward)
  const dismissLevelUpReward = useGameStore(s => s.dismissLevelUpReward)
  const levelUpToast = useGameStore(s => s.levelUpToast)
  const dismissLevelUpToast = useGameStore(s => s.dismissLevelUpToast)
  const currentLootReward = useGameStore(s => s.currentLootReward)
  const dismissLootReward = useGameStore(s => s.dismissLootReward)

  const focusActive = useGameStore(s => s.system.focusModeActive)
  const focusEndTime = useGameStore(s => s.system.focusEndTime)

  const bootSystem = useGameStore(s => s.bootSystem)
  const hasPenalty = useGameStore(s => s.system.hasPenalty)
  const penaltyBlockStart = useGameStore(s => s.system.penaltyBlockStart)
  const penaltyBlockEnd = useGameStore(s => s.system.penaltyBlockEnd)
  const blockedApps = useGameStore(s => s.system.blockedApps)
  const hardcorePunished = useGameStore(s => s.system.hardcorePunished)
  const autoBlockApps = useGameStore(s => s.settings.autoBlockApps)
  const penaltyTriggered = useGameStore(s => s.system.penaltyTriggered)
  const dismissPenalty = useGameStore(s => s.dismissPenaltyModal)
  const setPenaltyTriggered = useGameStore(s => s.setPenaltyTriggered)
  const inventory = useGameStore(s => s.player.inventory)
  const invTotal = inventory.reduce((sum, e) => sum + e.quantity, 0)
  const rewardsQueue = useGameStore(s => s.rewardsQueue)
  const popReward = useGameStore(s => s.popReward)
  const tutorialPhase = useGameStore(s => s.system.tutorialPhase)
  const advanceTutorial = useGameStore(s => s.advanceTutorialPhase)

  const [showSettings, setShowSettings] = useState(false)
  const [showRankInfo, setShowRankInfo] = useState(false)
  const statistics = useGameStore(s => s.statistics)
  const bossesDefeated = useGameStore(s => s.system.bossesDefeated)
  const playerLevel = useGameStore(s => s.player.level)
  const [prevPenalty, setPrevPenalty] = useState(false)

  // Register the midnight reset watcher
  useDayWatcher()

  // Decide if tutorial should run
  const activeTutorialPhase = tutorialPhase === 0 ? 1 : (tutorialPhase === 1 && playerLevel >= 10 ? 2 : null)

  useEffect(() => {
    bootSystem()
    initializeAudio().catch(() => { })
    setupNotifications()
      .then(() => requestNotificationPermission())
      .catch(() => { })
  }, [])

  // Auto-trigger penalty modal when penalty is active
  useEffect(() => {
    if (hasPenalty && !penaltyTriggered) {
      setPenaltyTriggered(true)
    }
  }, [hasPenalty, penaltyTriggered, setPenaltyTriggered])

  // Unified Background Service Sync: Restores Focus Blocker if killed by OS/Force Close
  useEffect(() => {
    const isPenaltyBlock = hasPenalty && autoBlockApps && penaltyBlockEnd && penaltyBlockEnd > Date.now()
    const isNormalBlock = focusActive && focusEndTime && focusEndTime > Date.now()

    if (isNormalBlock) {
      FocusBlocker?.startFocusMode(
        blockedApps,
        Date.now(),
        focusEndTime,
        hardcorePunished
      ).catch(() => {})
    } else if (isPenaltyBlock) {
      FocusBlocker?.startFocusMode(
        blockedApps, 
        penaltyBlockStart || Date.now(), 
        penaltyBlockEnd, 
        hardcorePunished
      ).catch(() => {})
    } else if (!isNormalBlock && !isPenaltyBlock && autoBlockApps) {
      FocusBlocker?.stopFocusMode().catch(() => {})
    }
  }, [
    hasPenalty, autoBlockApps, penaltyBlockStart, penaltyBlockEnd, 
    blockedApps, hardcorePunished, focusActive, focusEndTime
  ])


  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />

        <SystemHUD onSettings={() => setShowSettings(true)} onRankPress={() => setShowRankInfo(true)} />

        {hasPenalty && (
          <View style={styles.penalBanner}>
            <Icon name="alert" size={12} color={C.neonRed} />
            <Text style={styles.penalBannerText}>
              {'  '}PENALTY ZONE ATIVA — Completa as missões de penalização!
            </Text>
          </View>
        )}

        <NavigationContainer
          ref={navigationRef}
          linking={{
            prefixes: ['sololeveling://'],
            config: {
              screens: {
                "Status": 'status',
                "Missões": 'missions',
                "Focus Mode": 'focus',
                "Loja": 'shop',
                "Inventário": 'inventory',
                "Sombras": 'shadows'
              }
            }
          }}
          theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.panel, border: C.border } }}
        >
          <Tab.Navigator
            tabBarPosition="bottom"
            screenOptions={({ route }) => ({
              tabBarShowIcon: true,
              tabBarStyle: styles.tabBar,
              tabBarIndicatorStyle: { backgroundColor: C.neonBlue, height: 2, top: 0 },
              tabBarActiveTintColor: C.neonBlue,
              tabBarInactiveTintColor: C.dimmed,
              tabBarLabelStyle: styles.tabLabel,
              tabBarIcon: ({ color, ...rest }) => {
                const iconSize = (rest as any).size ?? 22
                return <Icon name={TAB_ICONS[route.name] ?? 'circle'} size={iconSize - 2} color={color} />
              },
            })}
          >
            <Tab.Screen name="Status" component={StatusScreen} />
            <Tab.Screen name="Missões" component={QuestScreen} />
            <Tab.Screen name="Loja" component={ShopScreen} />
            <Tab.Screen
              name="Inventário"
              component={InventoryScreen}
              options={{
                tabBarBadge: invTotal > 0 ? () => (
                  <View style={{ backgroundColor: C.neonBlue, borderRadius: 10, minWidth: 14, height: 14, justifyContent: 'center', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ color: '#000', fontSize: 9, fontWeight: 'bold', fontFamily: FONT.orbitron }}>{invTotal}</Text>
                  </View>
                ) : undefined
              }}
            />
            <Tab.Screen
              name="Focus Mode"
              component={FocusScreen}
              options={{
                tabBarBadge: hasPenalty ? () => (
                  <View style={{ backgroundColor: C.neonRed, borderRadius: 10, minWidth: 14, height: 14, justifyContent: 'center', alignItems: 'center', marginTop: 2 }}>
                    <Text style={{ color: '#000', fontSize: 9, fontWeight: 'bold', fontFamily: FONT.orbitron }}>!</Text>
                  </View>
                ) : undefined
              }}
            />
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

        {/* Sequential Reward System */}
        {!penaltyTriggered && rewardsQueue.length > 0 && (
          <View style={{ zIndex: 10000 }}>
            <Fragment key={`${rewardsQueue[0].type}-${rewardsQueue[0].id}`}>
              {rewardsQueue[0].type === 'achievement' && (
                <AchievementModal
                  achievementId={rewardsQueue[0].id}
                  onDismiss={popReward}
                />
              )}
              {rewardsQueue[0].type === 'shadow' && (
                <ExtractionModal
                  result={{
                    shadow: (SHADOW_MAP[rewardsQueue[0].id] || (useGameStore.getState().customShadows.find(cs => cs.id === rewardsQueue[0].id)))!,
                    isLevelUp: !!rewardsQueue[0].isLevelUp,
                    newLevel: rewardsQueue[0].newLevel || 1
                  }}
                  onDismiss={popReward}
                />
              )}
              {rewardsQueue[0].type === 'level_up' && rewardsQueue[0].data && (
                <LevelUpModal
                  level={(rewardsQueue[0].data as any).level}
                  items={(rewardsQueue[0].data as any).items || []}
                  onDismiss={popReward}
                />
              )}
              {rewardsQueue[0].type === 'job_change' && (
                <JobChangeModal
                  job={rewardsQueue[0].data}
                  onClose={popReward}
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

        {/* Loot Box Modal */}
        {currentLootReward && (
          <LootBoxModal
            reward={currentLootReward}
            onClose={dismissLootReward}
          />
        )}

        {/* Settings screen */}
        {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}

        {/* Simple level-up toast for non-multiples of 5 (levels 1,2,3,4,6,7,8,9...) */}
        <View style={{ zIndex: 9999 }}>
          <LevelUpToast
            reward={levelUpToast ? { level: levelUpToast, items: [] } : null}
            onDismiss={dismissLevelUpToast}
          />
        </View>

        {/* Tutorial Overlay */}
        {activeTutorialPhase !== null && (
          <TutorialOverlay
            phase={activeTutorialPhase as 1 | 2}
            onDone={advanceTutorial}
            onChangeTab={(tab: string) => {
              if (navigationRef.isReady()) {
                navigationRef.navigate(tab)
              }
            }}
          />
        )}

      </SafeAreaView>
    </SafeAreaProvider>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    justifyContent: 'center',
    backgroundColor: '#1a0505',
    borderBottomWidth: 1,
    borderBottomColor: '#ef444455',
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
  },
  penalBannerText: {
    color: C.neonRed,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
