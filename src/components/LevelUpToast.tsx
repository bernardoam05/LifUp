import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme, FONT } from '../theme';
import { playSound } from '../utils/audioService';


interface LevelUpReward {
  level: number
  items?: string[]
}

interface Props {
  reward: LevelUpReward | null
  onDismiss: () => void
  blocked?: boolean
}

export default function LevelUpToast({ reward, onDismiss, blocked = false }: Props) {
  const C = useTheme();
  const { t } = useTranslation('common');
  const st = React.useMemo(() => getStyles(C), [C]);
  const slideAnim = useRef(new Animated.Value(-150)).current;


  const closeToast = React.useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  }, [onDismiss, slideAnim]);

  useEffect(() => {
    if (!reward || blocked) {
      slideAnim.setValue(-150);
      return;
    }

    // Play level up sound
    playSound('levelUp');

    // Animate in quickly
    Animated.timing(slideAnim, {
      toValue: 50,
      duration: 250,
      useNativeDriver: true,
    }).start();

    // Auto dismiss after 6 seconds
    const timer = setTimeout(() => {
      closeToast();
    }, 6000);

    return () => clearTimeout(timer);
  }, [reward, blocked, closeToast, slideAnim]);

  if (!reward) {return null;}

  return (
    <Animated.View style={[st.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity activeOpacity={0.9} style={st.card} onPress={closeToast}>
        <View style={st.iconWrap}>
          <Icon name="chevron-double-up" size={32} color={C.gold} />
        </View>
        <View style={st.textCol}>
          <Text style={st.title}>{t('toast.level_up_title')}</Text>
          <Text style={st.desc}>{t('toast.level_up_desc', { level: reward.level })}</Text>
        </View>
        <View style={st.closeWrap}>
          <Icon name="close" size={20} color="#fff8" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: C.panel,
    borderWidth: 1.5,
    borderColor: C.gold,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.gold + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: C.gold,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: FONT.orbitron,
    letterSpacing: 3,
    marginBottom: 2,
  },
  desc: {
    color: C.muted,
    fontSize: 13,
  },
  closeWrap: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
