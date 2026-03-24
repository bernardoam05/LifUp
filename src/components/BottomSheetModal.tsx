import React, { useEffect, useRef, useState } from 'react'
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
  Dimensions,
  ViewStyle,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface Props {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  contentStyle?: ViewStyle
  dimmed?: boolean
  useNativeModal?: boolean
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window')

export default function BottomSheetModal({ visible, onClose, children, contentStyle, dimmed, useNativeModal = true }: Props) {
  const [showModal, setShowModal] = useState(visible)
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) {
      setShowModal(true)
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowModal(false)
      })
    }
  }, [visible])

  const triggerClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowModal(false)
      onClose()
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only take over if pulling down significantly
        return gestureState.dy > 10
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.vy > 0.5 || gestureState.dy > 100) {
          triggerClose() // Swipe down to close
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 10,
          }).start()
        }
      },
    })
  ).current

  if (!showModal) return null

  const content = (
    <>
      <TouchableWithoutFeedback onPress={triggerClose}>
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[s.overlay, dimmed && s.dimmed, { opacity: fadeAnim }]} />
        </View>
      </TouchableWithoutFeedback>

      <Animated.View
        pointerEvents="box-none"
        style={[s.sheet, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableWithoutFeedback>
          <View style={[s.content, contentStyle]}>
            {/* The small handle at the top */}
            <View style={s.handleWrap}>
              <View style={s.handle} />
            </View>
            {children}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </>
  )

  if (!useNativeModal) {
    return (
      <View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]} pointerEvents="box-none">
        {content}
      </View>
    )
  }

  return (
    <Modal transparent visible={showModal} animationType="none" statusBarTranslucent>
      {content}
    </Modal>
  )
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000d0',
  },
  dimmed: {
    backgroundColor: '#00000099',
  },
  sheet: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    backgroundColor: '#0a0005', // Default dark bg, override in contentStyle if needed
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ffffff40',
    borderRadius: 2,
  },
})
