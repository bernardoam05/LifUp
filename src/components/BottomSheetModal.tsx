import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableWithoutFeedback,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

interface Props {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  contentStyle?: ViewStyle
  dimmed?: boolean
  useNativeModal?: boolean
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function BottomSheetModal({ visible, onClose, children, contentStyle, dimmed, useNativeModal = true }: Props) {
  const C = useTheme();
  const [showModal, setShowModal] = useState(visible);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const s = getStyles(C);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
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
      ]).start();
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
        setShowModal(false);
      });
    }
  }, [visible, fadeAnim, translateY]);

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
      setShowModal(false);
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only take over if pulling down significantly
        return gestureState.dy > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.vy > 0.5 || gestureState.dy > 100) {
          triggerClose(); // Swipe down to close
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 10,
          }).start();
        }
      },
    })
  ).current;

  if (!showModal) {return null;}

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
            <View style={s.handleContainer}>
              <View style={s.handle} />
            </View>
            {children}
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
    </>
  );

  if (!useNativeModal) {
    return (
      <View style={[StyleSheet.absoluteFill, s.stacked]} pointerEvents="box-none">
        {content}
      </View>
    );
  }

  return (
    <Modal transparent visible={showModal} animationType="none" statusBarTranslucent>
      {content}
    </Modal>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.surface.overlay,
  },
  dimmed: {
    backgroundColor: C.surface.overlay,
  },
  sheet: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    width: '100%',
    backgroundColor: C.surface.elevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: C.text.secondary + '40',
    borderRadius: 2,
  },
  stacked: {
    zIndex: 9999,
  },
});
