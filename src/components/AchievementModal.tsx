// src/components/AchievementModal.tsx
import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { ACHIEVEMENTS_MAP } from '../data/achievements'
import { useTheme, FONT, SPACING } from '../theme'
import { playSound } from '../utils/audioService'

const getStyles = (C: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.surface.overlay, justifyContent: 'center', alignItems: 'center' },
  card: { width: '85%', backgroundColor: C.surface.elevated, borderWidth: 1, borderRadius: 8, padding: SPACING.xl, alignItems: 'center' },
  system: { color: C.text.secondary, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 4, marginBottom: SPACING.lg },
  header: { color: C.text.primary, fontFamily: FONT.orbitron, fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: SPACING.lg },
  iconWrap: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  title: { fontFamily: FONT.orbitron, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: SPACING.sm, color: C.text.primary },
  desc: { color: C.text.secondary, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
  rewardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface.base, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, width: '100%', justifyContent: 'center', marginBottom: SPACING.xl },
  reward: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 14, fontWeight: '700' },
  btn: { width: '100%', borderWidth: 1, borderRadius: 4, paddingVertical: 14, alignItems: 'center', backgroundColor: C.surface.base },
  btnTxt: { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '900', letterSpacing: 1, color: C.text.primary },
})

export default function AchievementModal({ achievementId, onDismiss }: { achievementId: string; onDismiss: () => void }) {
  const C = useTheme()
  const s = getStyles(C)
  const achievement = ACHIEVEMENTS_MAP[achievementId]

  useEffect(() => {
    playSound('achievement')
  }, [achievementId])

  if (!achievement) return null

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onDismiss}>
      <View style={s.overlay}>
        <View style={[s.card, { borderColor: achievement.color + '88' }]}>
          <Text style={s.system}>⚡ SISTEMA ⚡</Text>
          <Text style={s.header}>ACHIEVEMENT DESBLOQUEADO</Text>
          <View style={[s.iconWrap, { backgroundColor: achievement.color + '18', borderColor: achievement.color + '44' }]}>
            <Icon name={achievement.icon} size={52} color={achievement.color} />
          </View>
          <Text style={[s.title, { color: achievement.color }]}>{achievement.title}</Text>
          <Text style={s.desc}>{achievement.description}</Text>
          <View style={s.rewardRow}>
            <Icon name="rhombus" size={16} color={C.gold} />
            <Text style={s.reward}> +{achievement.rewardGold} Gold</Text>
          </View>
          <TouchableOpacity style={[s.btn, { borderColor: achievement.color }]} onPress={onDismiss}>
            <Text style={[s.btnTxt, { color: achievement.color }]}>GLÓRIA AO CAÇADOR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
