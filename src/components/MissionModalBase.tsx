import React from 'react'
import { Text, StyleSheet, Modal, Pressable, ScrollView, Dimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { FONT, SPACING } from '../theme'

interface MissionModalBaseProps {
  visible: boolean
  onClose: () => void
  onRequestClose?: () => void
  /** Icon shown at the top of the modal */
  iconName: string
  iconColor: string
  /** Small uppercase label above the title (e.g. "⚠ PORTAL PERIGOSO ⚠") */
  warningText: string
  /** Main title text */
  title: string
  titleColor: string
  /** Border color of the card */
  borderColor: string
  children: React.ReactNode
  C: any
}

/**
 * Centered modal wrapper for dungeon mission modals.
 * Provides the card container, inset padding, icon header, and title.
 * Used by DungeonKeyModal and EventDungeonModal.
 */
export default function MissionModalBase({
  visible,
  onClose,
  onRequestClose,
  iconName,
  iconColor,
  warningText,
  title,
  titleColor,
  borderColor,
  children,
  C,
}: MissionModalBaseProps) {
  const insets = useSafeAreaInsets()
  const s = getStyles(C)
  const screenHeight = Dimensions.get('window').height
  const cardMaxHeight = screenHeight - insets.top - insets.bottom - 2 * SPACING.lg

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose ?? onClose}
    >
      <Pressable style={s.overlay} onPress={onRequestClose ?? onClose}>
        <Pressable
          style={[s.card, { borderColor, maxHeight: cardMaxHeight }]}
          onPress={() => {}}
        >
          <Icon name={iconName} size={40} color={iconColor} style={{ marginBottom: SPACING.sm, alignSelf: 'center' }} />
          <Text style={[s.warning, { color: iconColor }]}>{warningText}</Text>
          <Text style={[s.title, { color: titleColor }]} numberOfLines={2}>
            {title.toUpperCase()}
          </Text>
          <ScrollView
            style={s.childScroll}
            contentContainerStyle={{ paddingBottom: Math.max(SPACING.lg, insets.bottom + SPACING.sm) }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

export const getStyles = (C: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: C.panel,
    borderRadius: 16,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 420,
    alignItems: 'stretch',
    borderWidth: 1,
  },
  childScroll: {
    width: '100%',
  },
  warning: {
    fontFamily: FONT.orbitron,
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 4,
    textAlign: 'center',
  },
  title: {
    fontFamily: FONT.orbitron,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
})
