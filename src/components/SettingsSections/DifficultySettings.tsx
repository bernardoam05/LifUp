import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, SPACING, FONT } from '../../theme'
import { DifficultyOption, getDifficultyOptions } from '../../data/settingsConfig'
import { MissionDifficulty } from '../../store/useGameStore'

interface DifficultySettingsProps {
  currentDifficulty: MissionDifficulty
  onDifficultyChange: (difficulty: MissionDifficulty) => void
}

const DifficultySettings = ({
  currentDifficulty,
  onDifficultyChange,
}: DifficultySettingsProps) => {
  const C = useTheme()
  const s = React.useMemo(() => getStyles(C), [C])
  const DIFFICULTY_OPTIONS = React.useMemo(() => getDifficultyOptions(C), [C])

  return (
    <View>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: C.neonBlue }]} />
        <Text style={s.sectionTitle}>RIGOR DO SISTEMA (MISSÕES DIÁRIAS)</Text>
      </View>

      <View style={s.intensityInfo}>
        <Icon name="information-outline" size={12} color={C.muted} />
        <Text style={s.intensityInfoTxt}>
          {' '}Controla quantas missões são geradas por dia.
          Tem efeito no próximo reset diário ou regeneração.
        </Text>
      </View>

      {DIFFICULTY_OPTIONS.map(opt => {
        const active = currentDifficulty === opt.value
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.intensityCard, active && { borderColor: opt.color, backgroundColor: opt.color + '0d' }]}
            onPress={() => onDifficultyChange(opt.value)}
            activeOpacity={0.8}
          >
            <View style={s.intensityCardHeader}>
              <View style={[s.intensityIconWrap, { backgroundColor: opt.color + '18', borderColor: opt.color + '44' }]}>
                <Icon name={opt.icon} size={20} color={active ? opt.color : C.dimmed} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.intensityLabel, { color: active ? opt.color : C.muted }]}>
                  {opt.label}
                </Text>
                <Text style={s.intensitySublabel}>{opt.sublabel}</Text>
              </View>
              {active
                ? <Icon name="radiobox-marked" size={20} color={opt.color} />
                : <Icon name="radiobox-blank"  size={20} color={C.border} />}
            </View>
            <View style={s.intensityDesc}>
              {opt.description.map((line: string, i: number) => (
                <Text key={i} style={[s.intensityDescLine, active && { color: C.muted }]}>{line}</Text>
              ))}
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const getStyles = (C: any) => StyleSheet.create({
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.md, 
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border + '44',
  },
  sectionDot:    { 
    width: 3, 
    height: 16, 
    borderRadius: 2,
  },
  sectionTitle:  { 
    color: C.neonBlue, 
    fontFamily: FONT.orbitron, 
    fontSize: 11, 
    letterSpacing: 2, 
    fontWeight: '900' 
  },

  intensityInfo:    { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: C.panel, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: C.border + '66', 
    padding: SPACING.md, 
    marginBottom: SPACING.md 
  },
  intensityInfoTxt: { flex: 1, color: C.dimmed, fontSize: 10, lineHeight: 16 },

  intensityCard:       { backgroundColor: C.panel, borderRadius: 8, borderWidth: 1, borderColor: C.border + '66', padding: SPACING.md, marginBottom: SPACING.sm },
  intensityCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  intensityIconWrap:   { width: 40, height: 40, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  intensityLabel:      { fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  intensitySublabel:   { color: C.dimmed, fontSize: 10, marginTop: 2 },
  intensityDesc:       { paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: C.border, gap: 3 },
  intensityDescLine:   { color: C.dimmed, fontSize: 11, lineHeight: 17 },
})

export default DifficultySettings
