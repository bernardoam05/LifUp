import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, ScrollView } from 'react-native';
import SoloLevelingModal from './SoloLevelingModal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore, { getRank, CLASS_REQUIREMENTS } from '../store/useGameStore';
import { FONT } from '../theme';


type Props = {
  visible?: boolean
  level: number
  totalCompleted: number
  bossesDefeated: number
  questsByRank: Record<string, number>
  onClose: () => void
  C: any
}


export default function RankModal({ visible = true, level, totalCompleted, bossesDefeated, questsByRank, onClose, C }: Props) {
  const s = getStyles(C);

  const playerRankLetter = useGameStore(st => st.player.rank) || 'E';
  const rankUpAction = useGameStore(st => st.rankUp);
  const currentRankInfo = CLASS_REQUIREMENTS.find(r => r.rank === playerRankLetter) || CLASS_REQUIREMENTS[0];
  const qualifiedRankInfo = getRank(level, totalCompleted, bossesDefeated, questsByRank);

  const currentIdx = CLASS_REQUIREMENTS.findIndex(r => r.rank === currentRankInfo.rank);
  const qualifiedIdx = CLASS_REQUIREMENTS.findIndex(r => r.rank === qualifiedRankInfo.rank);
  const canRankUp = qualifiedIdx > currentIdx;

  const [isRankingUp, setIsRankingUp] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (canRankUp && !isRankingUp) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        ])
      ).start();
    }
  }, [canRankUp, isRankingUp, glowAnim]);

  const handleRankUp = () => {
    setIsRankingUp(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start(() => {
      rankUpAction();
      setTimeout(() => {
        onClose();
      }, 500);
    });
  };

  // Visual rank being shown, changes right when animation finishes roughly
  const displayRank = (isRankingUp ? qualifiedRankInfo : currentRankInfo) as { rank: string; label: string; color: string; bgColor: string };

  return (
    <SoloLevelingModal visible={visible} onRequestClose={onClose}>
      <Animated.View style={[s.card, { borderColor: displayRank.color + '55', transform: [{ scale: scaleAnim }] }]}>
        <View style={s.headerRow}>
          <Icon name="shield-star-outline" size={12} color={displayRank.color} />
          <Text style={[s.headerTxt, { color: displayRank.color }]}> [ CLASSIFICAÇÃO DO CAÇADOR ]</Text>
          {!isRankingUp && (
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Icon name="close" size={16} color={C.dimmed} />
            </TouchableOpacity>
          )}
        </View>
        <View style={s.divider} />

        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        {isRankingUp ? (
          <View style={s.rankUpContainer}>
            <Icon name="chevron-double-up" size={48} color={displayRank.color} style={{ marginBottom: 12 }} />
            <Text style={[s.rankUpTitle, { color: displayRank.color }]}>RANK UP!</Text>
            <Text style={s.rankUpText}>Alcançaste a Classe {displayRank.label}</Text>
          </View>
        ) : (
          <>
            {CLASS_REQUIREMENTS.map(r => {
              const isCurrent = r.rank === currentRankInfo.rank;
              const lvlOk = level >= r.minLevel;
              const misOk = totalCompleted >= r.minMissions;
              const bossOk = bossesDefeated >= r.minBosses;
              const rankMisOk = r.minRankMissions === 0 || !r.prevRank
                || (questsByRank[r.prevRank] ?? 0) >= r.minRankMissions;
              const met = lvlOk && misOk && bossOk && rankMisOk;
              const prevRankCount = r.prevRank ? (questsByRank[r.prevRank] ?? 0) : 0;

              return (
                <View key={r.rank} style={[s.row, isCurrent && { backgroundColor: r.color + '15' }]}>
                  <View style={[s.badge, { borderColor: r.color + (isCurrent ? 'cc' : '55') }]}>
                    <Text style={[s.badgeTxt, { color: r.color }]}>{r.rank === 'National' ? 'N' : r.rank}</Text>
                  </View>
                  <View style={s.rowInfo}>
                    <Text style={[s.rowLabel, { color: isCurrent ? r.color : (met ? C.muted : C.dimmed) }]}>{r.label}</Text>
                    {r.minMissions > 0 ? (
                      <>
                        <View style={s.reqRow}>
                          <Text style={[s.reqLabel, lvlOk && s.reqMet]}>Nível {r.minLevel}</Text>
                          <Text style={[s.reqVal, lvlOk ? s.reqMet : s.reqFail]}>
                            {Math.min(level, r.minLevel)}/{r.minLevel}
                          </Text>
                        </View>
                        <View style={s.reqRow}>
                          <Text style={[s.reqLabel, misOk && s.reqMet]}>Missões totais</Text>
                          <Text style={[s.reqVal, misOk ? s.reqMet : s.reqFail]}>
                            {Math.min(totalCompleted, r.minMissions)}/{r.minMissions}
                          </Text>
                        </View>
                        <View style={s.reqRow}>
                          <Text style={[s.reqLabel, bossOk && s.reqMet]}>Bosses</Text>
                          <Text style={[s.reqVal, bossOk ? s.reqMet : s.reqFail]}>
                            {Math.min(bossesDefeated, r.minBosses)}/{r.minBosses}
                          </Text>
                        </View>
                        {r.minRankMissions > 0 && r.prevRank && (
                          <View style={s.reqRow}>
                            <Text style={[s.reqLabel, rankMisOk && s.reqMet]}>
                              Missões {r.prevRank}-Rank
                            </Text>
                            <Text style={[s.reqVal, rankMisOk ? s.reqMet : s.reqFail]}>
                              {Math.min(prevRankCount, r.minRankMissions)}/{r.minRankMissions}
                            </Text>
                          </View>
                        )}
                      </>
                    ) : (
                      <Text style={s.rowSub}>Rank inicial</Text>
                    )}
                  </View>
                  {isCurrent && (
                    <View style={[s.currentTag, { borderColor: r.color + '55' }]}>
                      <Text style={[s.currentTagTxt, { color: r.color }]}>ATUAL</Text>
                    </View>
                  )}
                  {!isCurrent && met && <Icon name="check-circle" size={14} color={r.color + 'aa'} />}
                </View>
              );
            })}

            {canRankUp ? (
              <View style={[s.rankUpAction, { borderColor: qualifiedRankInfo.color }]}>
                <Text style={s.warningText}>⚠ AVISO GERAL: Subir de classe vai aumentar a dificuldade das missões sugeridas.</Text>
                <Animated.View style={{
                  shadowColor: qualifiedRankInfo.color,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: glowAnim,
                  shadowRadius: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [2, 10] }),
                  elevation: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
                }}>
                  <TouchableOpacity style={[s.rankUpBtn, { backgroundColor: qualifiedRankInfo.color }]} onPress={handleRankUp}>
                    <Text style={[s.rankUpBtnTxt, { color: C.bg }]}>SUBIR PARA O RANK {qualifiedRankInfo.rank}</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            ) : (
              <View style={s.nextSection}>
                <Icon name="arrow-up-bold" size={11} color="#475569" />
                <View style={{ flex: 1, marginLeft: 4 }}>
                  <Text style={[s.nextTxt, { color: C.dimmed }]}>Continua a treinar para alcançar a próxima classe.</Text>
                </View>
              </View>
            )}
          </>
        )}
        </ScrollView>
      </Animated.View>
    </SoloLevelingModal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  card: { width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  headerTxt: { flex: 1, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  closeBtn: { padding: 4 },
  divider: { height: 1, backgroundColor: C.border, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 4, paddingVertical: 8, paddingHorizontal: 8, marginBottom: 6, gap: 10 },
  badge: { width: 30, height: 30, borderRadius: 3, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badgeTxt: { fontFamily: FONT.orbitron, fontSize: 14, fontWeight: '900' },
  rowInfo: { flex: 1 },
  rowLabel: { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  rowSub: { color: C.dimmed, fontSize: 10, marginTop: 1 },
  currentTag: { borderWidth: 1, borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  currentTagTxt: { fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1 },
  nextSection: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
  nextTxt: { fontSize: 11, fontFamily: FONT.orbitron },
  reqRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 },
  reqLabel: { flex: 1, color: C.dimmed, fontSize: 9, fontFamily: FONT.orbitron, letterSpacing: 0.5 },
  reqVal: { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 0.5 },
  reqMet: { color: C.green },
  reqFail: { color: C.neonRed },

  rankUpAction: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, alignItems: 'center' },
  warningText: { color: C.neonRed, fontSize: 9, fontFamily: FONT.orbitron, textAlign: 'center', marginBottom: 12 },
  rankUpBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 4 },
  rankUpBtnTxt: { fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  rankUpContainer: { alignItems: 'center', paddingVertical: 32 },
  rankUpTitle: { fontFamily: FONT.orbitron, fontSize: 24, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  rankUpText: { color: C.muted, fontSize: 14, fontFamily: FONT.orbitron },
});
