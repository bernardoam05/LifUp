import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, StatusBar, Modal, TouchableOpacity, Vibration } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { NavigationContainer, DarkTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { getRank, xpForLevel, CLASS_REQUIREMENTS } from './src/store/useGameStore'
import { setupNotifications, requestNotificationPermission } from './src/utils/notifications'
import { ACHIEVEMENTS_MAP } from './src/data/achievements'
import RankModal from './src/components/RankModal'

import StatusScreen    from './src/screens/StatusScreen'
import QuestScreen     from './src/screens/QuestScreen'
import ShopScreen      from './src/screens/ShopScreen'
import InventoryScreen from './src/screens/InventoryScreen'
import FocusScreen     from './src/screens/FocusScreen'
import ShadowsScreen   from './src/screens/ShadowsScreen'
import SettingsScreen  from './src/screens/SettingsScreen'
import { C, FONT, SPACING } from './src/theme'

const Tab = createBottomTabNavigator()

// ── Achievement Modal (epic) ───────────────────────────────────────────────────

function AchievementModal({ achievementId, onDismiss }: { achievementId: string; onDismiss: () => void }) {
  const achievement = ACHIEVEMENTS_MAP[achievementId]

  useEffect(() => {
    Vibration.vibrate([0, 100, 50, 200, 50, 100, 50, 400])
  }, [])

  if (!achievement) return null

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
      <View style={am.overlay}>
        <View style={[am.card, { borderColor: achievement.color + '88' }]}>
          <Text style={am.system}>⚡ SISTEMA ⚡</Text>
          <Text style={am.header}>ACHIEVEMENT DESBLOQUEADO</Text>
          <View style={[am.iconWrap, { backgroundColor: achievement.color + '18', borderColor: achievement.color + '44' }]}>
            <Icon name={achievement.icon} size={52} color={achievement.color} />
          </View>
          <Text style={[am.title, { color: achievement.color }]}>{achievement.title}</Text>
          <Text style={am.desc}>{achievement.description}</Text>
          <View style={am.rewardRow}>
            <Icon name="rhombus" size={16} color={C.gold} />
            <Text style={am.reward}> +{achievement.rewardGold} Gold</Text>
          </View>
          <TouchableOpacity style={[am.btn, { borderColor: achievement.color }]} onPress={onDismiss}>
            <Text style={[am.btnTxt, { color: achievement.color }]}>GLÓRIA AO CAÇADOR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Penalty Modal (scary, dynamic) ────────────────────────────────────────────

const INTENSITY_FLAVOR: Record<string, { title: string; icon: string; color: string }> = {
  light:    { title: 'ZONA DE PENALIDADE',     icon: 'shield-alert-outline', color: '#22c55e' },
  medium:   { title: 'ZONA DE PENALIDADE',     icon: 'alert-octagon',        color: C.gold },
  hardcore: { title: 'PUNIÇÃO DO MONARCA',     icon: 'skull-crossbones',     color: C.neonRed },
}

function PenaltyModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const lastPenaltyInfo = useGameStore(s => s.system.lastPenaltyInfo)

  useEffect(() => {
    if (!visible) return
    const intensity = lastPenaltyInfo?.intensity ?? 'medium'
    if (intensity === 'hardcore') Vibration.vibrate([0, 300, 100, 300, 100, 600])
    else if (intensity === 'medium') Vibration.vibrate([0, 200, 80, 200])
    else Vibration.vibrate([0, 100])
  }, [visible])

  const info      = lastPenaltyInfo
  const intensity = info?.intensity ?? 'medium'
  const flavor    = INTENSITY_FLAVOR[intensity] ?? INTENSITY_FLAVOR.medium

  const failLine = info
    ? `${info.failedCount} de ${info.totalCount} missões falhadas.`
    : 'Missões diárias não concluídas.'

  const xpLine = info
    ? `${info.xpLost} XP deduzidos.`
    : 'XP deduzido conforme perfil ativo.'

  const intensityLabels: Record<string, string> = {
    light: 'LEVE', medium: 'MÉDIO', hardcore: 'HARDCORE',
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <View style={pm.overlay}>
        <View style={[pm.card, { borderColor: flavor.color + '88' }]}>
          <Icon name={flavor.icon} size={48} color={flavor.color} style={{ marginBottom: SPACING.md }} />
          <Text style={[pm.warning, { color: flavor.color }]}>⚠ AVISO DO SISTEMA ⚠</Text>
          <Text style={pm.title}>{flavor.title}</Text>

          {/* Intensity badge */}
          <View style={[pm.badge, { borderColor: flavor.color + '55', backgroundColor: flavor.color + '15' }]}>
            <Text style={[pm.badgeTxt, { color: flavor.color }]}>
              INTENSIDADE: {intensityLabels[intensity]}
            </Text>
          </View>

          <Text style={pm.message}>
            {'Falhaste as Missões Diárias de ontem.\n\n'}
            <Text style={{ color: '#e2e8f0', fontWeight: '700' }}>{failLine}</Text>
            {'\n\n'}
            <Text style={{ color: flavor.color, fontWeight: '900' }}>{xpLine}</Text>
            {'\n\nCompleta as missões de penalização para escapar.'}
          </Text>

          <TouchableOpacity style={[pm.btn, { borderColor: flavor.color }]} onPress={onDismiss}>
            <Text style={[pm.btnTxt, { color: flavor.color }]}>ENTENDIDO, HUNTER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── HUD ────────────────────────────────────────────────────────────────────────

function SystemHUD({ onSettings, onRankPress }: { onSettings: () => void; onRankPress: () => void }) {
  const player   = useGameStore(s => s.player)
  const stats    = useGameStore(s => s.statistics)
  const bosses   = useGameStore(s => s.system.bossesDefeated)
  const rank     = getRank(player.level, stats.totalCompleted, bosses, stats.questsByRank)
  const xpNeeded = xpForLevel(player.level)
  const xpPct    = Math.min((player.xp / xpNeeded) * 100, 100)
  const focusOn  = useGameStore(s => s.system.focusModeActive)

  return (
    <View style={hud.container}>
      <View style={hud.row}>
        <TouchableOpacity style={[hud.badge, { borderColor: rank.color }]} onPress={onRankPress} activeOpacity={0.75}>
          <Text style={[hud.badgeText, { color: rank.color }]}>{rank.rank}</Text>
        </TouchableOpacity>
        <View style={hud.info}>
          <View style={hud.nameRow}>
            <Text style={hud.name} numberOfLines={1}>{player.name}</Text>
            <Text style={hud.level}> LVL {player.level}</Text>
            <View style={{ flex: 1 }} />
            {/* Streak badge */}
            {player.currentStreak > 0 && (
              <View style={hud.streakBadge}>
                <Text style={hud.streakFire}>🔥</Text>
                <Text style={hud.streakNum}>{player.currentStreak}</Text>
              </View>
            )}
            <Icon name="rhombus" size={12} color={C.gold} />
            <Text style={hud.gold}> {player.gold.toLocaleString()}</Text>
          </View>
          <View style={hud.xpTrack}>
            <View style={[hud.xpFill, { width: `${xpPct}%` as any }]} />
          </View>
          <View style={hud.xpRow}>
            <Text style={hud.xpText}>{player.xp} / {xpNeeded} XP</Text>
            {focusOn && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="lightning-bolt" size={9} color={C.neonBlue} />
                <Text style={hud.focusTag}> FOCO</Text>
              </View>
            )}
          </View>
        </View>
        {/* Settings gear */}
        <TouchableOpacity onPress={onSettings} style={hud.gearBtn}>
          <Icon name="cog-outline" size={18} color={C.dimmed} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Tab icon map ───────────────────────────────────────────────────────────────

const TAB_ICONS: Record<string, string> = {
  'Status':     'sword-cross',
  'Missões':    'clipboard-list-outline',
  'Loja':       'shopping-outline',
  'Inventário': 'bag-personal',
  'Focus Mode': 'brain',
  'Sombras':    'account-group-outline',
}

// ── App Root ───────────────────────────────────────────────────────────────────

export default function App() {
  const bootSystem          = useGameStore(s => s.bootSystem)
  const hasPenalty          = useGameStore(s => s.system.hasPenalty)
  const penaltyTriggered    = useGameStore(s => s.system.penaltyTriggered)
  const dismissPenalty      = useGameStore(s => s.dismissPenaltyModal)
  const inventory           = useGameStore(s => s.player.inventory)
  const invTotal            = inventory.reduce((sum, e) => sum + e.quantity, 0)
  const newAchievementIds   = useGameStore(s => s.newAchievementIds)
  const dismissAchievement  = useGameStore(s => s.dismissAchievement)
  const lastExtraction      = useGameStore(s => s.lastExtraction)

  const [showSettings, setShowSettings] = useState(false)
  const [showRankInfo, setShowRankInfo] = useState(false)
  const statistics   = useGameStore(s => s.statistics)
  const bossesDefeated = useGameStore(s => s.system.bossesDefeated)
  const playerLevel  = useGameStore(s => s.player.level)

  useEffect(() => {
    bootSystem()
    setupNotifications()
      .then(() => requestNotificationPermission())
      .catch(() => {})
  }, [])


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
          theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: C.bg, card: C.panel, border: C.border } }}
        >
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown:             false,
              tabBarStyle:             styles.tabBar,
              tabBarActiveTintColor:   C.neonBlue,
              tabBarInactiveTintColor: C.dimmed,
              tabBarLabelStyle:        styles.tabLabel,
              tabBarIcon: ({ color, size }) => (
                <Icon name={TAB_ICONS[route.name] ?? 'circle'} size={size - 2} color={color} />
              ),
            })}
          >
            <Tab.Screen name="Status"   component={StatusScreen} />
            <Tab.Screen name="Missões"  component={QuestScreen} />
            <Tab.Screen name="Loja"     component={ShopScreen} />
            <Tab.Screen
              name="Inventário"
              component={InventoryScreen}
              options={{
                tabBarBadge:      invTotal > 0 ? invTotal : undefined,
                tabBarBadgeStyle: { backgroundColor: C.neonBlue, fontSize: 9 },
              }}
            />
            <Tab.Screen
              name="Focus Mode"
              component={FocusScreen}
              options={{
                tabBarBadge:      hasPenalty ? '!' : undefined,
                tabBarBadgeStyle: { backgroundColor: C.neonRed, fontSize: 9 },
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

        {/* Achievement unlock modal — shows one at a time from the queue */}
        {newAchievementIds.length > 0 && !penaltyTriggered && !lastExtraction && (
          <AchievementModal achievementId={newAchievementIds[0]} onDismiss={dismissAchievement} />
        )}

        {/* Rank requirements modal */}
        {showRankInfo && (
          <RankModal
            level={playerLevel}
            totalCompleted={statistics.totalCompleted}
            bossesDefeated={bossesDefeated}
            questsByRank={statistics.questsByRank}
            onClose={() => setShowRankInfo(false)}
          />
        )}

        {/* Settings screen */}
        {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}

      </SafeAreaView>
    </SafeAreaProvider>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const hud = StyleSheet.create({
  container:  { backgroundColor: C.panel, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  row:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge:      { width: 48, height: 48, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText:  { fontSize: 20, fontFamily: FONT.orbitron, fontWeight: '900' },
  info:       { flex: 1 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  name:       { color: '#fff', fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '700', maxWidth: 120 },
  level:      { color: C.muted, fontSize: 11 },
  gold:       { color: C.gold, fontSize: 13, fontWeight: '700' },
  xpTrack:    { height: 5, backgroundColor: C.neonBlue + '18', borderRadius: 3, overflow: 'hidden' },
  xpFill:     { height: '100%', backgroundColor: C.neonBlue, borderRadius: 3 },
  xpRow:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  xpText:      { color: C.dimmed, fontSize: 9 },
  focusTag:    { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', marginRight: 8, backgroundColor: '#1a0f0022', borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1 },
  streakFire:  { fontSize: 11 },
  streakNum:   { color: '#f97316', fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  gearBtn:     { padding: 6, marginLeft: 4 },
})

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: C.panel,
    borderTopWidth:  1,
    borderTopColor:  C.border,
    height:          58,
    paddingBottom:   4,
  },
  tabLabel: {
    fontFamily:    FONT.orbitron,
    fontSize:      8,
    letterSpacing: 0.5,
  },
  penalBanner: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'center',
    backgroundColor:   '#1a0505',
    borderBottomWidth: 1,
    borderBottomColor: '#ef444455',
    paddingVertical:   6,
    paddingHorizontal: SPACING.md,
  },
  penalBannerText: {
    color:         C.neonRed,
    fontSize:      11,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },
})

const pm = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: '#000000ee', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:     { backgroundColor: '#0a0005', borderRadius: 4, padding: SPACING.xl, width: '100%', alignItems: 'center', borderWidth: 2 },
  warning:  { fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 3, marginBottom: SPACING.sm },
  title:    { color: '#fff', fontFamily: FONT.orbitron, fontSize: 20, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.md },
  badge:    { borderWidth: 1, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 4, marginBottom: SPACING.md },
  badgeTxt: { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, fontWeight: '700' },
  message:  { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  btn:      { borderWidth: 1, borderRadius: 4, paddingVertical: 14, paddingHorizontal: SPACING.xl },
  btnTxt:   { fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2 },
})

const hrm = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: '#000000dd', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card:         { width: '100%', backgroundColor: '#0a0f1a', borderRadius: 4, borderWidth: 1, padding: 16 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerTxt:    { flex: 1, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  closeBtn:     { padding: 4 },
  divider:      { height: 1, backgroundColor: '#1e293b', marginBottom: 12 },
  row:          { flexDirection: 'row', alignItems: 'center', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 8, marginBottom: 6, gap: 10 },
  badge:        { width: 30, height: 30, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badgeTxt:     { fontFamily: FONT.orbitron, fontSize: 14, fontWeight: '900' },
  rowInfo:      { flex: 1 },
  rowLabel:     { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  rowSub:       { color: '#475569', fontSize: 10, marginTop: 1 },
  currentTag:   { borderWidth: 1, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  currentTagTxt:{ fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1 },
  nextSection:  { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1e293b' },
  nextTxt:      { fontSize: 11, fontFamily: FONT.orbitron },
  reqRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  reqLabel:     { flex: 1, color: '#475569', fontSize: 9, fontFamily: FONT.orbitron, letterSpacing: 0.5 },
  reqVal:       { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 0.5 },
  reqMet:       { color: '#22c55e' },
  reqFail:      { color: '#ef4444' },
})

const am = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: '#000000ee', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:     { backgroundColor: '#050810', borderRadius: 16, padding: SPACING.xl, width: '100%', alignItems: 'center', borderWidth: 2 },
  system:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 3, marginBottom: 4 },
  header:   { color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2, marginBottom: SPACING.md },
  iconWrap: { width: 88, height: 88, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  title:    { fontFamily: FONT.orbitron, fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.sm, textAlign: 'center' },
  desc:     { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg },
  rewardRow:{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl },
  reward:   { color: C.gold, fontFamily: FONT.orbitron, fontSize: 18, fontWeight: '900' },
  btn:      { borderWidth: 1, borderRadius: 10, paddingVertical: 14, paddingHorizontal: SPACING.xl },
  btnTxt:   { fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
})
