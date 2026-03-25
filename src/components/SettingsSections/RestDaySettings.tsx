import React from 'react'
import { View, Text, Switch, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, SPACING, FONT } from '../../theme'

interface RestDaySettingsProps {
  restDay: boolean
  onRestDayChange: (value: boolean) => void
}

const RestDaySettings = ({
  restDay,
  onRestDayChange,
}: RestDaySettingsProps) => {
  const C = useTheme()
  const s = React.useMemo(() => getStyles(C), [C])

  return (
    <View>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: '#22c55e' }]} />
        <Text style={s.sectionTitle}>REPOUSO DO MONARCA</Text>
      </View>

      <View style={s.restDayInfo}>
        <Icon name="information-outline" size={12} color={C.muted} />
        <Text style={s.restDayInfoTxt}>
          {' '}Ativa para declarar hoje como Dia de Descanso. As missões ficam com opacidade reduzida e não haverá punições no reset de amanhã. Desativa automaticamente ao fim do dia.
        </Text>
      </View>

      <View style={[s.row, { borderBottomWidth: 0, borderRadius: 4, borderWidth: 1, borderColor: restDay ? '#22c55e44' : C.border, backgroundColor: restDay ? '#22c55e0a' : C.panel }]}>
        <Icon name="bed" size={18} color={restDay ? '#22c55e' : C.dimmed} />
        <View style={s.rowInfo}>
          <Text style={[s.rowLabel, { color: restDay ? '#22c55e' : C.muted }]}>Dia de Descanso</Text>
          <Text style={s.rowSub}>
            {restDay ? '[ REPOUSO ATIVO — sem punições hoje ]' : 'Inativo — missões normais'}
          </Text>
        </View>
        <Switch
          value={restDay}
          onValueChange={onRestDayChange}
          trackColor={{ false: C.border, true: '#22c55e55' }}
          thumbColor={restDay ? '#22c55e' : C.dimmed}
        />
      </View>
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

  restDayInfo:    { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    backgroundColor: C.panel, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: C.border + '66', 
    padding: SPACING.md, 
    marginBottom: SPACING.md 
  },
  restDayInfoTxt: { flex: 1, color: C.dimmed, fontSize: 10, lineHeight: 16 },

  row:       { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: C.panel, 
    borderWidth: 1,
    borderColor: C.border + '66',
    borderRadius: 8,
    paddingVertical: SPACING.md, 
    paddingHorizontal: SPACING.md, 
    gap: SPACING.sm,
    marginBottom: 0,
  },
  rowInfo:   { flex: 1 },
  rowLabel:  { color: C.muted, fontSize: 13, fontWeight: '600' },
  rowSub:    { color: C.dimmed, fontSize: 11, marginTop: 2 },
})

export default RestDaySettings
