import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { getRank, xpForLevel, RankKey } from '../store/useGameStore'
import { C, FONT, SPACING } from '../theme'

// ── Config ─────────────────────────────────────────────────────────────────────

const ATTR_ICONS: Record<string, { icon: string; color: string }> = {
  STR: { icon: 'arm-flex',    color: '#ef4444' },
  AGI: { icon: 'run-fast',    color: '#22c55e' },
  INT: { icon: 'brain',       color: C.neonBlue },
  VIT: { icon: 'heart-pulse', color: '#a855f7' },
}

const RANK_ORDER: RankKey[] = ['E', 'D', 'C', 'B', 'A', 'S']
const RANK_COLORS: Record<RankKey, string> = {
  E: '#94a3b8', D: '#22c55e', C: '#3b82f6', B: '#a855f7', A: '#f59e0b', S: '#ef4444',
}

// ── Stat bar ───────────────────────────────────────────────────────────────────

function StatBar({ label, value }: { label: string; value: number }) {
  const { icon, color } = ATTR_ICONS[label]
  const pct = Math.min((value / 100) * 100, 100)
  return (
    <View style={s.statRow}>
      <Icon name={icon} size={16} color={color} style={s.statIcon} />
      <Text style={[s.statLabel, { color }]}>{label}</Text>
      <View style={s.track}>
        <View style={[s.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={s.statVal}>{value}</Text>
    </View>
  )
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={s.sectionHeader}>
      <Icon name={icon} size={12} color={C.neonBlue} />
      <Text style={s.sectionTitle}> {label}</Text>
    </View>
  )
}

// ── Statistics panel ───────────────────────────────────────────────────────────

function StatisticsPanel() {
  const stats = useGameStore(st => st.statistics)

  const hours   = Math.floor(stats.totalFocusMinutes / 60)
  const minutes = stats.totalFocusMinutes % 60

  const totalQuestsByRank = RANK_ORDER.reduce((sum, r) => sum + stats.questsByRank[r], 0)

  return (
    <View style={sp.container}>

      {/* Top KPIs */}
      <View style={sp.kpiRow}>
        <KPICard icon="trophy" color={C.gold}     label="Missões"    value={String(stats.totalCompleted)} />
        <KPICard icon="calendar-star" color="#a855f7" label="Dias Perfeitos" value={String(stats.perfectDays)} />
        <KPICard icon="timer-outline" color={C.neonBlue} label="Foco"
          value={hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`} />
      </View>

      {/* Missions by rank */}
      <View style={sp.rankSection}>
        <Text style={sp.rankTitle}>MISSÕES POR RANK</Text>
        <View style={sp.rankGrid}>
          {RANK_ORDER.map(rank => {
            const count = stats.questsByRank[rank]
            const color = RANK_COLORS[rank]
            const pct   = totalQuestsByRank > 0 ? (count / totalQuestsByRank) * 100 : 0
            return (
              <View key={rank} style={sp.rankItem}>
                <View style={[sp.rankBadge, { borderColor: color }]}>
                  <Text style={[sp.rankLetter, { color }]}>{rank}</Text>
                </View>
                <View style={sp.rankBarTrack}>
                  <View style={[sp.rankBarFill, { width: `${pct}%` as any, backgroundColor: color }]} />
                </View>
                <Text style={sp.rankCount}>{count}</Text>
              </View>
            )
          })}
        </View>
      </View>

    </View>
  )
}

function KPICard({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <View style={[kpi.card, { borderColor: color + '44' }]}>
      <Icon name={icon} size={20} color={color} />
      <Text style={[kpi.value, { color }]}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function StatusScreen() {
  const player   = useGameStore(st => st.player)
  const rank     = getRank(player.level)
  const xpNeeded = xpForLevel(player.level)
  const xpPct    = Math.min((player.xp / xpNeeded) * 100, 100)

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={s.pageTitle}>STATUS WINDOW</Text>

        {/* Rank card */}
        <View style={[s.rankCard, { borderColor: rank.color + '66' }]}>
          <View style={[s.rankBadge, { borderColor: rank.color }]}>
            <Text style={[s.rankBig, { color: rank.color }]}>{rank.rank}</Text>
          </View>
          <View style={s.rankInfo}>
            <Text style={s.playerName}>{player.name}</Text>
            <Text style={[s.rankLabel, { color: rank.color }]}>{rank.label}</Text>
            <Text style={s.lvlText}>NÍVEL {player.level}</Text>
          </View>
          <View style={s.goldBlock}>
            <Icon name="rhombus" size={22} color={C.gold} />
            <Text style={s.goldAmt}>{player.gold.toLocaleString()}</Text>
          </View>
        </View>

        {/* XP bar */}
        <View style={s.xpSection}>
          <View style={s.xpHeader}>
            <Text style={s.xpLabel}>EXPERIÊNCIA</Text>
            <Text style={s.xpNumbers}>{player.xp} / {xpNeeded} XP</Text>
          </View>
          <View style={s.xpTrack}>
            <View style={[s.xpFill, { width: `${xpPct}%` as any }]} />
          </View>
          <Text style={s.xpSub}>Próximo nível: {xpNeeded - player.xp} XP em falta</Text>
        </View>

        {/* Attributes */}
        <SectionHeader icon="chart-radar" label="ATRIBUTOS" />
        <View style={s.statsBlock}>
          <StatBar label="STR" value={player.str} />
          <StatBar label="AGI" value={player.agi} />
          <StatBar label="INT" value={player.int} />
          <StatBar label="VIT" value={player.vit} />
        </View>

        {/* Hunter Statistics */}
        <SectionHeader icon="medal-outline" label="ESTATÍSTICAS DO CAÇADOR" />
        <StatisticsPanel />

        {/* Inventory */}
        <SectionHeader icon="bag-personal" label="INVENTÁRIO" />
        {player.inventory.length === 0
          ? <Text style={s.empty}>Nenhum item. Compra na Loja do Focus Mode.</Text>
          : player.inventory.map(e => (
              <View key={e.itemId} style={s.invRow}>
                <Icon name="cube-outline" size={16} color={C.muted} />
                <Text style={s.invId}>{e.itemId}</Text>
                <Text style={s.invQty}>×{e.quantity}</Text>
              </View>
            ))
        }

      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: C.bg },
  content:    { padding: SPACING.md, paddingBottom: SPACING.xl },
  pageTitle:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3, marginBottom: SPACING.md },

  rankCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderRadius: 12, padding: SPACING.md, gap: 12, marginBottom: 12 },
  rankBadge:  { width: 52, height: 52, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rankBig:    { fontSize: 28, fontFamily: FONT.orbitron, fontWeight: '900' },
  rankInfo:   { flex: 1 },
  playerName: { color: '#fff', fontFamily: FONT.orbitron, fontSize: 14, fontWeight: '700' },
  rankLabel:  { fontSize: 11, marginTop: 2 },
  lvlText:    { color: C.muted, fontSize: 11, marginTop: 2 },
  goldBlock:  { alignItems: 'center', gap: 2 },
  goldAmt:    { color: C.gold, fontWeight: '700', fontSize: 14 },

  xpSection:  { marginBottom: SPACING.lg },
  xpHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel:    { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  xpNumbers:  { color: C.muted, fontSize: 10 },
  xpTrack:    { height: 8, backgroundColor: C.neonBlue + '18', borderRadius: 4, overflow: 'hidden' },
  xpFill:     { height: '100%', backgroundColor: C.neonBlue, borderRadius: 4 },
  xpSub:      { color: C.dimmed, fontSize: 10, marginTop: 4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, marginTop: 4 },
  sectionTitle:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },

  statsBlock: { backgroundColor: C.panel, borderRadius: 10, padding: SPACING.md, borderWidth: 1, borderColor: C.border, marginBottom: SPACING.lg },
  statRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 12 },
  statIcon:   { width: 20 },
  statLabel:  { fontFamily: FONT.orbitron, fontSize: 10, width: 32 },
  track:      { flex: 1, height: 5, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  fill:       { height: '100%', borderRadius: 3 },
  statVal:    { color: '#94a3b8', fontSize: 12, width: 30, textAlign: 'right' },

  empty:  { color: C.dimmed, fontSize: 12, fontStyle: 'italic', marginBottom: SPACING.lg },
  invRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: C.panel, borderRadius: 8, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: C.border },
  invId:  { flex: 1, color: '#94a3b8', fontSize: 13 },
  invQty: { color: C.gold, fontWeight: '700' },
})

const kpi = StyleSheet.create({
  card:  { flex: 1, backgroundColor: C.panel, borderRadius: 10, borderWidth: 1, padding: SPACING.sm, alignItems: 'center', gap: 4 },
  value: { fontFamily: FONT.orbitron, fontSize: 18, fontWeight: '900' },
  label: { color: C.muted, fontSize: 9, fontFamily: FONT.orbitron, letterSpacing: 1 },
})

const sp = StyleSheet.create({
  container:    { marginBottom: SPACING.lg },
  kpiRow:       { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  rankSection:  { backgroundColor: C.panel, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: SPACING.md },
  rankTitle:    { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, marginBottom: SPACING.md },
  rankGrid:     { gap: SPACING.sm },
  rankItem:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  rankBadge:    { width: 28, height: 28, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rankLetter:   { fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '900' },
  rankBarTrack: { flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  rankBarFill:  { height: '100%', borderRadius: 2, minWidth: 2 },
  rankCount:    { color: C.muted, fontSize: 12, fontFamily: FONT.orbitron, width: 28, textAlign: 'right' },
})
