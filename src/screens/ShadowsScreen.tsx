import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SystemModal from '../components/SystemModal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore, { ShadowEntry, getShadowReleaseGold } from '../store/useGameStore';
import { getShadowUpgradeCost } from '../store/helpers';
import {
  SHADOW_MAP, SHADOW_BY_RANK, SHADOW_RANK_COLOR,
  Shadow, ShadowRank, PassiveEffectType,
} from '../data/shadows';
import { CATALOG_MAP } from '../data/shopItems';
import { useTheme, FONT, SPACING } from '../theme';


// ── Config ─────────────────────────────────────────────────────────────────────

const MAX_ACTIVE = 3;
const RANK_ORDER: ShadowRank[] = ['Marshal', 'Commander', 'Knight', 'Elite', 'Normal'];

const RANK_LABELS: Record<ShadowRank, string> = {
  Marshal:   'MARECHAL',
  Commander: 'COMANDANTE',
  Knight:    'CAVALEIRO',
  Elite:     'ELITE',
  Normal:    'NORMAL',
};

const RANK_SHORT: Record<ShadowRank, string> = {
  Marshal:   'MAR',
  Commander: 'COM',
  Knight:    'CAV',
  Elite:     'ELI',
  Normal:    'NOR',
};

const PASSIVE_LABELS: Record<PassiveEffectType, string> = {
  gold_boost:        'Bónus de Gold',
  xp_boost:         'Bónus de XP',
  penalty_immunity: 'Imunidade a Penalidade',
  penalty_reduce:   'Redução de Penalidade',
  streak_protect:   'Proteção de Streak',
  shop_discount:    'Desconto na Loja',
  focus_mastery:    'Maestria de Focus',
  boss_bonus_xp:    'Bónus XP de Boss',
  arise_resonance:  'Ressonância de Arise',
  loot_perception:  'Percepção de Loot',
  daily_bonus:      'XP Diário Grátis',
  all_stats_boost:  'Bónus Global (XP/Gold)',
};

type SortKey = 'rank' | 'level' | 'favorite';
type FilterKey = 'all' | 'favorite' | ShadowRank;

function formatPassiveValue(type: PassiveEffectType, value: number): string {
  switch (type) {
    case 'gold_boost':
    case 'xp_boost':
    case 'boss_bonus_xp':
    case 'penalty_reduce':
      return `+${Math.round(value * 100)}%`;
    case 'shop_discount':
      return `-${Math.round(value * 100)}%`;
    case 'penalty_immunity':
    case 'streak_protect':
      return `${value}× / semana`;
    case 'focus_mastery':
      return `-${Math.round(value * 100)}% tempo`;
    case 'arise_resonance':
      return `+${Math.round(value * 100)}% extração`;
    case 'loot_perception':
      return `+${Math.round(value * 100)}% loot`;
    case 'daily_bonus':
      return `+${value} XP / dia`;
    case 'all_stats_boost':
      return `+${Math.round(value * 100)}% Global`;
    default:
      return String(value);
  }
}

function scaledValue(base: number, level: number): number {
  return base * (1 + (level - 1) * 0.12);
}

// ── Locked screen ─────────────────────────────────────────────────────────────

function LockedScreen({ currentLevel, C }: { currentLevel: number; C: any }) {
  const lk = getLKStyles(C);
  return (
    <View style={lk.container}>
      <View style={lk.glowWrap}>
        <Icon name="skull-crossbones" size={72} color="#ef4444" style={lk.icon} />
      </View>
      <Text style={lk.title}>SALA DO TRONO</Text>
      <View style={lk.divider} />
      <Text style={lk.body}>
        {'O teu corpo ainda é demasiado\nfraco para suportar a Morte.\n\nAtinge o Nível 10 para o\nDespertar.'}
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
  );
}

// ── Passive summary card + clickable Vanguard slots ───────────────────────────

function PassiveSummaryCard({
  entries,
  activeShadowIds,
  shadowLookup,
  onVanguardPress,
  C,
}: {
  entries:         ShadowEntry[]
  activeShadowIds: string[]
  shadowLookup:    Record<string, Shadow>
  onVanguardPress: (shadowId: string) => void
  C: any
}) {
  const ps = getPSStyles(C);
  const activeEntries = entries.filter(e => activeShadowIds.includes(e.id));

  if (activeEntries.length === 0) {
    return (
      <View style={ps.emptyContainer}>
        <Icon name="sword-off" size={14} color={C.dimmed} />
        <Text style={ps.emptyTxt}> Nenhuma unidade na Vanguarda — passivas inativas</Text>
      </View>
    );
  }

  const totals: Partial<Record<PassiveEffectType, number>> = {};
  for (const { id, level } of activeEntries) {
    const shadow = shadowLookup[id];
    if (!shadow?.passiveEffect) { continue; }
    const { type, value } = shadow.passiveEffect;
    totals[type] = (totals[type] ?? 0) + scaledValue(value, level);
  }
  const rows = Object.entries(totals) as [PassiveEffectType, number][];

  return (
    <View style={ps.container}>
      <View style={ps.header}>
        <Icon name="shield-sword" size={12} color={C.gold} />
        <Text style={ps.title}> VANGUARDA ({activeEntries.length}/{MAX_ACTIVE})</Text>
      </View>

      {/* Clickable vanguard slots */}
      <View style={ps.vanguardRow}>
        {Array.from({ length: MAX_ACTIVE }).map((_, i) => {
          const entry = activeEntries[i];
          const sh = entry ? shadowLookup[entry.id] : null;
          const rankColor = sh ? (sh.type === 'Custom' ? '#a855f7' : SHADOW_RANK_COLOR[sh.rank]) : C.border;
          return (
            <TouchableOpacity
              key={i}
              style={[ps.vanguardSlot, { borderColor: entry ? rankColor + '99' : C.border, backgroundColor: entry ? rankColor + '10' : C.bg + '60' }]}
              onPress={() => entry && onVanguardPress(entry.id)}
              activeOpacity={entry ? 0.7 : 1}
              disabled={!entry}
            >
              {entry && sh ? (
                <>
                  <Icon name={sh.icon} size={26} color={rankColor} />
                  <Text style={[ps.slotName, { color: rankColor }]} numberOfLines={1}>{sh.name}</Text>
                  <View style={[ps.slotLvl, { borderColor: rankColor + '66' }]}>
                    <Text style={[ps.slotLvlTxt, { color: rankColor }]}>LV.{entry.level}</Text>
                  </View>
                </>
              ) : (
                <Icon name="plus" size={20} color={C.dimmed} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {rows.length > 0 && (
        <View style={ps.grid}>
          {rows.map(([type, value]) => (
            <View key={type} style={ps.row}>
              <Text style={ps.label}>{PASSIVE_LABELS[type]}</Text>
              <Text style={ps.value}>{formatPassiveValue(type, value)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={ps.note}>{entries.length} unidades na coleção</Text>
    </View>
  );
}

// ── Release confirmation modal ─────────────────────────────────────────────────

function ReleaseConfirmModal({
  shadow, gold, onConfirm, onCancel, C,
}: {
  shadow: Shadow; gold: number; onConfirm: () => void; onCancel: () => void; C: any
}) {
  const rel = getRELStyles(C);
  const isCustom  = (shadow as any).type === 'Custom';
  const rankColor = isCustom ? '#a855f7' : SHADOW_RANK_COLOR[shadow.rank as ShadowRank];

  return (
    <SystemModal visible onRequestClose={onCancel}>
      <View style={rel.card}>
        <Icon name="alert-circle-outline" size={36} color={C.neonRed} style={{ marginBottom: SPACING.sm }} />
        <Text style={rel.title}>LIBERTAR UNIDADE</Text>
        <View style={[rel.shadowRow, { borderColor: rankColor + '44', backgroundColor: rankColor + '0d' }]}>
          <Icon name={shadow.icon} size={20} color={rankColor} />
          <Text style={[rel.shadowName, { color: rankColor }]}>{shadow.name}</Text>
        </View>
        <Text style={rel.warning}>
          {gold > 0
            ? `Recebes ${gold}G mas a unidade é libertada permanentemente.\nSe a recuperares, voltará ao Nível 1.`
            : 'Unidades custom não têm valor. Será libertada permanentemente.\nSe a recuperares, voltará ao Nível 1.'}
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
    </SystemModal>
  );
}

// ── Shadow detail modal ────────────────────────────────────────────────────────

function ShadowDetailModal({
  shadow, entry, isActive, canEquipMore,
  playerLevel, inventory, gold, usedShadowSkills,
  onClose, onToggleActive, onToggleFavorite, onRelease, onUpgrade,
  C,
}: {
  shadow:        Shadow
  entry:         ShadowEntry
  isActive:      boolean
  canEquipMore:  boolean
  playerLevel:   number
  inventory:     { itemId: string; quantity: number }[]
  gold:          number
  usedShadowSkills: Record<string, number>
  onClose:       () => void
  onToggleActive: () => void
  onToggleFavorite: () => void
  onRelease:     () => void
  onUpgrade:     () => void
  C: any
}) {
  const dm = getDMStyles(C);
  const level      = entry.level;
  const isFavorite = !!entry.isFavorite;
  const isCustom   = (shadow as any).type === 'Custom';
  const rankColor  = isCustom ? '#a855f7' : SHADOW_RANK_COLOR[shadow.rank as ShadowRank];
  const baseValue  = shadow.passiveEffect.value;
  const scaledVal  = scaledValue(baseValue, level);
  const releaseGold = getShadowReleaseGold(shadow, level);

  const atCap       = level >= playerLevel;
  const upgradeCost = isCustom ? null : getShadowUpgradeCost(shadow, level);
  const hasGold     = upgradeCost ? gold >= upgradeCost.gold : false;
  const currentCopies = entry.copies ?? 0;
  const copiasOk    = upgradeCost ? currentCopies >= upgradeCost.copies : true;
  const itemsOk     = upgradeCost
    ? upgradeCost.items.every(req => {
        const inv = inventory.find(e => e.itemId === req.itemId);
        return !!inv && inv.quantity >= req.quantity;
      })
    : false;
  const canUpgrade = !atCap && !isCustom && hasGold && copiasOk && itemsOk;

  return (
    <SystemModal visible onRequestClose={onClose}>
      <View style={[dm.card, { borderColor: rankColor + '66' }]}>

        {/* Close button — top left */}
        <TouchableOpacity style={dm.closeTopBtn} onPress={onClose} activeOpacity={0.7}>
          <Icon name="close" size={18} color={C.muted} />
        </TouchableOpacity>

        {/* Active badge */}
        {isActive && (
          <View style={[dm.activeBadge, { borderColor: '#facc15', backgroundColor: '#facc1518' }]}>
            <Icon name="shield-sword" size={10} color="#facc15" />
            <Text style={dm.activeBadgeTxt}> VANGUARDA ATIVA</Text>
          </View>
        )}

        {/* Favorite */}
        <TouchableOpacity style={dm.favBtn} onPress={onToggleFavorite} activeOpacity={0.7}>
          <Icon name={isFavorite ? 'star' : 'star-outline'} size={22} color={isFavorite ? '#facc15' : C.muted} />
        </TouchableOpacity>

        {/* Icon */}
        <View style={[dm.iconWrap, { backgroundColor: rankColor + '18', borderColor: rankColor + '55' }]}>
          <Icon name={shadow.icon} size={60} color={rankColor} />
        </View>

        {/* Rank badge */}
        <View style={[dm.rankBadge, { borderColor: rankColor }]}>
          <Text style={[dm.rankTxt, { color: rankColor }]}>
            {isCustom ? 'CUSTOM' : RANK_LABELS[shadow.rank as ShadowRank]}
          </Text>
        </View>

        <Text style={[dm.name, { color: rankColor }]}>{shadow.name}</Text>

        {/* Stats grid */}
        <View style={dm.statsGrid}>
          <View style={dm.statCell}>
            <Text style={dm.statLabel}>NÍVEL</Text>
            <Text style={[dm.statValue, { color: rankColor }]}>{level}</Text>
          </View>
          <View style={dm.statCell}>
            <Text style={dm.statLabel}>RANK</Text>
            <Text style={[dm.statValue, { color: rankColor }]}>{isCustom ? 'CUSTOM' : RANK_SHORT[shadow.rank as ShadowRank]}</Text>
          </View>
          <View style={dm.statCell}>
            <Text style={dm.statLabel}>CÓPIAS</Text>
            <Text style={[dm.statValue, { color: currentCopies > 0 ? '#22c55e' : rankColor }]}>{currentCopies}</Text>
          </View>
          <View style={dm.statCell}>
            <Text style={dm.statLabel}>PASSIVO</Text>
            <Text style={[dm.statValue, { color: rankColor }]}>{formatPassiveValue(shadow.passiveEffect.type, scaledVal)}</Text>
          </View>
        </View>

        {/* Lore */}
        <Text style={dm.lore}>{shadow.lore}</Text>

        {/* Effect row */}
        <View style={[dm.effectRow, { borderColor: rankColor + '44', backgroundColor: rankColor + '0e' }]}>
          <Icon name="lightning-bolt" size={13} color={rankColor} />
          <Text style={[dm.effectTxt, { color: rankColor }]}>
            {' '}{shadow.passiveEffect.description}
            {level > 1 && ` (×${(1 + (level - 1) * 0.12).toFixed(2)})`}
          </Text>
        </View>

        {/* Weekly cooldown badge for streak_protect / penalty_immunity */}
        {(shadow.passiveEffect.type === 'streak_protect' || shadow.passiveEffect.type === 'penalty_immunity') && (() => {
          const skillKey = shadow.passiveEffect.type;
          const lastUsed = usedShadowSkills[skillKey];
          const oneWeekMs = 7 * 24 * 3600_000;
          const now = Date.now();
          const onCooldown = !!lastUsed && (now - lastUsed) < oneWeekMs;
          if (!onCooldown) {
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#22c55e18', borderWidth: 1, borderColor: '#22c55e44', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6, alignSelf: 'flex-start' }}>
                <Icon name="shield-check" size={11} color="#22c55e" />
                <Text style={{ color: '#22c55e', fontFamily: 'Orbitron-Regular', fontSize: 9, marginLeft: 4, letterSpacing: 1 }}>DISPONÍVEL</Text>
              </View>
            );
          }
          const msLeft = oneWeekMs - (now - lastUsed);
          const daysLeft = Math.ceil(msLeft / 86400000);
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef444418', borderWidth: 1, borderColor: '#ef444444', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6, alignSelf: 'flex-start' }}>
              <Icon name="timer-sand" size={11} color="#ef4444" />
              <Text style={{ color: '#ef4444', fontFamily: 'Orbitron-Regular', fontSize: 9, marginLeft: 4, letterSpacing: 1 }}>
                COOLDOWN — {daysLeft} {daysLeft === 1 ? 'DIA' : 'DIAS'}
              </Text>
            </View>
          );
        })()}

        {level > 1 && (
          <Text style={dm.scaledHint}>
            {formatPassiveValue(shadow.passiveEffect.type, baseValue)}
            {' → '}
            {formatPassiveValue(shadow.passiveEffect.type, scaledVal)}
          </Text>
        )}

        {/* ── Upgrade section ──────────────────────────────────────── */}
        {!isCustom && upgradeCost && (
          <View style={[dm.upgradeBox, { borderColor: canUpgrade ? rankColor + '55' : C.border }]}>
            <View style={dm.upgradeHeader}>
              <Icon name="arrow-up-circle-outline" size={13} color={canUpgrade ? rankColor : C.dimmed} />
              <Text style={[dm.upgradeTitle, { color: canUpgrade ? rankColor : C.dimmed }]}>
                {atCap ? ` NÍVEL CAP (NV. JOGADOR ${playerLevel})` : ' EVOLUÇÃO → NV.' + (level + 1)}
              </Text>
            </View>

            {!atCap && (
              <View style={dm.upgradeReqs}>
                {/* Gold */}
                <View style={dm.reqRow}>
                  <Icon name="gold" size={11} color={hasGold ? '#facc15' : C.neonRed} />
                  <Text style={[dm.reqTxt, { color: hasGold ? C.text : C.neonRed }]}>
                    {' '}{upgradeCost.gold}G
                    {!hasGold && `  (tens ${gold}G)`}
                  </Text>
                  {hasGold && <Icon name="check-circle" size={11} color="#22c55e" style={{ marginLeft: 4 }} />}
                </View>
                {/* Copies */}
                {upgradeCost.copies > 0 && (
                  <View style={dm.reqRow}>
                    <Icon name="ghost-outline" size={11} color={copiasOk ? rankColor : C.neonRed} />
                    <Text style={[dm.reqTxt, { color: copiasOk ? C.text : C.neonRed }]}>
                      {' '}Cópias ×{upgradeCost.copies}
                      {!copiasOk && `  (tens ${currentCopies})`}
                    </Text>
                    {copiasOk && <Icon name="check-circle" size={11} color="#22c55e" style={{ marginLeft: 4 }} />}
                  </View>
                )}
                {/* Items */}
                {upgradeCost.items.map(req => {
                  const itemDef = CATALOG_MAP[req.itemId];
                  const owned   = inventory.find(e => e.itemId === req.itemId)?.quantity ?? 0;
                  const ok      = owned >= req.quantity;
                  return (
                    <View key={req.itemId} style={dm.reqRow}>
                      <Icon name={itemDef?.icon ?? 'rhombus-split'} size={11} color={ok ? (itemDef?.color ?? C.muted) : C.neonRed} />
                      <Text style={[dm.reqTxt, { color: ok ? C.text : C.neonRed }]}>
                        {' '}{itemDef?.name ?? req.itemId} ×{req.quantity}
                        {!ok && `  (tens ${owned})`}
                      </Text>
                      {ok && <Icon name="check-circle" size={11} color="#22c55e" style={{ marginLeft: 4 }} />}
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={[dm.upgradeBtn, {
                borderColor: canUpgrade ? rankColor : C.border,
                backgroundColor: canUpgrade ? rankColor + '18' : C.bg,
                opacity: canUpgrade ? 1 : 0.45,
              }]}
              onPress={onUpgrade}
              disabled={!canUpgrade}
              activeOpacity={0.8}
            >
              <Icon name="arrow-up-bold" size={13} color={canUpgrade ? rankColor : C.dimmed} />
              <Text style={[dm.upgradeTxt, { color: canUpgrade ? rankColor : C.dimmed }]}>
                {atCap ? ' NÍVEL MÁXIMO' : canUpgrade ? ' EVOLUIR' : ' RECURSOS INSUFICIENTES'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Equip/Unequip */}
        <TouchableOpacity
          style={[
            dm.equipBtn,
            isActive
              ? { borderColor: '#facc1566', backgroundColor: '#facc1510' }
              : (!canEquipMore && { opacity: 0.45 }),
            { shadowColor: isActive ? '#facc15' : rankColor, shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 5 },
          ]}
          onPress={onToggleActive}
          disabled={!isActive && !canEquipMore}
          activeOpacity={0.8}
        >
          <Icon name={isActive ? 'shield-off-outline' : 'shield-sword'} size={14} color={isActive ? '#facc15' : C.neonBlue} />
          <Text style={[dm.equipTxt, { color: isActive ? '#facc15' : C.neonBlue }]}>
            {isActive ? ' RETIRAR DA VANGUARDA' : canEquipMore ? ' EQUIPAR VANGUARDA' : ` VANGUARDA CHEIA (${MAX_ACTIVE}/${MAX_ACTIVE})`}
          </Text>
        </TouchableOpacity>

        {/* Separator before danger zone */}
        <View style={dm.dangerDivider} />

        {/* Release button — danger zone */}
        <TouchableOpacity style={dm.releaseBtn} onPress={onRelease}>
          <Icon name="sword-cross" size={12} color={C.neonRed} />
          <Text style={dm.releaseTxt}>
            {' LIBERTAR UNIDADE'}
            {releaseGold > 0 ? ` · +${releaseGold}G` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </SystemModal>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

function FilterBar({
  filter, sort, onFilter, onSort, C,
}: {
  filter:   FilterKey
  sort:     SortKey
  onFilter: (f: FilterKey) => void
  onSort:   (s: SortKey) => void
  C: any
}) {
  const fb = getFBStyles(C);
  const filters: { key: FilterKey; label: string; icon?: string }[] = [
    { key: 'all',       label: 'TODOS' },
    { key: 'favorite',  label: 'FAV', icon: 'star' },
    { key: 'Marshal',   label: 'MAR' },
    { key: 'Commander', label: 'COM' },
    { key: 'Knight',    label: 'CAV' },
    { key: 'Elite',     label: 'ELI' },
    { key: 'Normal',    label: 'NOR' },
  ];
  const sorts: { key: SortKey; icon: string }[] = [
    { key: 'rank',     icon: 'crown' },
    { key: 'level',    icon: 'arrow-up-bold' },
    { key: 'favorite', icon: 'star' },
  ];

  return (
    <View style={fb.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={fb.filterScroll} contentContainerStyle={fb.filterRow}>
        {filters.map(f => {
          const rankColor = ['Marshal','Commander','Knight','Elite','Normal'].includes(f.key)
            ? SHADOW_RANK_COLOR[f.key as ShadowRank]
            : C.gold;
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[fb.chip, { borderColor: active ? rankColor : C.border, backgroundColor: active ? rankColor + '20' : 'transparent' }]}
              onPress={() => onFilter(f.key)}
              activeOpacity={0.7}
            >
              {f.icon && <Icon name={f.icon} size={10} color={active ? rankColor : C.dimmed} />}
              <Text style={[fb.chipTxt, { color: active ? rankColor : C.dimmed }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={fb.sortRow}>
        {sorts.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[fb.sortBtn, sort === s.key && { backgroundColor: C.gold + '20' }]}
            onPress={() => onSort(s.key)}
            activeOpacity={0.7}
          >
            <Icon name={s.icon} size={14} color={sort === s.key ? C.gold : C.dimmed} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Shadow card ───────────────────────────────────────────────────────────────

function ShadowCard({
  shadow, level, isActive, isFavorite, onPress, C,
}: {
  shadow: Shadow; level: number; isActive: boolean; isFavorite: boolean; onPress: () => void; C: any
}) {
  const sc = getSCStyles(C);
  const isCustom  = (shadow as any).type === 'Custom';
  const rankColor = isCustom ? '#a855f7' : SHADOW_RANK_COLOR[shadow.rank as ShadowRank];
  const scaledVal = scaledValue(shadow.passiveEffect.value, level);

  return (
    <TouchableOpacity
      style={[sc.card, { borderColor: isActive ? C.gold : rankColor + '44', backgroundColor: isActive ? C.gold + '0a' : C.panel }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[sc.iconWrap, { backgroundColor: rankColor + '12', borderColor: rankColor + '44' }]}>
        <Icon name={shadow.icon} size={28} color={rankColor} />
      </View>

      <View style={sc.info}>
        <View style={sc.nameRow}>
          {isFavorite && <Icon name="star" size={12} color={C.gold} />}
          <Text style={[sc.name, { color: rankColor }]} numberOfLines={1}>{shadow.name.toUpperCase()}</Text>
        </View>
        <Text style={sc.effect} numberOfLines={2}>
          {shadow.passiveEffect.description.replace('{val}', formatPassiveValue(shadow.passiveEffect.type, scaledVal))}
        </Text>
      </View>

      <View style={sc.rightSide}>
        <View style={[sc.rankBadge, { borderColor: rankColor + '66', backgroundColor: rankColor + '12' }]}>
          <Text style={[sc.rankTxt, { color: rankColor }]}>
            {isCustom ? 'CUSTOM' : RANK_LABELS[shadow.rank as ShadowRank].toUpperCase()}
          </Text>
        </View>
        {isActive ? (
          <View style={sc.activeIndicator}>
            <Icon name="shield-sword" size={10} color={C.gold} />
            <Text style={{ color: C.gold, fontSize: 8, fontWeight: 'bold', fontFamily: FONT.orbitron }}>VANGUARDA</Text>
          </View>
        ) : (
          <Text style={[sc.lvlTxt, { color: C.dimmed }]}>NV.{level}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function ShadowsScreen() {
  const C = useTheme();
  const s = getStyles(C);

  const playerLevel    = useGameStore(st => st.player.level);
  const playerGold     = useGameStore(st => st.player.gold);
  const inventory      = useGameStore(st => st.player.inventory);
  const usedShadowSkills = useGameStore(st => st.system.usedShadowSkills ?? {});
  const shadowEntries  = useGameStore(st => st.player.shadows) as ShadowEntry[];
  const activeShadowIds = useGameStore(st => st.player.activeShadowIds);
  const customShadows  = useGameStore(st => st.customShadows);
  const toggleActive   = useGameStore(st => st.toggleActiveShadow);
  const toggleFavorite = useGameStore(st => st.toggleFavoriteShadow);
  const releaseShadow  = useGameStore(st => st.releaseShadow);
  const upgradeShadow  = useGameStore(st => st.upgradeShadow);

  const [selected, setSelected]   = useState<string | null>(null);
  const [toRelease, setToRelease] = useState<{ shadow: Shadow; level: number; gold: number } | null>(null);
  const [filter, setFilter]       = useState<FilterKey>('all');
  const [sort, setSort]           = useState<SortKey>('rank');

  // Build unified lookup (must be before early return — hooks must not be conditional)
  const customMap: Record<string, Shadow> = {};
  for (const sh of customShadows) { customMap[sh.id] = sh; }
  const shadowLookup: Record<string, Shadow> = { ...SHADOW_MAP, ...customMap };

  const levelMap: Record<string, number> = {};
  const favoriteMap: Record<string, boolean> = {};
  for (const e of shadowEntries) { levelMap[e.id] = e.level; favoriteMap[e.id] = !!e.isFavorite; }

  const totalCount   = shadowEntries.length;
  const canEquipMore = activeShadowIds.length < MAX_ACTIVE;

  const allEntries: { shadow: Shadow; entry: ShadowEntry }[] = shadowEntries
    .map(e => ({ shadow: shadowLookup[e.id], entry: e }))
    .filter(({ shadow }) => !!shadow);

  const filtered = useMemo(() => {
    let list = allEntries;
    if (filter === 'favorite') { list = list.filter(x => x.entry.isFavorite); }
    else if (filter !== 'all') { list = list.filter(x => x.shadow.rank === filter || (filter === 'Normal' && x.shadow.type === 'Custom')); }

    const RANK_WEIGHT: Record<string, number> = { Marshal: 5, Commander: 4, Knight: 3, Elite: 2, Normal: 1 };
    list = [...list].sort((a, b) => {
      if (sort === 'rank')     { return (RANK_WEIGHT[b.shadow.rank] ?? 0) - (RANK_WEIGHT[a.shadow.rank] ?? 0); }
      if (sort === 'level')    { return b.entry.level - a.entry.level; }
      if (sort === 'favorite') { return (b.entry.isFavorite ? 1 : 0) - (a.entry.isFavorite ? 1 : 0); }
      return 0;
    });
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shadowEntries, filter, sort]);

  if (playerLevel < 10) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
        <LockedScreen currentLevel={playerLevel} C={C} />
      </SafeAreaView>
    );
  }

  const selectedEntry  = selected ? shadowEntries.find(e => e.id === selected) ?? null : null;
  const selectedShadow = selected ? shadowLookup[selected] ?? null : null;

  function openDetail(shadowId: string) {
    setSelected(shadowId);
  }

  function openRelease(shadow: Shadow, lvl: number) {
    setSelected(null);
    setToRelease({ shadow, level: lvl, gold: getShadowReleaseGold(shadow, lvl) });
  }

  function confirmRelease() {
    if (!toRelease) { return; }
    releaseShadow(toRelease.shadow.id);
    setToRelease(null);
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.pageTitle}>SALA DO TRONO</Text>
        <Text style={s.pageSub}>EXÉRCITO — {totalCount} UNIDADE{totalCount !== 1 ? 'S' : ''}</Text>

        {totalCount === 0 ? (
          <View style={s.emptyWrap}>
            <Icon name="ghost-outline" size={52} color="#a855f733" />
            <Text style={s.emptyTitle}>EXÉRCITO VAZIO</Text>
            <Text style={s.emptyDesc}>
              {'Derrota Bosses nos Portais Dinâmicos e Raids para\nconquistar unidades para o teu exército.'}
            </Text>
          </View>
        ) : (
          <>
            <PassiveSummaryCard
              entries={shadowEntries}
              activeShadowIds={activeShadowIds}
              shadowLookup={shadowLookup}
              onVanguardPress={openDetail}
              C={C}
            />

            <FilterBar filter={filter} sort={sort} onFilter={setFilter} onSort={setSort} C={C} />

            {filtered.length === 0 ? (
              <View style={s.emptyWrap}>
                <Icon name="filter-off-outline" size={36} color={C.dimmed} />
                <Text style={s.emptyDesc}>Nenhuma unidade neste filtro.</Text>
              </View>
            ) : (
              filtered.map(({ shadow, entry }) => (
                <ShadowCard
                  key={entry.id}
                  shadow={shadow}
                  level={entry.level}
                  isActive={activeShadowIds.includes(entry.id)}
                  isFavorite={!!entry.isFavorite}
                  onPress={() => openDetail(entry.id)}
                  C={C}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {selected && selectedShadow && selectedEntry && (
        <ShadowDetailModal
          shadow={selectedShadow}
          entry={selectedEntry}
          isActive={activeShadowIds.includes(selected)}
          canEquipMore={canEquipMore}
          playerLevel={playerLevel}
          inventory={inventory}
          gold={playerGold}
          usedShadowSkills={usedShadowSkills}
          onClose={() => setSelected(null)}
          onToggleActive={() => { toggleActive(selected); setSelected(null); }}
          onToggleFavorite={() => toggleFavorite(selected)}
          onRelease={() => openRelease(selectedShadow, selectedEntry.level)}
          onUpgrade={() => upgradeShadow(selected)}
          C={C}
        />
      )}

      {toRelease && (
        <ReleaseConfirmModal
          shadow={toRelease.shadow}
          gold={toRelease.gold}
          onConfirm={confirmRelease}
          onCancel={() => setToRelease(null)}
          C={C}
        />
      )}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: C.bg },
  content:   { padding: SPACING.md, paddingBottom: SPACING.xl },
  pageTitle: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 4, marginBottom: 2 },
  pageSub:   { color: C.muted, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 2, marginBottom: SPACING.lg },
  emptyWrap:  { alignItems: 'center', paddingTop: 40, gap: SPACING.md },
  emptyTitle: { color: C.purple + '66', fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2 },
  emptyDesc:  { color: C.dimmed, fontSize: 12, textAlign: 'center', lineHeight: 18 },
});

const getLKStyles = (C: any) => StyleSheet.create({
  container:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, backgroundColor: C.bg },
  glowWrap:     { marginBottom: SPACING.lg },
  icon:         { opacity: 0.55 },
  title:        { color: C.neonRed + '88', fontFamily: FONT.orbitron, fontSize: 18, letterSpacing: 5, marginBottom: SPACING.sm },
  divider:      { width: 80, height: 1, backgroundColor: C.neonRed + '33', marginBottom: SPACING.lg },
  body:         { color: C.muted, fontSize: 14, textAlign: 'center', lineHeight: 24, marginBottom: SPACING.xl },
  progressRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg, width: '100%' },
  progressTrack:{ flex: 1, height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.neonRed, borderRadius: 2 },
  progressTxt:  { color: C.neonRed + '88', fontFamily: FONT.orbitron, fontSize: 9 },
  sealRow:      { flexDirection: 'row', alignItems: 'center' },
  sealTxt:      { color: C.neonRed + '44', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
});

const getPSStyles = (C: any) => StyleSheet.create({
  container:      { backgroundColor: C.panel, borderRadius: 12, borderWidth: 1, borderColor: C.gold + '44', padding: SPACING.md, marginBottom: SPACING.sm },
  emptyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: SPACING.sm, marginBottom: SPACING.md },
  emptyTxt:       { color: C.dimmed, fontSize: 11, fontStyle: 'italic' },
  header:         { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  title:          { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  vanguardRow:    { flexDirection: 'row', gap: 8, marginBottom: SPACING.md, justifyContent: 'space-between' },
  vanguardSlot:   { flex: 1, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 4, minHeight: 80 },
  slotName:       { fontFamily: FONT.orbitron, fontSize: 7, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center', paddingHorizontal: 4 },
  slotLvl:        { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  slotLvlTxt:     { fontFamily: FONT.orbitron, fontSize: 7, fontWeight: '900' },
  grid:           { gap: 6, marginBottom: SPACING.sm },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:          { color: C.muted, fontSize: 11 },
  value:          { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  note:           { color: C.dimmed, fontSize: 10, fontStyle: 'italic', marginTop: 4 },
});

const getFBStyles = (C: any) => StyleSheet.create({
  container:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, gap: 8 },
  filterScroll: { flex: 1 },
  filterRow:    { flexDirection: 'row', gap: 6, paddingRight: 4 },
  chip:         { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 },
  chipTxt:      { fontFamily: FONT.orbitron, fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  sortRow:      { flexDirection: 'row', gap: 4 },
  sortBtn:      { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
});

const getSCStyles = (C: any) => StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 8, borderWidth: 1, padding: SPACING.md, marginBottom: 8, gap: SPACING.md, height: 88 },
  iconWrap: { width: 56, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  info: { flex: 1, justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  name: { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  effect: { color: C.muted, fontSize: 10, lineHeight: 14 },
  rightSide: { alignItems: 'flex-end', justifyContent: 'space-between', height: '100%', paddingVertical: 2 },
  rankBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  rankTxt: { fontFamily: FONT.orbitron, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  lvlTxt: { fontFamily: FONT.orbitron, fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  activeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.gold + '15', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: C.gold + '44' },
});

const getDMStyles = (C: any) => StyleSheet.create({
  card:           { backgroundColor: C.panel, borderRadius: 16, padding: SPACING.xl, width: '100%', alignItems: 'center', borderWidth: 2 },
  activeBadge:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, marginBottom: SPACING.sm },
  activeBadgeTxt: { fontFamily: FONT.orbitron, fontSize: 8, color: C.gold, letterSpacing: 2 },
  closeTopBtn:    { position: 'absolute', top: 14, left: 14, padding: 10, zIndex: 10 },
  favBtn:         { position: 'absolute', top: 14, right: 14, padding: 10, zIndex: 10 },
  iconWrap:       { width: 96, height: 96, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  rankBadge:      { borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 3, marginBottom: SPACING.sm },
  rankTxt:        { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 3 },
  name:           { fontFamily: FONT.orbitron, fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.sm, textAlign: 'center' },
  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%', marginBottom: SPACING.md },
  statCell:       { flex: 1, minWidth: '45%', backgroundColor: '#1E1E2A', borderRadius: 10, padding: SPACING.sm, alignItems: 'center' },
  statLabel:      { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1, marginBottom: 4 },
  statValue:      { fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '900' },
  lore:           { color: C.muted, fontSize: 11, textAlign: 'center', lineHeight: 18, fontStyle: 'italic', marginBottom: SPACING.md },
  effectRow:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 8, marginBottom: SPACING.sm, width: '100%' },
  effectTxt:      { fontFamily: FONT.orbitron, fontSize: 9, fontWeight: '700', flex: 1 },
  scaledHint:     { color: C.muted, fontSize: 10, marginBottom: SPACING.md, fontStyle: 'italic' },
  // Upgrade box
  upgradeBox:     { width: '100%', borderWidth: 1, borderRadius: 10, padding: SPACING.md, marginBottom: SPACING.sm },
  upgradeHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  upgradeTitle:   { fontFamily: FONT.orbitron, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  upgradeReqs:    { gap: 6, marginBottom: SPACING.sm },
  reqRow:         { flexDirection: 'row', alignItems: 'center' },
  reqTxt:         { fontSize: 11, flex: 1 },
  upgradeBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: SPACING.md, width: '100%' },
  upgradeTxt:     { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  // Actions
  equipBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.neonBlue + '66', borderRadius: 8, paddingVertical: 10, paddingHorizontal: SPACING.md, width: '100%', marginBottom: SPACING.sm },
  equipTxt:       { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  dangerDivider:  { width: '100%', height: 1, backgroundColor: C.neonRed + '22', marginVertical: SPACING.md },
  releaseBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.neonRed + '66', borderRadius: 8, paddingVertical: 10, paddingHorizontal: SPACING.md, width: '100%', backgroundColor: C.neonRed + '08' },
  releaseTxt:     { fontFamily: FONT.orbitron, fontSize: 9, color: C.neonRed, letterSpacing: 1 },
});

const getRELStyles = (C: any) => StyleSheet.create({
  card:       { backgroundColor: C.panel, borderRadius: 16, padding: SPACING.xl, width: '100%', alignItems: 'center', borderWidth: 2, borderColor: C.neonRed + '44' },
  title:      { fontFamily: FONT.orbitron, fontSize: 13, letterSpacing: 3, color: C.neonRed, marginBottom: SPACING.md },
  shadowRow:  { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.md, width: '100%' },
  shadowName: { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  warning:    { color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.lg },
  btnRow:     { flexDirection: 'row', gap: SPACING.sm, width: '100%' },
  cancelBtn:  { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cancelTxt:  { fontFamily: FONT.orbitron, fontSize: 10, color: C.muted, letterSpacing: 1 },
  confirmBtn: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: C.neonRed + '66', borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.neonRed + '10' },
  confirmTxt: { fontFamily: FONT.orbitron, fontSize: 10, color: C.neonRed, fontWeight: '700' },
});
