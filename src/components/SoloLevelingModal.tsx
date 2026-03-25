import React from 'react'
import {
  Modal,
  ModalProps,
  View,
  StyleSheet,
  ViewStyle,
  TouchableWithoutFeedback,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '../theme'

export interface SoloLevelingModalProps extends ModalProps {
  children: React.ReactNode
  /** Extra container styles for the centered card/content */
  contentStyle?: ViewStyle
  /** If true, the dark overlay is less opaque */
  dimmed?: boolean
  /** If true, uses standard slide animation instead of fade (default) */
  slide?: boolean
  /** Optional custom extra bottom padding */
  bottomOffset?: number
  /** If true, skip automatic safe area padding (useful for full-screen overlays) */
  noPadding?: boolean
  /** If false, renders as an absolute positioned View instead of a Modal. Useful for avoiding nested Modal bugs on iOS. */
  useNativeModal?: boolean
}

/**
 * A wrapper around React Native's Modal that automatically handles:
 * 1. Safe Area Insets (bottom home bar)
 * 2. Translucent StatusBar on Android for true full-screen overlay
 * 3. Consistent Dark Overlay and Centering
 *
 * NOTE: The overlay is always truly full-width (no left/right inset shrinking).
 * Only top/bottom insets are applied to the content wrapper.
 */
export default function SoloLevelingModal({ children, contentStyle, dimmed, slide, useNativeModal = true, bottomOffset = 0, noPadding = false, ...modalProps }: SoloLevelingModalProps) {
  const C = useTheme()
  const insets = useSafeAreaInsets()
  const s = getStyles(C)

  const content = (
    <View style={[s.overlay, dimmed && s.overlayDimmed]} pointerEvents="box-none">
      <TouchableWithoutFeedback onPress={modalProps.onRequestClose}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>
      {/* Content wrapper gets top/bottom padding for safe area */}
      <View style={[
        s.contentWrapper,
        !noPadding && {
          paddingTop: insets.top,
          paddingBottom: Math.max(insets.bottom, bottomOffset),
        },
        contentStyle,
      ]} pointerEvents="box-none">
        {children}
      </View>
    </View>
  )

  if (!useNativeModal) {
    if (!modalProps.visible) return null
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="box-none">
        {content}
      </View>
    )
  }

  return (
    <Modal
      transparent
      animationType={slide ? 'slide' : 'fade'}
      statusBarTranslucent
      {...modalProps}
    >
      {content}
    </Modal>
  )
}

const getStyles = (C: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayDimmed: {
    backgroundColor: '#00000099',
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
