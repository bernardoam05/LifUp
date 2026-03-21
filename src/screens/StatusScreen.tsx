import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

// Renders a MCI icon with 'help-circle' as fallback for unknown icon names
function SafeIcon({ name, size, color, style }: { name: string; size: number; color: string; style?: object }) {
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
  ])
  const safeName = KNOWN_SAFE.has(name) ? name : 'help-circle'
  return <Icon name={safeName} size={size} color={color} style={style} />
}
import useGameStore, { getRank, xpForLevel, RankKey } from '../store/useGameStore'
import { ACHIEVEMENTS_CATALOG, Achievement } from '../data/achievements'
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
      <View style={sp.kpiRow}>
        <KPICard icon="trophy" color={C.gold}     label="Missões"       value={String(stats.totalCompleted)} />
        <KPICard icon="calendar-star" color="#a855f7" label="Dias Perfeitos" value={String(stats.perfectDays)} />
        <KPICard icon="timer-outline" color={C.neonBlue} label="Foco"
          value={hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`} />
      </View>

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

// ── Achievement Detail Modal ────────────────────────────────────────────────────

function AchievementDetailModal({
  achievement, done, onClose,
}: { achievement: Achievement; done: boolean; onClose: () => void }) {
  const secret = achievement.isSecret && !done
  const color  = done ? achievement.color : '#475569'
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={am.overlay}>
        <View style={[am.card, { borderColor: color + '44' }]}>

          {/* Header */}
          <View style={am.headerRow}>
            <Text style={am.headerLabel}>[ CONQUISTA ]</Text>
            <TouchableOpacity onPress={onClose} style={am.closeBtn}>
              <Icon name="close" size={16} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Icon */}
          <View style={[am.iconWrap, { backgroundColor: color + '18' }]}>
            <SafeIcon
              name={secret ? 'help-circle-outline' : achievement.icon}
              size={36}
              color={color}
            />
          </View>

          {/* Title */}
          <Text style={[am.title, { color: done ? achievement.color : C.muted }]}>
            {secret ? '???' : achievement.title}
          </Text>

          {/* Badges */}
          <View style={am.badgesRow}>
            <View style={am.categoryBadge}>
              <Text style={am.categoryTxt}>{achievement.category.toUpperCase()}</Text>
            </View>
            {achievement.isSecret && (
              <View style={[am.categoryBadge, { borderColor: '#a855f744' }]}>
                <Text style={[am.categoryTxt, { color: '#a855f7' }]}>SECRETO</Text>
              </View>
            )}
            {done && (
              <View style={[am.categoryBadge, { borderColor: C.green + '44' }]}>
                <Icon name="check-circle" size={9} color={C.green} />
                <Text style={[am.categoryTxt, { color: C.green }]}> DESBLOQUEADO</Text>
              </View>
            )}
          </View>

          <View style={am.divider} />

          {/* Description */}
          <Text style={am.desc}>
            {secret ? '???' : achievement.description}
          </Text>

          {/* Reward */}
          <View style={am.rewardRow}>
            <Icon name="rhombus" size={12} color={C.gold} />
            <Text style={am.rewardTxt}> {achievement.rewardGold} G</Text>
            {achievement.rewardXP != null && (
              <Text style={am.rewardXP}>{'  '}+{achievement.rewardXP} XP</Text>
            )}
          </View>

        </View>
      </View>
    </Modal>
  )
}

// ── Achievements panel ─────────────────────────────────────────────────────────

function AchievementsPanel({ onSelect }: { onSelect: (a: Achievement, done: boolean) => void }) {
  const unlockedIds = useGameStore(s => s.unlockedAchievements)
  const unlockedSet = new Set(unlockedIds)
  const total       = ACHIEVEMENTS_CATALOG.length
  const unlocked    = unlockedIds.length

  return (
    <View style={ac.container}>
      <View style={ac.header}>
        <Text style={ac.headerTxt}>CONQUISTAS</Text>
        <View style={ac.badge}>
          <Text style={ac.badgeTxt}>{unlocked}/{total}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ac.grid}>
        {ACHIEVEMENTS_CATALOG.map(a => {
          const done   = unlockedSet.has(a.id)
          const secret = a.isSecret && !done
          const color  = done ? a.color : '#334155'
          return (
            <TouchableOpacity
              key={a.id}
              style={[ac.card, { borderColor: done ? color + '66' : '#1e293b' }]}
              onPress={() => onSelect(a, done)}
              activeOpacity={0.75}
            >
              <View style={[ac.iconWrap, { backgroundColor: color + (done ? '20' : '10') }]}>
                <SafeIcon
                  name={secret ? 'help-circle-outline' : a.icon}
                  size={22}
                  color={done ? a.color : '#475569'}
                />
              </View>
              <Text style={[ac.cardTitle, { color: done ? a.color : '#475569' }]} numberOfLines={2}>
                {secret ? '???' : a.title}
              </Text>
              <Text style={[ac.cardGold, { color: done ? C.gold : '#334155' }]}>◈{a.rewardGold}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function StatusScreen() {
  const player   = useGameStore(st => st.player)
  const rank     = getRank(player.level)
  const xpNeeded = xpForLevel(player.level)
  const xpPct    = Math.min((player.xp / xpNeeded) * 100, 100)

  const [selectedAch, setSelectedAch] = useState<{ a: Achievement; done: boolean } | null>(null)

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <View style={s.titleRow}>
          <Text style={s.pageTitle}>STATUS WINDOW</Text>
        </View>

        {/* Rank card */}
        <View style={[s.rankCard, { borderColor: rank.color + '66' }]}>
          <View style={[s.rankBadge, { borderColor: C.neonBlue }]}>
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
        <SectionHeader icon="trending-up" label="ATRIBUTOS" />
        <View style={s.statsBlock}>
          <StatBar label="STR" value={player.str} />
          <StatBar label="AGI" value={player.agi} />
          <StatBar label="INT" value={player.int} />
          <StatBar label="VIT" value={player.vit} />
        </View>

        {/* Hunter Statistics */}
        <SectionHeader icon="trophy-outline" label="ESTATÍSTICAS DO CAÇADOR" />
        <StatisticsPanel />

        {/* Shadows */}
        {player.shadows.length > 0 && (
          <>
            <SectionHeader icon="ghost" label="EXÉRCITO DAS SOMBRAS" />
            <View style={s.shadowsBlock}>
              {player.shadows.map((name, i) => (
                <View key={i} style={s.shadowRow}>
                  <Icon name="ghost" size={14} color="#a855f7" />
                  <Text style={s.shadowName}>{name}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Achievements */}
        <SectionHeader icon="star-circle-outline" label="CONQUISTAS" />
        <AchievementsPanel onSelect={(a, done) => setSelectedAch({ a, done })} />

      </ScrollView>

      {selectedAch && (
        <AchievementDetailModal
          achievement={selectedAch.a}
          done={selectedAch.done}
          onClose={() => setSelectedAch(null)}
        />
      )}

    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: C.bg },
  content:    { padding: SPACING.md, paddingBottom: SPACING.xl },
  titleRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  pageTitle:  { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },
  rankCard:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderRadius: 4, padding: SPACING.md, gap: 12, marginBottom: 12 },
  rankBadge:  { width: 52, height: 52, borderRadius: 4, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
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
  xpTrack:    { height: 8, backgroundColor: '#050f1e', borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: C.neonBlue + '30' },
  xpFill:     { height: '100%', backgroundColor: C.neonBlue, borderRadius: 0 },
  xpSub:      { color: C.dimmed, fontSize: 10, marginTop: 4 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, marginTop: 4 },
  sectionTitle:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },

  statsBlock: { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, borderWidth: 1, borderColor: C.border, marginBottom: SPACING.lg },
  statRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 12 },
  statIcon:   { width: 20 },
  statLabel:  { fontFamily: FONT.orbitron, fontSize: 10, width: 32 },
  track:      { flex: 1, height: 5, backgroundColor: C.border, borderRadius: 0, overflow: 'hidden' },
  fill:       { height: '100%', borderRadius: 0 },
  statVal:    { color: '#94a3b8', fontSize: 12, width: 30, textAlign: 'right' },

  shadowsBlock: { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, borderWidth: 1, borderColor: '#a855f733', marginBottom: SPACING.lg, gap: SPACING.sm },
  shadowRow:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  shadowName:   { color: '#a855f7', fontFamily: FONT.orbitron, fontSize: 11 },

  empty:  { color: C.dimmed, fontSize: 12, fontStyle: 'italic', marginBottom: SPACING.lg },
})

const kpi = StyleSheet.create({
  card:  { flex: 1, backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.sm, alignItems: 'center', gap: 4 },
  value: { fontFamily: FONT.orbitron, fontSize: 18, fontWeight: '900' },
  label: { color: C.muted, fontSize: 9, fontFamily: FONT.orbitron, letterSpacing: 1 },
})

const sp = StyleSheet.create({
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
})

const ac = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  header:    { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  headerTxt: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  badge:     { backgroundColor: C.neonBlue + '22', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.neonBlue + '44' },
  badgeTxt:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9 },
  grid:      { gap: SPACING.sm, paddingBottom: 4, paddingRight: 4 },
  card:      {
    width: 80, backgroundColor: '#0f172a', borderRadius: 4, borderWidth: 1,
    padding: SPACING.sm, alignItems: 'center', gap: 6,
  },
  iconWrap:  { width: 44, height: 44, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5, textAlign: 'center', lineHeight: 11 },
  cardGold:  { fontFamily: FONT.orbitron, fontSize: 8, fontWeight: '700' },
})

const am = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: '#000000dd', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:          { width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.lg, alignItems: 'center' },
  headerRow:     { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: SPACING.md },
  headerLabel:   { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  closeBtn:      { padding: 4 },
  iconWrap:      { width: 72, height: 72, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  title:         { fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginBottom: SPACING.sm },
  badgesRow:     { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md, flexWrap: 'wrap', justifyContent: 'center' },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.neonBlue + '44', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  categoryTxt:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1 },
  divider:       { width: '100%', height: 1, backgroundColor: C.border, marginBottom: SPACING.md },
  desc:          { color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: SPACING.md },
  rewardRow:     { flexDirection: 'row', alignItems: 'center' },
  rewardTxt:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '700' },
  rewardXP:      { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12 },
})
