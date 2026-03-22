import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { C, FONT, SPACING } from '../theme'

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
}

export default function CustomModal({
  visible, title, message,
  confirmLabel = 'CONFIRMAR',
  cancelLabel  = 'CANCELAR',
  confirmColor = C.neonBlue,
  confirmIcon  = 'check-circle-outline',
  onConfirm, onCancel,
}: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={[s.card, { borderColor: confirmColor + '55' }]}>

          {/* Icon accent */}
          <View style={[s.iconWrap, { backgroundColor: confirmColor + '18' }]}>
            <Icon name={confirmIcon} size={28} color={confirmColor} />
          </View>

          {/* Title */}
          <Text style={[s.title, { color: confirmColor }]}>{title}</Text>

          {/* Message */}
          <Text style={s.message}>{message}</Text>

          {/* Divider */}
          <View style={[s.divider, { backgroundColor: confirmColor + '33' }]} />

          {/* Buttons */}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
              <Icon name="close-circle-outline" size={15} color={C.muted} />
              <Text style={s.cancelTxt}> {cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.confirmBtn, { borderColor: confirmColor, backgroundColor: confirmColor + '18' }]}
              onPress={onConfirm}
            >
              <Icon name={confirmIcon} size={15} color={confirmColor} />
              <Text style={[s.confirmTxt, { color: confirmColor }]}> {confirmLabel}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000cc',
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
    color: '#94a3b8',
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
