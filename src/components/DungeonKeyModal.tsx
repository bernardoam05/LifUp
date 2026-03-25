import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { DungeonKey } from '../data/dungeonKeys'
import BottomSheetModal from './BottomSheetModal'
import { FONT, SPACING } from '../theme'

export const getDKMStyles = (C: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.bg + 'cc', justifyContent: 'flex-end' },
  card: { backgroundColor: C.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 40, width: '100%', alignItems: 'stretch', borderWidth: 1, borderBottomWidth: 0, borderColor: C.neonRed + '88' },
  warning: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 3, marginBottom: 4, textAlign: 'center' },
  iconBox: { width: 64, height: 64, borderRadius: 12, backgroundColor: C.neonRed + '15', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md, alignSelf: 'center', borderWidth: 1, borderColor: C.neonRed + '33' },
  title: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.sm, textAlign: 'center' },
  
  section: { marginBottom: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionTitle: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2, marginBottom: SPACING.sm, fontWeight: '700' },
  sectionContent: { color: C.muted, fontSize: 12, lineHeight: 18 },
  
  difficultyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  difficultyLabel: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  difficultyStars: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 14 },
  
  missionTypeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  missionTypeLabel: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  missionTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  missionTypeText: { fontFamily: FONT.orbitron, fontSize: 9, fontWeight: '700' },
  
  alertBox: { backgroundColor: C.neonRed + '15', borderWidth: 1, borderColor: C.neonRed + '66', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.lg },
  alertTitle: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  alertText: { color: C.muted, fontSize: 11, lineHeight: 16 },
  
  startBtn: { marginTop: SPACING.sm, paddingVertical: 12, paddingHorizontal: SPACING.xl, backgroundColor: C.neonRed + '22', borderWidth: 1, borderColor: C.neonRed + '66', borderRadius: 4 },
  startBtnTxt: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2, fontWeight: '700', textAlign: 'center' },
  cancelBtn: { marginTop: SPACING.sm, paddingVertical: 10, paddingHorizontal: SPACING.xl },
  cancelTxt: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, textAlign: 'center' },
})

interface DungeonKeyModalProps {
  visible: boolean
  onClose: () => void
  onRequestClose?: () => void
  onStartMission: (key: DungeonKey) => void
  dungeonKey: DungeonKey | null
  C: any
}

export default function DungeonKeyModal({
  visible,
  onClose,
  onRequestClose,
  onStartMission,
  dungeonKey: key,
  C,
}: DungeonKeyModalProps) {
  const insets = useSafeAreaInsets()
  const dm = getDKMStyles(C)
  
  if (!key) return null
  
  const lore = key.lore || `Um poderoso inimigo aguarda-te neste portal. ${key.description}`
  const environment = key.environment || `Um local perigoso e desafiante, repleto de obstáculos mortais.`
  const difficulty = key.difficulty || 3
  
  const renderDifficulty = () => {
    if (difficulty === '???') {
      return (
        <View style={dm.difficultyRow}>
          <Text style={dm.difficultyLabel}>DIFICULDADE:</Text>
          <Text style={[dm.difficultyLabel, { fontSize: 12, fontWeight: '900' }]}>???</Text>
        </View>
      )
    }
    
    const stars = Array.from({ length: 5 }).map((_, i) => (
      <Text key={i} style={dm.star}>
        {i < difficulty ? '⭐' : '☆'}
      </Text>
    ))
    
    return (
      <View style={dm.difficultyRow}>
        <Text style={dm.difficultyLabel}>DIFICULDADE:</Text>
        <View style={dm.difficultyStars}>{stars}</View>
      </View>
    )
  }
  
  const getMissionTypeColor = () => {
    switch (key.missionType) {
      case 'focus': return { bg: C.neonBlue, text: C.neonBlue }
      case 'training': return { bg: '#84cc16', text: '#84cc16' }
      case 'gps': return { bg: C.gold, text: C.gold }
      default: return { bg: C.muted, text: C.muted }
    }
  }
  
  const missionColor = getMissionTypeColor()
  const missionTypeLabel = key.missionType === 'focus' ? 'FOCO' : key.missionType === 'training' ? 'TREINO' : 'GPS'
  
  return (
    <BottomSheetModal visible={visible} onClose={onRequestClose ?? onClose} contentStyle={{ backgroundColor: 'transparent' }}>
      <View style={[dm.card, { paddingBottom: Math.max(40, insets.bottom + SPACING.sm) }]}>
        <Icon name="key-alert" size={40} color={key.color} style={{ marginBottom: SPACING.sm, alignSelf: 'center' }} />
        <Text style={dm.warning}>⚠ PORTAL PERIGOSO ⚠</Text>
        <Text style={[dm.title, { color: key.color }]} numberOfLines={2}>
          {key.name.toUpperCase()}
        </Text>

        <ScrollView style={{ width: '100%', maxHeight: 400 }} contentContainerStyle={{ alignItems: 'stretch' }} showsVerticalScrollIndicator={false}>
          {/* Lore Section */}
          <View style={dm.section}>
            <Text style={dm.sectionTitle}>LENDA</Text>
            <Text style={dm.sectionContent}>{lore}</Text>
          </View>
          
          {/* Environment Section */}
          <View style={dm.section}>
            <Text style={dm.sectionTitle}>AMBIENTE</Text>
            <Text style={dm.sectionContent}>{environment}</Text>
          </View>
          
          {/* Difficulty & Mission Type */}
          <View style={dm.section}>
            {renderDifficulty()}
            <View style={[dm.missionTypeRow, { marginTop: SPACING.sm }]}>
              <Text style={dm.missionTypeLabel}>TIPO DE MISSÃO:</Text>
              <View style={[dm.missionTypeBadge, { backgroundColor: missionColor.bg + '22', borderColor: missionColor.bg }]}>
                <Text style={[dm.missionTypeText, { color: missionColor.text }]}>{missionTypeLabel}</Text>
              </View>
            </View>
          </View>
          
          {/* Alert Box */}
          <View style={dm.alertBox}>
            <Text style={dm.alertTitle}>⚠️ AVISO CRÍTICO</Text>
            <Text style={dm.alertText}>
              Uma missão perigosa e desafiante te aguarda. {'\n\n'}
              As recompensas são grandes, mas as penalizações também são severas. Tens a certeza de que estás pronto?
            </Text>
          </View>
        </ScrollView>

        <TouchableOpacity 
          style={dm.startBtn} 
          onPress={() => {
            onStartMission(key)
            onClose()
          }}
        >
          <Text style={dm.startBtnTxt}>ACEITAR DESAFIO</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={dm.cancelBtn} onPress={onClose}>
          <Text style={dm.cancelTxt}>RECUAR</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  )
}
