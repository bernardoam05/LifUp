import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { ShadowEntry, getShadowReleaseGold } from '../store/useGameStore'
import {
  SHADOW_MAP, SHADOW_BY_RANK, SHADOW_RANK_COLOR,
  Shadow, ShadowRank, PassiveEffectType,
} from '../data/shadows'
import { C, FONT, SPACING } from '../theme'

// ── Config ─────────────────────────────────────────────────────────────────────

const MAX_ACTIVE = 3
const RANK_ORDER: ShadowRank[] = ['Marshal', 'Commander', 'Knight', 'Elite', 'Normal']

const RANK_LABELS: Record<ShadowRank, string> = {
  Marshal:   'MARECHAL',
  Commander: 'COMANDANTE',
  Knight:    'CAVALEIRO',
  Elite:     'ELITE',
  Normal:    'NORMAL',
}

const RANK_SHORT: Record<ShadowRank, string> = {
  Marshal:   'MAR',
  Commander: 'COM',
  Knight:    'KNI',
  Elite:     'ELI',
  Normal:    'NOR',
}

const PASSIVE_LABELS: Record<PassiveEffectType, string> = {
  gold_boost:        'Bónus de Gold',
  xp_boost:         'Bónus de XP',
  penalty_immunity: 'Imunidade a Penalidade',
  penalty_reduce:   'Redução de Penalidade',
  streak_protect:   'Proteção de Streak',
  shop_discount:    'Desconto na Loja',
  focus_bonus:      'Bónus de Focus',
  boss_bonus_xp:    'Bónus XP de Boss',
  daily_bonus:      'XP Diário Grátis',
}

function formatPassiveValue(type: PassiveEffectType, value: number): string {
  switch (type) {
    case 'gold_boost':
    case 'xp_boost':
    case 'boss_bonus_xp':
    case 'penalty_reduce':
      return `+${Math.round(value * 100)}%`
    case 'shop_discount':
      return `-${Math.round(value * 100)}%`
    case 'penalty_immunity':
    case 'streak_protect':
      return `${value}× / semana`
    case 'focus_bonus':
      return `+${value} min / sessão`
    case 'daily_bonus':
      return `+${value} XP / dia`
    default:
      return String(value)
  }
}

function scaledValue(base: number, level: number): number {
  return base * (1 + (level - 1) * 0.1)
}

// ── Locked screen ─────────────────────────────────────────────────────────────

function LockedScreen({ currentLevel }: { currentLevel: number }) {
  return (
    <View style={lk.container}>
      <View style={lk.glowWrap}>
        <Icon name="skull-crossbones" size={72} color="#ef4444" style={lk.icon} />
      </View>
      <Text style={lk.title}>SALA DO TRONO</Text>
      <View style={lk.divider} />
      <Text style={lk.body}>
        {"O teu corpo ainda é demasiado\nfraco para suportar a Morte.\n\nAtinge o Nível 10 para o\nDespertar."}
      </Text>
      <View style={lk.progressRow}>
        <View style={lk.progressTrack}>
          <View style={[lk.progressFill, { width: `${(currentLevel / 10) * 100}%` as any }]} />
        </View>
        <Text style={lk.progressTxt}>NVL {currentLevel} / 10</Text>
      </View>
      <View style={lk.sealRow}>
        <Icon name="lock" size={11} color="#ef444466" />
        <Text style={lk.sealTxt}> DESPERTAR BLOQUEADO</Text>
      </View>
    </View>
  )
}

// ── Passive summary card ───────────────────────────────────────────────────────

function PassiveSummaryCard({
  entries,
  activeShadowIds,
  shadowLookup,
}: {
  entries:         ShadowEntry[]
  activeShadowIds: string[]
  shadowLookup:    Record<string, Shadow>
}) {
  const activeEntries = entries.filter(e => activeShadowIds.includes(e.id))
  if (activeEntries.length === 0) return (
    <View style={ps.emptyContainer}>
      <Icon name="sword-off" size={14} color={C.dimmed} />
      <Text style={ps.emptyTxt}> Nenhuma sombra na Vanguarda — passivas inativas</Text>
    </View>
  )

  const totals: Partial<Record<PassiveEffectType, number>> = {}
  for (const { id, level } of activeEntries) {
    const shadow = shadowLookup[id]
    if (!shadow) continue
    const { type, value } = shadow.passiveEffect
    totals[type] = (totals[type] ?? 0) + scaledValue(value, level)
  }

  const rows = Object.entries(totals) as [PassiveEffectType, number][]

  return (
    <View style={ps.container}>
      <View style={ps.header}>
        <Icon name="shield-sword" size={12} color={C.gold} />
        <Text style={ps.title}> VANGUARDA ATIVA ({activeEntries.length}/{MAX_ACTIVE})</Text>
      </View>
      <View style={ps.grid}>
        {rows.map(([type, value]) => (
          <View key={type} style={ps.row}>
            <Text style={ps.label}>{PASSIVE_LABELS[type]}</Text>
            <Text style={ps.value}>{formatPassiveValue(type, value)}</Text>
          </View>
        ))}
      </View>
      <View style={ps.vanguardRow}>
        {activeEntries.map(e => (
          <View key={e.id} style={[ps.vanguardIconWrap, { borderColor: (shadowLookup[e.id] as any)?.color ?? C.gold }]}>
             <Icon name={(shadowLookup[e.id] as any)?.icon ?? 'ghost'} size={24} color={(shadowLookup[e.id] as any)?.color ?? C.gold} />
             <View style={ps.vanguardLvl}>
               <Text style={ps.vanguardLvlTxt}>LV.{e.level}</Text>
             </View>
          </View>
        ))}
      </View>
      <Text style={ps.note}>{entries.length} sombras na coleção · {activeEntries.length} na Vanguarda</Text>
    </View>
  )
}

// ── Release confirmation modal ─────────────────────────────────────────────────

function ReleaseConfirmModal({
  shadow,
  gold,
  onConfirm,
  onCancel,
}: {
  shadow:    Shadow
  gold:      number
  onConfirm: () => void
  onCancel:  () => void
}) {
  const isCustom   = (shadow as any).type === 'Custom'
  const rankColor  = isCustom ? '#a855f7' : SHADOW_RANK_COLOR[shadow.rank as ShadowRank]

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel}>
      <View style={rel.overlay}>
        <View style={rel.card}>
          <Icon name="alert-circle-outline" size={36} color={C.neonRed} style={{ marginBottom: SPACING.sm }} />
          <Text style={rel.title}>LIBERTAR SOMBRA</Text>
          <View style={[rel.shadowRow, { borderColor: rankColor + '44', backgroundColor: rankColor + '0d' }]}>
            <Icon name={shadow.icon} size={20} color={rankColor} />
            <Text style={[rel.shadowName, { color: rankColor }]}>{shadow.name}</Text>
          </View>
          <Text style={rel.warning}>
            {gold > 0
              ? `Recebes ${gold}G mas a sombra é libertada permanentemente.\nSe a recuperares, voltará ao Nível 1.`
              : 'Sombras custom não têm valor. A sombra será libertada permanentemente.\nSe a recuperares, voltará ao Nível 1.'}
          </Text>
          <View style={rel.btnRow}>
            <TouchableOpacity style={rel.cancelBtn} onPress={onCancel}>
              <Text style={rel.cancelTxt}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={rel.confirmBtn} onPress={onConfirm}>
              <Icon name="sword-cross" size={14} color={C.neonRed} />
              <Text style={rel.confirmTxt}> LIBERTAR{gold > 0 ? ` +${gold}G` : ''}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// ── Shadow detail modal ────────────────────────────────────────────────────────

function ShadowDetailModal({
  shadow,
  level,
  isActive,
  canEquipMore,
  shadowLookup,
  onClose,
  onToggleActive,
  onRelease,
}: {
  shadow:       Shadow
  level:        number
  isActive:     boolean
  canEquipMore: boolean
  shadowLookup: Record<string, Shadow>
  onClose:      () => void
  onToggleActive: () => void
  onToggleFavorite: () => void
  onRelease:    () => void
  isFavorite:   boolean
}) {
  const isCustom   = (shadow as any).type === 'Custom'
  const rankColor  = isCustom ? '#a855f7' : SHADOW_RANK_COLOR[shadow.rank as ShadowRank]
  const baseValue  = shadow.passiveEffect.value
  const scaledVal  = scaledValue(baseValue, level)
  const releaseGold = getShadowReleaseGold(shadow, level)

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={dm.overlay}>
        <View style={[dm.card, { borderColor: rankColor + '66' }]}>
          {isActive && (
            <View style={[dm.activeBadge, { borderColor: '#facc15', backgroundColor: '#facc1518' }]}>
              <Icon name="shield-sword" size={10} color="#facc15" />
              <Text style={dm.activeBadgeTxt}> VANGUARDA ATIVA</Text>
            </View>
          )}

          <TouchableOpacity
            style={dm.favBtn}
            onPress={onToggleFavorite}
            activeOpacity={0.7}
          >
            <Icon name={isFavorite ? "star" : "star-outline"} size={22} color={isFavorite ? "#facc15" : "#94a3b8"} />
          </TouchableOpacity>

          <View style={[dm.iconWrap, { backgroundColor: rankColor + '18', borderColor: rankColor + '44' }]}>
            <Icon name={shadow.icon} size={48} color={rankColor} />
          </View>

          <View style={[dm.rankBadge, { borderColor: rankColor }]}>
            <Text style={[dm.rankTxt, { color: rankColor }]}>
              {isCustom ? 'CUSTOM' : RANK_LABELS[shadow.rank as ShadowRank]}
            </Text>
          </View>

          <Text style={[dm.name, { color: rankColor }]}>{shadow.name}</Text>

          <View style={dm.levelRow}>
            <Icon name="chevron-up-circle" size={12} color={rankColor} />
            <Text style={[dm.levelTxt, { color: rankColor }]}> NÍV. {level}</Text>
          </View>

          <Text style={dm.lore}>{shadow.lore}</Text>

          <View style={[dm.effectRow, { borderColor: rankColor + '44', backgroundColor: rankColor + '0e' }]}>
            <Icon name="lightning-bolt" size={13} color={rankColor} />
            <Text style={[dm.effectTxt, { color: rankColor }]}>
              {' '}{shadow.passiveEffect.description}
              {level > 1 && ` (×${(1 + (level - 1) * 0.1).toFixed(1)})`}
            </Text>
          </View>

          {level > 1 && (
            <Text style={dm.scaledHint}>
              {formatPassiveValue(shadow.passiveEffect.type, baseValue)}
              {' → '}
              {formatPassiveValue(shadow.passiveEffect.type, scaledVal)}
            </Text>
          )}

          {/* Equip/Unequip button */}
          <TouchableOpacity
            style={[
              dm.equipBtn,
              isActive
                ? { borderColor: '#facc1566', backgroundColor: '#facc1510' }
                : (!canEquipMore && { opacity: 0.45 }),
            ]}
            onPress={isActive || canEquipMore ? onToggleActive : undefined}
            activeOpacity={0.8}
          >
            <Icon
              name={isActive ? 'shield-off-outline' : 'shield-sword'}
              size={14}
              color={isActive ? '#facc15' : C.neonBlue}
            />
            <Text style={[dm.equipTxt, { color: isActive ? '#facc15' : C.neonBlue }]}>
              {isActive ? ' RETIRAR DA VANGUARDA' : canEquipMore ? ' EQUIPAR VANGUARDA' : ` VANGUARDA CHEIA (${MAX_ACTIVE}/${MAX_ACTIVE})`}
            </Text>
          </TouchableOpacity>

          {/* Release button */}
          <TouchableOpacity style={dm.releaseBtn} onPress={onRelease}>
            <Icon name="sword-cross" size={12} color={C.neonRed} />
            <Text style={dm.releaseTxt}>
              {' LIBERTAR SOMBRA'}
              {releaseGold > 0 ? ` · +${releaseGold}G` : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[dm.closeBtn, { borderColor: rankColor + '88' }]} onPress={onClose}>
            <Text style={[dm.closeTxt, { color: rankColor }]}>DISPENSAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Shadow card ───────────────────────────────────────────────────────────────

function ShadowCard({
  shadow,
  level,
  isActive,
  isFavorite,
  onPress,
}: {
  shadow:   Shadow
  level:    number
  isActive: boolean
  isFavorite: boolean
  onPress:  () => void
}) {
  const isCustom  = (shadow as any).type === 'Custom'
  const rankColor = isCustom ? '#a855f7' : SHADOW_RANK_COLOR[shadow.rank as ShadowRank]
  const scaledVal = scaledValue(shadow.passiveEffect.value, level)

  return (
    <TouchableOpacity
      style={[
        sc.card,
        {
          borderColor: isActive ? '#facc15' : rankColor + '44',
          backgroundColor: isActive ? '#facc150d' : rankColor + '08',
        },
        isActive && sc.cardActive,
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[sc.iconWrap, { backgroundColor: rankColor + '12' }]}>
        <Icon name={shadow.icon} size={22} color={rankColor} />
      </View>
      
      <View style={sc.info}>
        <View style={sc.nameRow}>
          {isFavorite && <Icon name="star" size={10} color="#facc15" style={{ marginRight: 4 }} />}
          <Text style={[sc.name, { color: rankColor }]}>{shadow.name}</Text>
        </View>
        <Text style={sc.effect} numberOfLines={1}>
          {formatPassiveValue(shadow.passiveEffect.type, scaledVal)} {PASSIVE_LABELS[shadow.passiveEffect.type]}
        </Text>
      </View>
 
      <View style={sc.rightSide}>
        <View style={[sc.rankBadge, { borderColor: rankColor + '44' }]}>
          <Text style={[sc.rankTxt, { color: rankColor }]}>{isCustom ? 'CST' : RANK_SHORT[shadow.rank as ShadowRank]}</Text>
        </View>
        <Text style={[sc.lvlTxt, { color: rankColor }]}>LV.{level}</Text>
      </View>
    </TouchableOpacity>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function ShadowsScreen() {
  const level            = useGameStore(s => s.player.level)
  const shadowEntries    = useGameStore(s => s.player.shadows) as ShadowEntry[]
  const activeShadowIds  = useGameStore(s => s.player.activeShadowIds)
  const customShadows    = useGameStore(s => s.customShadows)
  const toggleActive     = useGameStore(s => s.toggleActiveShadow)
  const toggleFavorite   = useGameStore(s => s.toggleFavoriteShadow)
  const releaseShadow    = useGameStore(s => s.releaseShadow)

  const [selected, setSelected]   = useState<{ shadow: Shadow; level: number } | null>(null)
  const [toRelease, setToRelease] = useState<{ shadow: Shadow; level: number; gold: number } | null>(null)

  if (level < 10) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['bottom']}>
        <LockedScreen currentLevel={level} />
      </SafeAreaView>
    )
  }

  // Build unified lookup: standard + custom shadows
  const customMap: Record<string, Shadow> = {}
  for (const sh of customShadows) customMap[sh.id] = sh
  const shadowLookup: Record<string, Shadow> = { ...SHADOW_MAP, ...customMap }

  // Separate entries into standard and custom
  const standardEntries = shadowEntries.filter(e => !customMap[e.id] && SHADOW_MAP[e.id])
  const customEntries   = shadowEntries.filter(e => !!customMap[e.id])

  // Level map
  const levelMap: Record<string, number> = {}
  for (const e of shadowEntries) levelMap[e.id] = e.level

  const totalCount   = shadowEntries.length
  const canEquipMore = activeShadowIds.length < MAX_ACTIVE

  function openRelease(shadow: Shadow, lvl: number) {
    setSelected(null)
    const gold = getShadowReleaseGold(shadow, lvl)
    setToRelease({ shadow, level: lvl, gold })
  }

  function confirmRelease() {
    if (!toRelease) return
    releaseShadow(toRelease.shadow.id)
    setToRelease(null)
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <Text style={s.pageTitle}>SALA DO TRONO</Text>
        <Text style={s.pageSub}>EXÉRCITO DAS SOMBRAS — {totalCount} UNIDADE{totalCount !== 1 ? 'S' : ''}</Text>

        {totalCount === 0 ? (
          <View style={s.emptyWrap}>
            <Icon name="ghost-outline" size={52} color="#a855f733" />
            <Text style={s.emptyTitle}>EXÉRCITO VAZIO</Text>
            <Text style={s.emptyDesc}>
              {"Derrota Bosses nos Dungeon Raids (Sex/Sáb/Dom) para\nconquistar sombras para o teu exército."}
            </Text>
          </View>
        ) : (
          <>
            <PassiveSummaryCard
              entries={shadowEntries}
              activeShadowIds={activeShadowIds}
              shadowLookup={shadowLookup}
            />

            {/* Standard rank groups */}
            {RANK_ORDER.map(rank => {
              const shadows = SHADOW_BY_RANK[rank].filter(sh =>
                standardEntries.some(e => e.id === sh.id)
              )
              if (shadows.length === 0) return null
              const rankColor = SHADOW_RANK_COLOR[rank]
              return (
                <View key={rank} style={s.rankGroup}>
                  <View style={s.rankHeader}>
                    <View style={[s.rankDot, { backgroundColor: rankColor }]} />
                    <Text style={[s.rankLabel, { color: rankColor }]}>{RANK_LABELS[rank]}</Text>
                    <View style={[s.rankCountBadge, { borderColor: rankColor + '44' }]}>
                      <Text style={[s.rankCount, { color: rankColor }]}>{shadows.length}</Text>
                    </View>
                  </View>
                  {shadows.map(shadow => (
                    <ShadowCard
                      key={shadow.id}
                      shadow={shadow}
                      level={levelMap[shadow.id] ?? 1}
                      isActive={activeShadowIds.includes(shadow.id)}
                      isFavorite={!!standardEntries.find(e => e.id === shadow.id)?.isFavorite}
                      onPress={() => setSelected({ shadow, level: levelMap[shadow.id] ?? 1 })}
                    />
                  ))}
                </View>
              )
            })}

            {/* Custom shadows group */}
            {customEntries.length > 0 && (
              <View style={s.rankGroup}>
                <View style={s.rankHeader}>
                  <View style={[s.rankDot, { backgroundColor: '#a855f7' }]} />
                  <Text style={[s.rankLabel, { color: '#a855f7' }]}>CUSTOM</Text>
                  <View style={[s.rankCountBadge, { borderColor: '#a855f744' }]}>
                    <Text style={[s.rankCount, { color: '#a855f7' }]}>{customEntries.length}</Text>
                  </View>
                </View>
                {customEntries.map(({ id, level: lvl }) => {
                  const shadow = customMap[id]
                  if (!shadow) return null
                  return (
                    <ShadowCard
                      key={id}
                      shadow={shadow}
                      level={lvl}
                      isActive={activeShadowIds.includes(id)}
                      isFavorite={!!customEntries.find(e => e.id === id)?.isFavorite}
                      onPress={() => setSelected({ shadow, level: lvl })}
                    />
                  )
                })}
              </View>
            )}
          </>
        )}

      </ScrollView>

      {selected && (
        <ShadowDetailModal
          shadow={selected.shadow}
          level={selected.level}
          isActive={activeShadowIds.includes(selected.shadow.id)}
          isFavorite={!!shadowEntries.find(e => e.id === selected.shadow.id)?.isFavorite}
          canEquipMore={canEquipMore}
          shadowLookup={shadowLookup}
          onClose={() => setSelected(null)}
          onToggleActive={() => {
            toggleActive(selected.shadow.id)
            setSelected(null)
          }}
          onToggleFavorite={() => toggleFavorite(selected.shadow.id)}
          onRelease={() => openRelease(selected.shadow, selected.level)}
        />
      )}

      {toRelease && (
        <ReleaseConfirmModal
          shadow={toRelease.shadow}
          gold={toRelease.gold}
          onConfirm={confirmRelease}
          onCancel={() => setToRelease(null)}
        />
      )}
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: C.bg },
  content:   { padding: SPACING.md, paddingBottom: SPACING.xl },
  pageTitle: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 4, marginBottom: 2 },
  pageSub:   { color: C.muted, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 2, marginBottom: SPACING.lg },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyTitle: { color: '#a855f766', fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2 },
  emptyDesc:  { color: C.dimmed, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  rankGroup:      { marginBottom: SPACING.lg },
  rankHeader:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  rankDot:        { width: 8, height: 8, borderRadius: 4 },
  rankLabel:      { fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2, flex: 1 },
  rankCountBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  rankCount:      { fontFamily: FONT.orbitron, fontSize: 9, fontWeight: '700' },
})

const lk = StyleSheet.create({
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, backgroundColor: '#000' },
  glowWrap:     { marginBottom: SPACING.lg },
  icon:         { opacity: 0.55 },
  title:        { color: '#ef444488', fontFamily: FONT.orbitron, fontSize: 18, letterSpacing: 5, marginBottom: SPACING.sm },
  divider:      { width: 80, height: 1, backgroundColor: '#ef444433', marginBottom: SPACING.lg },
  body:         { color: '#475569', fontSize: 14, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg, width: '100%' },
  progressTrack:{ flex: 1, height: 4, backgroundColor: '#1a0505', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#ef4444', borderRadius: 2 },
  progressTxt:  { color: '#ef444488', fontFamily: FONT.orbitron, fontSize: 9 },
  sealRow:      { flexDirection: 'row', alignItems: 'center' },
  sealTxt:      { color: '#ef444444', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
})

const ps = StyleSheet.create({
  container:      { backgroundColor: C.panel, borderRadius: 12, borderWidth: 1, borderColor: '#facc1544', padding: SPACING.md, marginBottom: SPACING.lg },
  emptyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: SPACING.sm, marginBottom: SPACING.md },
  emptyTxt:       { color: C.dimmed, fontSize: 11, fontStyle: 'italic' },
  header:         { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  title:          { color: '#facc15', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  grid:           { gap: 8, marginBottom: SPACING.md },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:          { color: '#94a3b8', fontSize: 12 },
  value:          { color: C.gold, fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  vanguardRow:    { flexDirection: 'row', gap: 10, marginTop: 4, marginBottom: 8 },
  vanguardIconWrap: { width: 50, height: 50, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  vanguardLvl:    { position: 'absolute', bottom: -5, right: -5, backgroundColor: '#000', borderRadius: 4, paddingHorizontal: 4, borderWidth: 1, borderColor: '#333' },
  vanguardLvlTxt: { color: '#fff', fontSize: 7, fontWeight: '900', fontFamily: FONT.orbitron },
  note:           { color: C.dimmed, fontSize: 10, fontStyle: 'italic' },
})

const sc = StyleSheet.create({
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 10, borderWidth: 1, padding: SPACING.sm, marginBottom: 6, gap: SPACING.sm },
  cardActive:  { backgroundColor: '#facc1508' },
  iconWrap:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info:        { flex: 1 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'wrap' },
  name:        { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  lvlBadge:    { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  lvlTxt:      { fontFamily: FONT.orbitron, fontSize: 8, fontWeight: '700' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#facc1520', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  activeBadgeTxt: { fontFamily: FONT.orbitron, fontSize: 7, color: '#facc15', fontWeight: '700' },
  effect:      { color: C.muted, fontSize: 10 },
  rightSide:   { alignItems: 'flex-end', gap: 4 },
  rankBadge:   { borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  rankTxt:     { fontFamily: FONT.orbitron, fontSize: 7, fontWeight: '700' },
})

const dm = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: '#000000ee', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:         { backgroundColor: '#07050f', borderRadius: 16, padding: SPACING.xl, width: '100%', alignItems: 'center', borderWidth: 2 },
  activeBadge:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: SPACING.sm },
  activeBadgeTxt: { fontFamily: FONT.orbitron, fontSize: 8, color: '#facc15', letterSpacing: 2 },
  iconWrap:     { width: 88, height: 88, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  rankBadge:    { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, marginBottom: SPACING.sm },
  rankTxt:      { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 3 },
  name:         { fontFamily: FONT.orbitron, fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: 4, textAlign: 'center' },
  levelRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  levelTxt:     { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  lore:         { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 20, fontStyle: 'italic', marginBottom: SPACING.md },
  effectRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 8, marginBottom: SPACING.sm, width: '100%' },
  effectTxt:    { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', flex: 1 },
  favBtn:       { position: 'absolute', top: 20, right: 20, padding: 10, zIndex: 10 },
  scaledHint:   { color: C.muted, fontSize: 10, marginBottom: SPACING.md, fontStyle: 'italic' },
  equipBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.neonBlue + '66', borderRadius: 8, paddingVertical: 10, paddingHorizontal: SPACING.md, width: '100%', marginBottom: SPACING.sm },
  equipTxt:     { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  releaseBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 8, paddingVertical: 8, paddingHorizontal: SPACING.md, width: '100%', marginBottom: SPACING.lg },
  releaseTxt:   { fontFamily: FONT.orbitron, fontSize: 9, color: C.neonRed, letterSpacing: 1 },
  closeBtn:     { borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: SPACING.xl },
  closeTxt:     { fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
})

const rel = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: '#000000ee', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:       { backgroundColor: '#0d0508', borderRadius: 16, padding: SPACING.xl, width: '100%', alignItems: 'center', borderWidth: 2, borderColor: C.neonRed + '44' },
  title:      { fontFamily: FONT.orbitron, fontSize: 13, letterSpacing: 3, color: C.neonRed, marginBottom: SPACING.md },
  shadowRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.md, width: '100%' },
  shadowName: { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  warning:    { color: '#94a3b8', fontSize: 12, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg },
  btnRow:     { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  cancelBtn:  { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelTxt:  { fontFamily: FONT.orbitron, fontSize: 10, color: C.muted, letterSpacing: 1 },
  confirmBtn: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: C.neonRed + '66', borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.neonRed + '10' },
  confirmTxt: { fontFamily: FONT.orbitron, fontSize: 10, color: C.neonRed, fontWeight: '700' },
})
