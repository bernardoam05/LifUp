import React, { useEffect, useRef } from 'react'
import { Animated, StyleSheet, Text, View, Dimensions, TouchableOpacity } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme } from '../theme'
import { playSound } from '../utils/audioService'


const { width: SW } = Dimensions.get('window')

interface LevelUpReward {
  level: number
  items?: string[]
}

interface Props {
  reward: LevelUpReward | null
  onDismiss: () => void
}

export default function LevelUpToast({ reward, onDismiss }: Props) {
  const C = useTheme()
  const st = React.useMemo(() => getStyles(C), [C])
  const slideAnim = useRef(new Animated.Value(-150)).current


  useEffect(() => {
    if (reward) {
      // Play level up sound
      playSound('levelUp')
      
      // Animate in
      Animated.spring(slideAnim, {
        toValue: 50, // slide down to visible
        useNativeDriver: true,
        bounciness: 12,
      }).start()

      // Auto dismiss after 4 seconds
      const timer = setTimeout(() => {
        closeToast()
      }, 4000)

      return () => clearTimeout(timer)
    } else {
      // Ensure it's hidden
      slideAnim.setValue(-150)
    }
  }, [reward])

  function closeToast() {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss()
    })
  }

  if (!reward) return null

  return (
    <Animated.View style={[st.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity activeOpacity={0.9} style={st.card} onPress={closeToast}>
        <View style={st.iconWrap}>
          <Icon name="chevron-double-up" size={32} color={C.gold} />
        </View>
        <View style={st.textCol}>
          <Text style={st.title}>LEVEL UP!</Text>
          <Text style={st.desc}>Atingiste o Nível {reward.level}</Text>
        </View>
        <View style={st.closeWrap}>
          <Icon name="close" size={20} color="#fff8" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const getStyles = (C: any) => StyleSheet.create({

  container: {
    position: 'absolute',
    top: 0,
    width: SW,
    zIndex: 9999,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    shadowColor: C.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconWrap: {
    marginRight: 12,
  },
  textCol: {
    flex: 1,
  },
  title: {
    color: C.gold,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'System',
    marginBottom: 2,
  },
  desc: {
    color: C.muted,
    fontSize: 14,
  },
  closeWrap: {
    padding: 4,
  }
})
