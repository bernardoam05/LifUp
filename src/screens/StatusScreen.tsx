import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import MissionHistoryModal from './MissionHistoryModal'
import { CATALOG_MAP } from '../data/shopItems'

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
    'cash-multiple','check',
    'snowflake','skull','weather-sunny','star-four-points','heart','mask','rabbit','flower','corn','dragon',
  ])
  const safeName = KNOWN_SAFE.has(name) ? name : 'help-circle'
  return <Icon name={safeName} size={size} color={color} style={style} />
}
import useGameStore, { getRank, xpForLevel, RankKey, LevelUpReward, CLASS_REQUIREMENTS } from '../store/useGameStore'
import {
  ACHIEVEMENTS_CATALOG, Achievement, AchievementProg,
  TIER_COLORS, getActiveTier, getCompletedTier, isAchievementMaxed, getTierIndex,
} from '../data/achievements'
import { SHADOW_MAP, SHADOW_RANK_COLOR, type Shadow } from '../data/shadows'
import { C, FONT, SPACING } from '../theme'
import RankModal from '../components/RankModal'

// Format minutes into "Xh Ym" for focus achievements
function formatMinutes(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`
}

function fmtVal(a: Achievement, val: number): string {
  if (a.conditionType === 'focus_total_hours') return formatMinutes(val)
  return String(val)
}

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

  const totalQuestsByRank = RANK_ORDER.reduce((sum, r) => sum + (stats.questsByRank[r] || 0), 0)
  
  // Counts for extra categories
  const extraCount = stats.questsByRank['Extra' as RankKey] || 0
  const bossCount  = stats.questsByRank['Boss' as RankKey] || 0
  const eventCount = stats.questsByRank['Event' as RankKey] || 0
  
  const categories = [
    ...RANK_ORDER.map(r => ({ id: r, label: r, count: stats.questsByRank[r] || 0, color: RANK_COLORS[r] })),
    { id: 'Extra', label: 'EXTRA', count: extraCount, color: C.gold },
    { id: 'Boss',  label: 'BOSS',  count: bossCount,  color: C.neonRed },
    { id: 'Event', label: 'EVNT',  count: eventCount, color: '#f97316' },
  ]

  const grandTotal = totalQuestsByRank + extraCount + bossCount + eventCount

  return (
    <View style={sp.container}>
      <View style={sp.kpiRow}>
        <KPICard icon="trophy" color={C.gold}     label="Missões"       value={String(stats.totalCompleted)} />
        <KPICard icon="calendar-star" color="#a855f7" label="Dias Perfeitos" value={String(stats.perfectDays)} />
        <KPICard icon="timer-outline" color={C.neonBlue} label="Foco"
          value={hours > 0 ? `${hours}h${minutes}m` : `${minutes}m`} />
      </View>

      <View style={sp.rankSection}>
        <Text style={sp.rankTitle}>DETALHE DE OPERAÇÕES</Text>
        <View style={sp.rankGrid}>
          {categories.map(cat => {
            const pct = grandTotal > 0 ? (cat.count / grandTotal) * 100 : 0
            return (
              <View key={cat.id} style={sp.rankItem}>
                <View style={[sp.rankBadge, { borderColor: cat.color + '44', backgroundColor: cat.color + '0a' }]}>
                  <Text style={[sp.rankLetter, { color: cat.color, fontSize: cat.label.length > 2 ? 7 : 10 }]}>{cat.label}</Text>
                </View>
                <View style={sp.rankBarTrack}>
                  <View style={[sp.rankBarFill, { width: `${pct}%` as any, backgroundColor: cat.color }]} />
                </View>
                <Text style={sp.rankCount}>{cat.count}</Text>
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
  achievement: a, prog, done, onClose,
}: { achievement: Achievement; prog: AchievementProg | undefined; done: boolean; onClose: () => void }) {
  const secret    = a.isSecret && !done && !a.tiers
  const maxed     = a.tiers ? isAchievementMaxed(a, prog) : done
  const activeTier    = getActiveTier(a, prog)
  const completedTier = getCompletedTier(a, prog)
  const displayTier   = maxed ? a.tiers?.[a.tiers.length - 1] : (completedTier ?? activeTier)
  const tierColor     = displayTier ? TIER_COLORS[displayTier.rank] : a.color
  const cardColor     = a.tiers ? (maxed ? C.gold : completedTier ? tierColor : '#475569') : (done ? a.color : '#475569')

  // Progress bar for active tier
  const currentVal  = prog?.currentValue ?? 0
  const tierIdx     = prog?.currentTierIndex ?? 0
  const prevTarget  = a.tiers && tierIdx > 0 ? a.tiers[tierIdx - 1].targetValue : 0
  const thisTarget  = activeTier?.targetValue ?? 1
  const pct = a.tiers
    ? (maxed ? 100 : Math.min(100, ((currentVal - prevTarget) / (thisTarget - prevTarget)) * 100))
    : (done ? 100 : 0)

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={am.overlay}>
        <View style={[am.card, { borderColor: cardColor + '66' }]}>

          {/* Header */}
          <View style={am.headerRow}>
            <Text style={am.headerLabel}>[ CONQUISTA ]</Text>
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
                  {maxed ? displayTier.rank.toUpperCase() : `→ ${displayTier.rank.toUpperCase()}`}
                </Text>
              </View>
            )}
          </View>

          {/* Badges */}
          <View style={am.badgesRow}>
            <View style={am.categoryBadge}>
              <Text style={am.categoryTxt}>{a.category.toUpperCase()}</Text>
            </View>
            {a.isSecret && (
              <View style={[am.categoryBadge, { borderColor: '#a855f744' }]}>
                <Text style={[am.categoryTxt, { color: '#a855f7' }]}>SECRETO</Text>
              </View>
            )}
            {maxed && (
              <View style={[am.categoryBadge, { borderColor: C.gold + '66' }]}>
                <Icon name="check-circle" size={9} color={C.gold} />
                <Text style={[am.categoryTxt, { color: C.gold }]}> MAX</Text>
              </View>
            )}
            {!a.tiers && done && (
              <View style={[am.categoryBadge, { borderColor: C.green + '44' }]}>
                <Icon name="check-circle" size={9} color={C.green} />
                <Text style={[am.categoryTxt, { color: C.green }]}> DESBLOQUEADO</Text>
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
                const isCompleted = i < tierIdx
                const isActive    = i === tierIdx
                const tc = TIER_COLORS[tier.rank]
                return (
                  <View key={tier.rank} style={[am.tierRow, isActive && { backgroundColor: tc + '12' }]}>
                    <View style={[am.tierDot, { borderColor: tc, backgroundColor: isCompleted ? tc : 'transparent' }]}>
                      {isCompleted && <Icon name="check" size={8} color="#000" />}
                    </View>
                    <Text style={[am.tierRowRank, { color: isCompleted ? tc : isActive ? tc : C.dimmed }]}>
                      {tier.rank.toUpperCase()}
                    </Text>
                    <Text style={[am.tierRowTarget, { color: isCompleted || isActive ? C.muted : C.dimmed }]}>
                      {fmtVal(a, tier.targetValue)}
                    </Text>
                    <Text style={[am.tierRowReward, { color: isCompleted ? C.gold : C.dimmed }]}>
                      +{tier.rewardGold}G{tier.rewardXP ? ` +${tier.rewardXP}XP` : ''}
                    </Text>
                  </View>
                )
              })}
            </View>
          )}

          {/* Progress bar (active tier) */}
          {a.tiers && !secret && !maxed && activeTier && (
            <View style={am.progSection}>
              <View style={am.progHeader}>
                <Text style={am.progLabel}>PROGRESSO ATUAL</Text>
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
              <Text style={am.maxLabel}>[ MAX ]</Text>
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
      </View>
    </Modal>
  )
}

// ── Shadow Detail Modal (Status screen) ─────────────────────────────────────────

function ShadowDetailModal({
  shadow,
  level,
  playerLevel,
  onClose,
}: {
  shadow:      Shadow | undefined
  level:       number
  playerLevel: number
  onClose:     () => void
}) {
  const isHidden = playerLevel < 10
  const rankColor = shadow ? (SHADOW_RANK_COLOR[shadow.rank as keyof typeof SHADOW_RANK_COLOR] ?? C.purple) : C.purple

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={sdm.overlay}>
        <View style={[sdm.card, { borderColor: rankColor + '66' }]}>
          <Text style={sdm.title}>{isHidden ? 'SOMBRA MISTERIOSA' : (shadow?.name ?? 'SOMBRA DESCONHECIDA')}</Text>
          {isHidden ? (
            <Text style={sdm.mysteryTxt}>
              Um sussurro antigo observa-te das sombras.\nAlcança o nível 10 para revelar a verdadeira forma.
            </Text>
          ) : (
            <>
              <View style={[sdm.rankBadge, { borderColor: rankColor + '66' }]}>
                <Text style={[sdm.rankTxt, { color: rankColor }]}>{shadow?.rank.toUpperCase() ?? '???'}</Text>
              </View>
              <Text style={sdm.subTxt}>{shadow?.lore ?? 'Sem registo disponível.'}</Text>
              <Text style={[sdm.levelTxt, { color: rankColor }]}>NÍVEL {level}</Text>
              <View style={[sdm.effectRow, { borderColor: rankColor + '44', backgroundColor: rankColor + '10' }]}>
                <Icon name="lightning-bolt" size={12} color={rankColor} />
                <Text style={[sdm.effectTxt, { color: rankColor }]}>
                  {' '} {shadow?.passiveEffect?.description ?? 'Efeito desconhecido'}
                </Text>
              </View>
            </>
          )}
          <TouchableOpacity style={sdm.closeBtn} onPress={onClose}>
            <Text style={sdm.closeTxt}>FECHAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Achievements panel ─────────────────────────────────────────────────────────

function AchievementsPanel({ onSelect }: {
  onSelect: (a: Achievement, prog: AchievementProg | undefined, done: boolean) => void
}) {
  const unlockedIds         = useGameStore(s => s.unlockedAchievements)
  const achievementProgress = useGameStore(s => s.achievementProgress)
  const unlockedSet = new Set(unlockedIds)
  const total    = ACHIEVEMENTS_CATALOG.length
  const unlocked = ACHIEVEMENTS_CATALOG.filter(a =>
    unlockedSet.has(a.id) || (a.tiers && isAchievementMaxed(a, achievementProgress[a.id]))
  ).length

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
          const prog          = achievementProgress[a.id]
          const fullyDone     = unlockedSet.has(a.id) || (a.tiers ? isAchievementMaxed(a, prog) : false)
          const secret        = a.isSecret && !fullyDone && !a.tiers
          const completedTier = getCompletedTier(a, prog)
          const activeTier    = getActiveTier(a, prog)
          const maxed         = a.tiers ? isAchievementMaxed(a, prog) : fullyDone

          // Card colour: gold if maxed, tier colour if in progress, grey if not started
          const displayTier = maxed ? a.tiers?.[a.tiers.length - 1] : completedTier
          const cardColor   = a.tiers
            ? (maxed ? C.gold : completedTier ? TIER_COLORS[completedTier.rank] : '#334155')
            : (fullyDone ? a.color : '#334155')
          const iconColor   = a.tiers
            ? (maxed ? C.gold : completedTier ? TIER_COLORS[completedTier.rank] : '#475569')
            : (fullyDone ? a.color : '#475569')

          // Mini progress bar: % within current tier
          const currentVal = prog?.currentValue ?? 0
          const tierIdx    = getTierIndex(prog)
          const prevTarget = a.tiers && tierIdx > 0 ? a.tiers[tierIdx - 1].targetValue : 0
          const thisTarget = activeTier?.targetValue ?? 1
          const progressPct = (a.tiers && !maxed && activeTier)
            ? Math.min(100, ((currentVal - prevTarget) / (thisTarget - prevTarget)) * 100)
            : (maxed ? 100 : 0)

          return (
            <TouchableOpacity
              key={a.id}
              style={[ac.card, { borderColor: cardColor + (fullyDone || completedTier ? '88' : '33') }]}
              onPress={() => onSelect(a, prog, fullyDone)}
              activeOpacity={0.75}
            >
              <View style={[ac.iconWrap, { backgroundColor: iconColor + '18' }]}>
                <SafeIcon
                  name={secret ? 'help-circle-outline' : a.icon}
                  size={22}
                  color={iconColor}
                />
              </View>

              {/* Tier badge on card */}
              {displayTier && (
                <View style={[ac.tierChip, { borderColor: TIER_COLORS[displayTier.rank] }]}>
                  <Text style={[ac.tierChipTxt, { color: TIER_COLORS[displayTier.rank] }]}>
                    {maxed ? '★' : displayTier.rank.slice(0, 2).toUpperCase()}
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
          )
        })}
      </ScrollView>
    </View>
  )
}

// ── Level Up Reward Modal ──────────────────────────────────────────────────────

function LevelUpRewardModal({ reward, onClose }: { reward: LevelUpReward; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={lm.overlay}>
        <View style={lm.card}>

          <Text style={lm.title}>[ LEVEL UP ]</Text>
          <Text style={lm.levelTxt}>NÍVEL {reward.level}</Text>

          <View style={lm.divider} />

          {reward.items.length > 0 ? (
            <>
              <Text style={lm.rewardLabel}>RECOMPENSA AUTOMÁTICA</Text>
              {reward.items.map((id, i) => {
                const item = CATALOG_MAP[id]
                if (!item) return null
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
                )
              })}
            </>
          ) : (
            <Text style={lm.noReward}>Continua a subir de nível para receber recompensas.</Text>
          )}

          <TouchableOpacity style={lm.btn} onPress={onClose}>
            <Text style={lm.btnTxt}>[ CONTINUAR ]</Text>
          </TouchableOpacity>

        </View>
      </View>
    </Modal>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function StatusScreen() {
  const player             = useGameStore(st => st.player)
  const statistics         = useGameStore(st => st.statistics)
  const bossesDefeated     = useGameStore(st => st.system.bossesDefeated)
  const customShadows      = useGameStore(st => st.customShadows)
  const levelUpReward      = useGameStore(st => st.levelUpReward)
  const dismissLevelUpReward = useGameStore(st => st.dismissLevelUpReward)

  const rank     = getRank(player.level, statistics.totalCompleted, bossesDefeated, statistics.questsByRank)
  const xpNeeded = xpForLevel(player.level)
  const xpPct    = Math.min((player.xp / xpNeeded) * 100, 100)

  const [selectedAch, setSelectedAch] = useState<{ a: Achievement; prog: AchievementProg | undefined; done: boolean } | null>(null)
  const [selectedShadow, setSelectedShadow] = useState<{ id: string; level: number } | null>(null)
  const [showRankInfo, setShowRankInfo] = useState(false)
  const [showHistory,  setShowHistory]  = useState(false)

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <View style={s.titleRow}>
          <Text style={s.pageTitle}>STATUS WINDOW</Text>
        </View>

        {/* Rank card */}
        <View style={[s.rankCard, { borderColor: rank.color + '66' }]}>
          <TouchableOpacity
            style={[s.rankBadge, { borderColor: C.neonBlue }]}
            onPress={() => setShowRankInfo(true)}
            activeOpacity={0.75}
          >
            <Text style={[s.rankBig, { color: rank.color }]}>{rank.rank}</Text>
          </TouchableOpacity>
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

        {/* Mission History button */}
        <TouchableOpacity style={s.historyBtn} onPress={() => setShowHistory(true)} activeOpacity={0.75}>
          <Icon name="database-outline" size={13} color={C.neonBlue} />
          <Text style={s.historyBtnTxt}> [ REGISTOS DO SISTEMA ]</Text>
          <Icon name="chevron-right" size={14} color={C.dimmed} />
        </TouchableOpacity>

        {/* Achievements */}
        <SectionHeader icon="star-circle-outline" label="CONQUISTAS" />
        <AchievementsPanel onSelect={(a, prog, done) => setSelectedAch({ a, prog, done })} />

        {/* Shadows */}
        {player.shadows.length > 0 && (
          <>
            <SectionHeader icon="ghost" label="EXÉRCITO DAS SOMBRAS" />
            <View style={s.shadowsBlock}>
              {player.shadows.map((entry, i) => {
                const data = SHADOW_MAP[entry.id] ?? customShadows.find(cs => cs.id === entry.id)
                const name = data?.name ?? entry.id
                return (
                  <TouchableOpacity key={i} style={s.shadowRow} onPress={() => setSelectedShadow({ id: entry.id, level: entry.level })} activeOpacity={0.75}>
                    <Icon name={data?.icon || "ghost"} size={14} color={data?.color || "#a855f7"} />
                    <Text style={[s.shadowName, { color: data?.color || '#fff' }]}>{name}</Text>
                    {entry.level > 1 && <Text style={s.shadowLevel}>Lv.{entry.level}</Text>}
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}

      </ScrollView>

      {selectedAch && (
        <AchievementDetailModal
          achievement={selectedAch.a}
          prog={selectedAch.prog}
          done={selectedAch.done}
          onClose={() => setSelectedAch(null)}
        />
      )}

      {selectedShadow && (
        <ShadowDetailModal
          shadow={SHADOW_MAP[selectedShadow.id] ?? customShadows.find(cs => cs.id === selectedShadow.id)}
          level={selectedShadow.level}
          playerLevel={player.level}
          onClose={() => setSelectedShadow(null)}
        />
      )}

      {showRankInfo && (
        <RankModal
          level={player.level}
          totalCompleted={statistics.totalCompleted}
          bossesDefeated={bossesDefeated}
          questsByRank={statistics.questsByRank}
          onClose={() => setShowRankInfo(false)}
        />
      )}

      {showHistory && (
        <MissionHistoryModal onClose={() => setShowHistory(false)} />
      )}

      {levelUpReward && (
        <LevelUpRewardModal reward={levelUpReward} onClose={dismissLevelUpReward} />
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
  shadowName:   { color: '#a855f7', fontFamily: FONT.orbitron, fontSize: 11, flex: 1 },
  shadowLevel:  { color: '#a855f799', fontFamily: FONT.orbitron, fontSize: 9 },

  empty:  { color: C.dimmed, fontSize: 12, fontStyle: 'italic', marginBottom: SPACING.lg },

  historyBtn:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.neonBlue + '44', borderRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: 10, marginBottom: SPACING.lg },
  historyBtnTxt: { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
})

const kpi = StyleSheet.create({
  card:  { flex: 1, backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.sm, alignItems: 'center', gap: 4 },
  value: { fontFamily: FONT.orbitron, fontSize: 18, fontWeight: '900' },
  label: { color: C.muted, fontSize: 9, fontFamily: FONT.orbitron, letterSpacing: 1 },
})

const sdm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: '#000000ee', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:      { width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 2, padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm },
  title:     { color: '#fff', fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2, textAlign: 'center' },
  mysteryTxt:{ color: C.dimmed, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: SPACING.sm },
  rankBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  rankTxt:   { fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  subTxt:    { color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  levelTxt:  { fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 1 },
  effectRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 6, gap: 6 },
  effectTxt: { fontSize: 11 },
  closeBtn:  { marginTop: SPACING.sm, paddingVertical: 8, paddingHorizontal: SPACING.xl, borderWidth: 1, borderColor: C.border },
  closeTxt:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
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
  cardTitle:  { fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5, textAlign: 'center', lineHeight: 11 },
  cardGold:   { fontFamily: FONT.orbitron, fontSize: 8, fontWeight: '700' },
  miniTrack:  { width: '100%', height: 3, backgroundColor: '#0f172a', borderRadius: 0, overflow: 'hidden', marginTop: 2 },
  miniFill:   { height: '100%', backgroundColor: C.neonBlue, borderRadius: 0 },
  tierChip:   { borderWidth: 1, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  tierChipTxt:{ fontFamily: FONT.orbitron, fontSize: 6, letterSpacing: 0.5, fontWeight: '700' },
  maxTag:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1 },
})

const am = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: '#000000dd', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
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
  progTrack:     { height: 6, backgroundColor: '#050f1e', borderRadius: 0, overflow: 'hidden', borderWidth: 1, borderColor: C.neonBlue + '30' },
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
})

const rm = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: '#000000dd', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:         { width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.lg },
  headerRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  headerTxt:    { flex: 1, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  closeBtn:     { padding: 4 },
  divider:      { height: 1, backgroundColor: C.border, marginBottom: SPACING.md },
  row:          { flexDirection: 'row', alignItems: 'center', borderRadius: 4, paddingVertical: 8, paddingHorizontal: SPACING.sm, marginBottom: 6, gap: SPACING.sm },
  badge:        { width: 30, height: 30, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badgeTxt:     { fontFamily: FONT.orbitron, fontSize: 14, fontWeight: '900' },
  rowInfo:      { flex: 1 },
  rowLabel:     { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  rowSub:       { color: C.dimmed, fontSize: 10, marginTop: 1 },
  currentTag:   { borderWidth: 1, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  currentTagTxt:{ fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1 },
  nextSection:  { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: C.border },
  nextTxt:      { fontSize: 11, flex: 1, fontFamily: FONT.orbitron },
  reqRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  reqLabel:     { flex: 1, color: C.dimmed, fontSize: 9, fontFamily: FONT.orbitron, letterSpacing: 0.5 },
  reqVal:       { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 0.5 },
  reqMet:       { color: '#22c55e' },
  reqFail:      { color: '#ef4444' },
})

const lm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: '#000000ee', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:      { width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.neonBlue + '55', padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm },
  title:     { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 4 },
  levelTxt:  { color: '#fff', fontFamily: FONT.orbitron, fontSize: 28, fontWeight: '900' },
  divider:   { width: '100%', height: 1, backgroundColor: C.border },
  rewardLabel: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, alignSelf: 'flex-start' },
  itemRow:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, padding: SPACING.sm, gap: SPACING.sm, width: '100%' },
  itemIcon:  { width: 40, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  itemInfo:  { flex: 1 },
  itemName:  { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  itemDesc:  { color: C.muted, fontSize: 11, lineHeight: 15 },
  noReward:  { color: C.dimmed, fontSize: 11, textAlign: 'center' },
  btn:       { marginTop: SPACING.sm, borderWidth: 1, borderColor: C.neonBlue + '66', borderRadius: 4, paddingVertical: 10, paddingHorizontal: SPACING.xl },
  btnTxt:    { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
})
