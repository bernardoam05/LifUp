// src/components/SystemHUD.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore, { getRank, xpForLevel, CLASS_REQUIREMENTS } from '../store/useGameStore';
import { getJobClass } from '../store/helpers';
import { useTheme, FONT, SPACING } from '../theme';

export default function SystemHUD({ onSettings, onRankPress }: { onSettings: () => void; onRankPress: () => void }) {
  const C = useTheme();
  const player = useGameStore(s => s.player);
  const stats = useGameStore(s => s.statistics);
  const bosses = useGameStore(s => s.system.bossesDefeated);
  const jobClass = getJobClass(player.level);

  // Note: getRank, xpForLevel, CLASS_REQUIREMENTS are re-exported from useGameStore for convenience
  // but they are technically in helpers.ts or types.ts
  const qualifiedRankInfo = getRank(player.level, stats.totalCompleted, bosses, stats.questsByRank);

  const playerRankLetter = player.rank || 'E';
  const currentRankInfo = CLASS_REQUIREMENTS.find(r => r.rank === playerRankLetter) || CLASS_REQUIREMENTS[0];

  const currentIdx = CLASS_REQUIREMENTS.findIndex(r => r.rank === currentRankInfo.rank);
  const qualifiedIdx = CLASS_REQUIREMENTS.findIndex(r => r.rank === qualifiedRankInfo.rank);
  const canRankUp = qualifiedIdx > currentIdx;

  const xpNeeded = xpForLevel(player.level);
  const xpPct = Math.min((player.xp / xpNeeded) * 100, 100);
  const focusOn = useGameStore(s => s.system.focusModeActive);

  const hud = StyleSheet.create({
    container: {
      paddingHorizontal: SPACING.md,
      paddingTop: SPACING.sm,
      paddingBottom: SPACING.md,
      backgroundColor: C.bg,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
    badge: { width: 48, height: 48, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 10, elevation: 6, backgroundColor: C.bg },
    badgeText: { fontFamily: FONT.orbitron, fontSize: 20, fontWeight: '900' },
    info: { flex: 1, gap: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    name: { color: '#fff', fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', maxWidth: 120 },
    level: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
    gold: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
    xpTrack: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' },
    xpFill: { height: '100%', backgroundColor: C.neonBlue, borderRadius: 3 },
    xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    xpText: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 8 },
    focusTag: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1, fontWeight: '700' },
    gearBtn: { padding: 8, borderRadius: 4, backgroundColor: '#ffffff08' },
    streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fbbf2415', borderWidth: 1, borderColor: '#fbbf2444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, marginRight: 4 },
    streakFire: { fontSize: 9 },
    streakNum: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '900', marginLeft: 2 },
    rankUpIndicator: { position: 'absolute', top: -6, right: -6, backgroundColor: C.neonBlue, width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.bg },
    rankUpIndicatorText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  });

  return (
    <View style={hud.container}>
      <View style={hud.row}>
        <TouchableOpacity style={[hud.badge, { borderColor: currentRankInfo.color, shadowColor: currentRankInfo.color }]} onPress={onRankPress} activeOpacity={0.75}>
          <Text style={[hud.badgeText, { color: currentRankInfo.color }]}>{currentRankInfo.rank}</Text>
          {canRankUp && (
            <View style={hud.rankUpIndicator}>
              <Text style={hud.rankUpIndicatorText}>!</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={hud.info}>
          <View style={hud.nameRow}>
            <Text style={hud.name} numberOfLines={1} ellipsizeMode="tail">{jobClass.name}</Text>
            <Text style={hud.level}> LVL {player.level}</Text>
            <View style={{ flex: 1 }} />
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
        <TouchableOpacity onPress={onSettings} style={hud.gearBtn}>
          <Icon name="cog-outline" size={18} color={C.dimmed} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
