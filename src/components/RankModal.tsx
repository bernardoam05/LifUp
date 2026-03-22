import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { getRank, CLASS_REQUIREMENTS, RankKey } from '../store/useGameStore'
import { C, FONT, SPACING } from '../theme'

type Props = {
  level:           number
  totalCompleted:  number
  bossesDefeated:  number
  questsByRank:    Partial<Record<string, number>>
  onClose:         () => void
}

export default function RankModal({ level, totalCompleted, bossesDefeated, questsByRank, onClose }: Props) {
  const currentRank = getRank(level, totalCompleted, bossesDefeated, questsByRank)
  const nextRank    = CLASS_REQUIREMENTS.find(r => {
    if (level          < r.minLevel)    return true
    if (totalCompleted < r.minMissions) return true
    if (bossesDefeated < r.minBosses)  return true
    if (r.minRankMissions > 0 && r.prevRank) {
      if ((questsByRank[r.prevRank] ?? 0) < r.minRankMissions) return true
    }
    return false
  })

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={[s.card, { borderColor: currentRank.color + '55' }]}>
          <View style={s.headerRow}>
            <Icon name="shield-star-outline" size={12} color={currentRank.color} />
            <Text style={[s.headerTxt, { color: currentRank.color }]}> [ CLASSIFICAÇÃO DO CAÇADOR ]</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Icon name="close" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={s.divider} />

          {CLASS_REQUIREMENTS.map(r => {
            const isCurrent  = r.rank === currentRank.rank
            const lvlOk      = level          >= r.minLevel
            const misOk      = totalCompleted  >= r.minMissions
            const bossOk     = bossesDefeated  >= r.minBosses
            const rankMisOk  = r.minRankMissions === 0 || !r.prevRank
              || (questsByRank[r.prevRank] ?? 0) >= r.minRankMissions
            const met = lvlOk && misOk && bossOk && rankMisOk
            const prevRankCount = r.prevRank ? (questsByRank[r.prevRank] ?? 0) : 0

            return (
              <View key={r.rank} style={[s.row, isCurrent && { backgroundColor: r.color + '15' }]}>
                <View style={[s.badge, { borderColor: r.color + (isCurrent ? 'cc' : '55') }]}>
                  <Text style={[s.badgeTxt, { color: r.color }]}>{r.rank}</Text>
                </View>
                <View style={s.rowInfo}>
                  <Text style={[s.rowLabel, { color: isCurrent ? r.color : (met ? '#e2e8f0' : '#64748b') }]}>{r.label}</Text>
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
            )
          })}

          {nextRank && (
            <View style={s.nextSection}>
              <Icon name="arrow-up-bold" size={11} color={nextRank.color} />
              <View style={{ flex: 1, marginLeft: 4 }}>
                <Text style={[s.nextTxt, { color: nextRank.color }]}>Próximo: {nextRank.label}</Text>
                <Text style={[s.rowSub, { marginTop: 2 }]}>
                  Nível {nextRank.minLevel} ({Math.max(nextRank.minLevel - level, 0)} em falta){' · '}
                  Missões {Math.min(totalCompleted, nextRank.minMissions)}/{nextRank.minMissions}{' · '}
                  Bosses {Math.min(bossesDefeated, nextRank.minBosses)}/{nextRank.minBosses}
                  {nextRank.minRankMissions > 0 && nextRank.prevRank ? (
                    `\nMissões ${nextRank.prevRank}-Rank: ${Math.min(questsByRank[nextRank.prevRank] ?? 0, nextRank.minRankMissions)}/${nextRank.minRankMissions}`
                  ) : ''}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
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
