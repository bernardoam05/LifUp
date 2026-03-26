// src/components/PenaltyModal.tsx
import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Modal, TouchableOpacity, Vibration } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore from '../store/useGameStore'
import { useTheme, FONT, SPACING } from '../theme'

const getStyles = (C: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.surface.overlay, justifyContent: 'center', alignItems: 'center' },
  card: { width: '85%', backgroundColor: C.surface.elevated, borderWidth: 1, borderRadius: 8, padding: SPACING.xl, alignItems: 'center' },
  warning: { fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 4, marginBottom: SPACING.md, color: C.text.secondary },
  title: { color: C.text.primary, fontFamily: FONT.orbitron, fontSize: 18, fontWeight: '900', letterSpacing: 1, marginBottom: SPACING.lg },
  badge: { borderRadius: 4, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginBottom: SPACING.lg },
  badgeTxt: { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', color: C.text.primary },
  message: { color: C.text.secondary, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  btn: { width: '100%', borderWidth: 1, borderRadius: 4, paddingVertical: 14, alignItems: 'center', backgroundColor: C.surface.base },
  btnTxt: { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '900', letterSpacing: 1, color: C.text.primary },
})

const INTENSITY_FLAVOR = (C: any) => ({
  light: { title: 'ZONA DE PENALIDADE', icon: 'shield-alert-outline', color: C.green },
  medium: { title: 'ZONA DE PENALIDADE', icon: 'alert-octagon', color: C.gold },
  hardcore: { title: 'PUNIÇÃO DO MONARCA', icon: 'skull-crossbones', color: C.neonRed },
})

export default function PenaltyModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const C = useTheme()
  const s = getStyles(C)
  const lastPenaltyInfo = useGameStore(s => s.system.lastPenaltyInfo)
  const intensityFlavors = INTENSITY_FLAVOR(C)

  useEffect(() => {
    if (!visible) return
    const intensity = lastPenaltyInfo?.intensity ?? 'medium'
    if (intensity === 'hardcore') Vibration.vibrate([0, 300, 100, 300, 100, 600])
    else if (intensity === 'medium') Vibration.vibrate([0, 200, 80, 200])
    else Vibration.vibrate([0, 100])
  }, [visible])

  const info = lastPenaltyInfo
  const intensity = info?.intensity ?? 'medium'
  const flavor = intensityFlavors[intensity] ?? intensityFlavors.medium

  const failLine = info
    ? `${info.failedCount} de ${info.totalCount} missões falhadas.`
    : 'Missões diárias não concluídas.'

  const xpLine = info
    ? `${info.xpLost} XP` + (info.goldLost ? ` e ◈${info.goldLost}` : '') + ` deduzidos.`
    : 'XP e Ouro deduzidos conforme perfil ativo.'

  const intensityLabels: Record<string, string> = {
    light: 'LEVE', medium: 'MÉDIO', hardcore: 'HARDCORE',
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onDismiss}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.warning}>{flavor.title}</Text>
          <Icon name={flavor.icon} size={48} color={flavor.color} style={{ marginBottom: SPACING.lg }} />
          <Text style={s.title}>FALHA DETETADA</Text>
          
          <View style={[s.badge, { borderColor: flavor.color }]}>
            <Text style={[s.badgeTxt, { color: flavor.color }]}>
              {intensityLabels[intensity]}
            </Text>
          </View>
          
          <Text style={s.message}>
            {failLine}{"\n"}{xpLine}
            {'\n\nCompleta as missões de penalização para escapar.'}
          </Text>

          <TouchableOpacity style={[s.btn, { borderColor: flavor.color }]} onPress={onDismiss}>
            <Text style={[s.btnTxt, { color: flavor.color }]}>ENTENDIDO, HUNTER</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
