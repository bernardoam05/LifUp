import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { FONT, SPACING } from '../theme'


type Props = {
  visible:       boolean
  title:         string
  message:       string
  confirmLabel?: string
  cancelLabel?:  string
  confirmColor?: string
  confirmIcon?:  string
  onConfirm:     () => void
  onCancel:      () => void
  useNativeModal?: boolean
  C: any
}


export default function CustomModal({
  visible, title, message,
  confirmLabel = 'CONFIRMAR',
  cancelLabel  = 'CANCELAR',
  confirmColor,
  confirmIcon  = 'check-circle-outline',
  onConfirm, onCancel,
  useNativeModal = true,
  C,
}: Props) {
  const s = getStyles(C)
  const finalConfirmColor = confirmColor || C.neonBlue

  const content = (
    <View style={s.overlay}>
      <View style={[s.card, { borderColor: finalConfirmColor + '55' }]}>

        {/* Icon accent */}
        <View style={[s.iconWrap, { backgroundColor: finalConfirmColor + '18' }]}>
          <Icon name={confirmIcon} size={28} color={finalConfirmColor} />
        </View>

        {/* Title */}
        <Text style={[s.title, { color: finalConfirmColor }]}>{title}</Text>

        {/* Message */}
        <Text style={s.message}>{message}</Text>

        {/* Divider */}
        <View style={[s.divider, { backgroundColor: finalConfirmColor + '33' }]} />


        {/* Buttons */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
            <Icon name="close-circle-outline" size={15} color={C.muted} />
            <Text style={s.cancelTxt}> {cancelLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.confirmBtn, { borderColor: finalConfirmColor, backgroundColor: finalConfirmColor + '18' }]}
            onPress={onConfirm}
          >
            <Icon name={confirmIcon} size={15} color={finalConfirmColor} />
            <Text style={[s.confirmTxt, { color: finalConfirmColor }]}> {confirmLabel}</Text>
          </TouchableOpacity>

        </View>

      </View>
    </View>
  )

  if (!useNativeModal) {
    if (!visible) return null
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="box-none">
        {content}
      </View>
    )
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      {content}
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.bg + 'cc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  card: {
    width: '100%',
    backgroundColor: C.panel,
    borderRadius: 4,
    borderWidth: 1,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 4,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontFamily: FONT.orbitron,
    fontSize: 14,
    letterSpacing: 2,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  message: {
    color: C.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  divider: {
    width: '100%',
    height: 1,
    marginBottom: SPACING.md,
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    paddingVertical: 12,
  },
  cancelTxt: {
    color: C.muted,
    fontFamily: FONT.orbitron,
    fontSize: 10,
    letterSpacing: 1,
  },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 12,
  },
  confirmTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 10,
    letterSpacing: 1,
  },
})

