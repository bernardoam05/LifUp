import React, { useEffect } from 'react'
import { View, Text, StyleSheet, StatusBar, Modal, TouchableOpacity, Vibration } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { NavigationContainer, DarkTheme } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { getRank, xpForLevel } from './src/store/useGameStore'
import { setupNotifications, requestNotificationPermission } from './src/utils/notifications'

import StatusScreen    from './src/screens/StatusScreen'
import QuestScreen     from './src/screens/QuestScreen'
import ShopScreen      from './src/screens/ShopScreen'
import InventoryScreen from './src/screens/InventoryScreen'
import FocusScreen     from './src/screens/FocusScreen'
import { C, FONT, SPACING } from './src/theme'

const Tab = createBottomTabNavigator()

// ── Penalty Modal (scary) ──────────────────────────────────────────────────────

function PenaltyModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  useEffect(() => {
    if (visible) Vibration.vibrate([0, 300, 100, 300, 100, 600])
  }, [visible])

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <View style={pm.overlay}>
        <View style={pm.card}>
          <Icon name="alert-octagon" size={48} color={C.neonRed} style={{ marginBottom: SPACING.md }} />
          <Text style={pm.warning}>⚠ AVISO DO SISTEMA ⚠</Text>
          <Text style={pm.title}>ZONA DE PENALIDADE</Text>
          <Text style={pm.message}>
            {"Falhaste as Missões Diárias de ontem.\n\nFoste movido para a Zona de Penalidade.\n\n"}
            <Text style={{ color: C.neonRed, fontWeight: '900' }}>20% da tua XP foi deduzida.</Text>
            {"\n\nCompleta as missões de penalização para escapar."}
          </Text>
          <TouchableOpacity style={pm.btn} onPress={onDismiss}>
            <Text style={pm.btnTxt}>ENTENDIDO, HUNTER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── HUD ────────────────────────────────────────────────────────────────────────

function SystemHUD() {
  const player   = useGameStore(s => s.player)
  const rank     = getRank(player.level)
  const xpNeeded = xpForLevel(player.level)
  const xpPct    = Math.min((player.xp / xpNeeded) * 100, 100)
  const focusOn  = useGameStore(s => s.system.focusModeActive)

  return (
    <View style={hud.container}>
      <View style={hud.row}>
        <View style={[hud.badge, { borderColor: rank.color }]}>
          <Text style={[hud.badgeText, { color: rank.color }]}>{rank.rank}</Text>
        </View>
        <View style={hud.info}>
          <View style={hud.nameRow}>
            <Text style={hud.name} numberOfLines={1}>{player.name}</Text>
            <Text style={hud.level}> LVL {player.level}</Text>
            <View style={{ flex: 1 }} />
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
}

// ── App Root ───────────────────────────────────────────────────────────────────

export default function App() {
  const bootSystem        = useGameStore(s => s.bootSystem)
  const hasPenalty        = useGameStore(s => s.system.hasPenalty)
  const penaltyTriggered  = useGameStore(s => s.system.penaltyTriggered)
  const dismissPenalty    = useGameStore(s => s.dismissPenaltyModal)
  const inventory         = useGameStore(s => s.player.inventory)
  const invTotal          = inventory.reduce((sum, e) => sum + e.quantity, 0)

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

        <SystemHUD />

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
          </Tab.Navigator>
        </NavigationContainer>

        {/* Scary penalty modal */}
        <PenaltyModal visible={penaltyTriggered} onDismiss={dismissPenalty} />

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
  xpRow:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  xpText:     { color: C.dimmed, fontSize: 9 },
  focusTag:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
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
  card:     { backgroundColor: '#0a0005', borderRadius: 16, padding: SPACING.xl, width: '100%', alignItems: 'center', borderWidth: 2, borderColor: C.neonRed + '88' },
  warning:  { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 3, marginBottom: SPACING.sm },
  title:    { color: '#fff', fontFamily: FONT.orbitron, fontSize: 20, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.md },
  message:  { color: '#94a3b8', fontSize: 13, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  btn:      { backgroundColor: C.neonRed + '22', borderWidth: 1, borderColor: C.neonRed, borderRadius: 10, paddingVertical: 14, paddingHorizontal: SPACING.xl },
  btnTxt:   { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2 },
})
