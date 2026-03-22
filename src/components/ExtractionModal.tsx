import React, { useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  Animated, Vibration, Easing,
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { SHADOW_RANK_COLOR } from '../data/shadows'
import type { ExtractionResult } from '../store/useGameStore'
import { C, FONT, SPACING } from '../theme'

// Rank labels
const RANK_LABELS: Record<string, string> = {
  Normal:    'NORMAL',
  Elite:     'ELITE',
  Knight:    'CAVALEIRO',
  Commander: 'COMANDANTE',
  Marshal:   'MARECHAL',
}

interface Props {
  result:    ExtractionResult
  onDismiss: () => void
}

export default function ExtractionModal({ result, onDismiss }: Props) {
  const { shadow, isLevelUp, newLevel } = result

  const isCustom      = (shadow as any).type === 'Custom'
  const isAchievement = shadow.unlockMethod?.type === 'achievement'
  const rankColor  = isCustom ? '#a855f7' : (SHADOW_RANK_COLOR[shadow.rank as keyof typeof SHADOW_RANK_COLOR] ?? '#94a3b8')
  const rankLabel  = RANK_LABELS[shadow.rank] ?? shadow.rank.toUpperCase()

  // Animations
  const glowAnim      = useRef(new Animated.Value(0)).current
  const slideAnim     = useRef(new Animated.Value(60)).current
  const fadeAnim      = useRef(new Animated.Value(0)).current
  const iconScaleAnim = useRef(new Animated.Value(0)).current
  const glitchAnim    = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Vibration sequence: short burst then long rumble
    Vibration.vibrate([0, 80, 40, 80, 40, 200, 80, 400])

    // Glitch flicker on appear
    Animated.sequence([
      Animated.timing(glitchAnim, { toValue: 1, duration: 60,  useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: 0, duration: 40,  useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: 1, duration: 80,  useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: 0, duration: 30,  useNativeDriver: true }),
      Animated.timing(glitchAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start()

    // Slide up + fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 450, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true,
      }),
    ]).start()

    // Icon scale bounce (delayed)
    setTimeout(() => {
      Animated.spring(iconScaleAnim, {
        toValue: 1, friction: 5, tension: 100, useNativeDriver: true,
      }).start()
    }, 200)

    // Continuous glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sine), useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sine), useNativeDriver: false }),
      ])
    ).start()
  }, [])

  const glowOpacity    = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] })
  const glitchOpacity  = glitchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })

  return (
    <Modal transparent animationType="none" visible onRequestClose={onDismiss}>
      {/* Glitch overlay flash */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: rankColor, opacity: glitchOpacity, zIndex: 999 }]}
      />

      <View style={st.overlay}>
        <Animated.View
          style={[
            st.card,
            { borderColor: rankColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Top label */}
          <View style={st.systemRow}>
            <View style={[st.systemDot, { backgroundColor: C.neonBlue }]} />
            <Text style={st.systemTxt}>SISTEMA — PROTOCOLO DE EXTRAÇÃO</Text>
            <View style={[st.systemDot, { backgroundColor: C.neonBlue }]} />
          </View>

          <Text style={st.intro}>{isAchievement ? 'CONQUISTA DESBLOQUEADA.' : 'A MASMORRA FOI LIMPA.'}</Text>
          <Text style={st.intro2}>{isAchievement ? 'SOMBRA CONCEDIDA PELO SISTEMA...' : 'EXTRAÇÃO DE SOMBRA INICIADA...'}</Text>

          {/* Divider */}
          <Animated.View style={[st.divider, { borderColor: rankColor, opacity: glowOpacity }]} />

          {/* Shadow icon */}
          <Animated.View
            style={[
              st.iconWrap,
              { borderColor: rankColor, backgroundColor: rankColor + '18', transform: [{ scale: iconScaleAnim }] },
            ]}
          >
            <Icon name={shadow.icon} size={56} color={rankColor} />
          </Animated.View>

          {/* Rank badge */}
          <Animated.View style={[st.rankBadge, { borderColor: rankColor, opacity: glowOpacity }]}>
            <Text style={[st.rankTxt, { color: rankColor }]}>{rankLabel}</Text>
          </Animated.View>

          {/* Shadow name */}
          <Text style={[st.shadowName, { color: rankColor }]}>{shadow.name}</Text>

          {/* Passive effect */}
          <View style={[st.passiveRow, { borderColor: rankColor + '44', backgroundColor: rankColor + '0d' }]}>
            <Icon name="lightning-bolt" size={12} color={rankColor} />
            <Text style={[st.passiveTxt, { color: rankColor }]}> {shadow.passiveEffect?.description ?? ''}</Text>
          </View>

          {/* Level-up vs new soul reveal */}
          {isLevelUp ? (
            <View style={st.awakenBox}>
              <Icon name="arrow-up-bold-circle" size={20} color='#facc15' style={{ marginBottom: 6 }} />
              <Text style={st.awakenTitle}>FRAGMENTOS ABSORVIDOS</Text>
              <Text style={st.awakenSub}>
                {shadow.name.toUpperCase()} SUBIU PARA O{'\n'}
                <Text style={st.awakenLevel}>NÍVEL {newLevel}</Text>
              </Text>
            </View>
          ) : (
            <View style={st.newSoulBox}>
              <Icon name="ghost" size={16} color={C.neonBlue} style={{ marginBottom: 4 }} />
              <Text style={st.newSoulTxt}>NOVA SOMBRA ADQUIRIDA</Text>
              <Text style={st.newSoulSub}>Reporta-te à Sala do Trono para equipar.</Text>
            </View>
          )}

          {/* Collect button */}
          <TouchableOpacity
            style={[st.collectBtn, { borderColor: rankColor }]}
            onPress={onDismiss}
            activeOpacity={0.8}
          >
            <Animated.View style={{ opacity: glowOpacity }}>
              <Icon name="ghost" size={16} color={rankColor} />
            </Animated.View>
            <Text style={[st.collectTxt, { color: rankColor }]}> RECOLHER ALMA</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000000f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: '#04020e',
    borderRadius: 4,
    borderWidth: 2,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },

  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  systemDot: { width: 4, height: 4, borderRadius: 2 },
  systemTxt: {
    color: C.neonBlue,
    fontFamily: FONT.orbitron,
    fontSize: 7,
    letterSpacing: 2,
  },

  intro: {
    color: '#e2e8f0',
    fontFamily: FONT.orbitron,
    fontSize: 12,
    letterSpacing: 3,
    textAlign: 'center',
  },
  intro2: {
    color: C.muted,
    fontFamily: FONT.orbitron,
    fontSize: 9,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  divider: {
    width: '60%',
    borderWidth: 1,
    marginBottom: SPACING.md,
  },

  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },

  rankBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: SPACING.sm,
  },
  rankTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 9,
    letterSpacing: 4,
  },

  shadowName: {
    fontFamily: FONT.orbitron,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  passiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    width: '100%',
    marginBottom: SPACING.md,
  },
  passiveTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 9,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.5,
  },

  awakenBox: {
    width: '100%',
    backgroundColor: '#facc1508',
    borderWidth: 1,
    borderColor: '#facc1544',
    borderRadius: 6,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  awakenTitle: {
    color: '#facc15',
    fontFamily: FONT.orbitron,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 6,
  },
  awakenSub: {
    color: C.muted,
    fontFamily: FONT.orbitron,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 20,
  },
  awakenLevel: {
    color: '#facc15',
    fontFamily: FONT.orbitron,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
  },

  newSoulBox: {
    width: '100%',
    backgroundColor: C.neonBlue + '08',
    borderWidth: 1,
    borderColor: C.neonBlue + '33',
    borderRadius: 6,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  newSoulTxt: {
    color: C.neonBlue,
    fontFamily: FONT.orbitron,
    fontSize: 10,
    letterSpacing: 2,
    marginBottom: 4,
  },
  newSoulSub: {
    color: C.dimmed,
    fontSize: 11,
    textAlign: 'center',
  },

  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
    width: '100%',
  },
  collectTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2,
  },
})
