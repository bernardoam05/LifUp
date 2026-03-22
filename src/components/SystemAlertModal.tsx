import React from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { C, FONT, SPACING } from '../theme'

export type AlertButton = {
  text:     string
  onPress?: () => void
  style?:   'default' | 'cancel' | 'destructive'
}

type Props = {
  title:    string
  message?: string
  buttons?: AlertButton[]
  onClose:  () => void
}

export default function SystemAlertModal({ title, message, buttons, onClose }: Props) {
  const btns: AlertButton[] = buttons?.length
    ? buttons
    : [{ text: 'OK', style: 'default' }]

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.title}>{title}</Text>
          {!!message && <Text style={s.message}>{message}</Text>}
          <View style={[s.btnRow, btns.length === 1 && s.btnRowSingle]}>
            {btns.map((btn, i) => {
              const isDestructive = btn.style === 'destructive'
              const isCancel      = btn.style === 'cancel'
              const color = isDestructive ? C.neonRed : isCancel ? C.dimmed : C.neonBlue
              return (
                <TouchableOpacity
                  key={i}
                  style={[s.btn, { borderColor: color + '66' }, btns.length === 1 && s.btnFull]}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose()
                    btn.onPress?.()
                  }}
                >
                  <Text style={[s.btnTxt, { color }]}>{btn.text}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: '#000000ee', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:       { width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.neonBlue + '44', padding: SPACING.lg },
  title:      { color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '900', letterSpacing: 1, marginBottom: SPACING.sm, textAlign: 'center' },
  message:    { color: C.muted, fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: SPACING.lg },
  btnRow:     { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.md },
  btnRowSingle: { justifyContent: 'center' },
  btn:        { flex: 1, borderWidth: 1, borderRadius: 4, paddingVertical: 12, alignItems: 'center' },
  btnFull:    { flex: 0, paddingHorizontal: SPACING.xl },
  btnTxt:     { fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
})
