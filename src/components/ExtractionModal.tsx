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

  // Determine friendly origin label
  const originLabel = (() => {
    if (isCustom) return 'CRIADA NA FORJA'
    if (shadow.unlockMethod?.type === 'achievement') return 'CONQUISTA DESBLOQUEADA'
    if (shadow.unlockMethod?.type === 'boss_drop')   return 'QUEDA DE BOSS'
    if (shadow.unlockMethod?.type === 'shop')        return 'COMPRA NA LOJA'
    // Default: standard extraction from completing all daily quests
    return 'EXTRAÇÃO DIÁRIA'
  })()

  // Animations
  const glowAnim      = useRef(new Animated.Value(0)).current
  const slideAnim     = useRef(new Animated.Value(60)).current
  const fadeAnim      = useRef(new Animated.Value(0)).current
  const iconScaleAnim = useRef(new Animated.Value(0)).current
  const glitchAnim    = useRef(new Animated.Value(0)).current
  const ariseAnim     = useRef(new Animated.Value(0)).current
  const ariseScale    = useRef(new Animated.Value(0.2)).current
  const poolAnim      = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Stage 1: "ARISE" Text
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.timing(ariseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(ariseScale, { toValue: 1.1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.delay(500),
      Animated.timing(ariseAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => {
      // Stage 2: Reveal Card
      Vibration.vibrate([0, 80, 40, 80, 40, 200, 80, 400])
      
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
        Animated.timing(poolAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start()

      // icon scale bounce
      setTimeout(() => {
        Animated.spring(iconScaleAnim, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }).start()
      }, 100)
    })

    // Glitch flicker on card appear (Stage 2)
    setTimeout(() => {
      Animated.sequence([
        Animated.timing(glitchAnim, { toValue: 1, duration: 60,  useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0, duration: 40,  useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 1, duration: 80,  useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0, duration: 30,  useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(glitchAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]).start()
    }, 1800)

    // Continuous glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const glowOpacity    = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] })
  const glitchOpacity  = glitchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] })

  return (
    <Modal transparent animationType="none" visible onRequestClose={onDismiss}>
      {/* Glitch overlay flash */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { backgroundColor: rankColor, opacity: glitchOpacity, zIndex: 999 }]}
      />

      <View style={st.overlay}>
        {/* Stage 1: ARISE Text overlay — only for new shadows (not level-up/achievement) */}
        {!isLevelUp && !isAchievement && (
          <Animated.View style={[st.ariseLayer, { opacity: ariseAnim, transform: [{ scale: ariseScale }] }]}>
            <Text style={[st.ariseTxt, { color: rankColor }]}>ARISE</Text>
            <View style={[st.ariseSubLine, { backgroundColor: rankColor }]} />
            <Text style={st.ariseSubTxt}>PROTOCOLO DE EXTRAÇÃO ATIVADO</Text>
          </Animated.View>
        )}

        {/* Shadow Pool effect */}
        <Animated.View style={[st.pool, { backgroundColor: rankColor + '20', transform: [{ scaleX: poolAnim }] }]} />

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

          {/* shadow aura layers */}
          <View style={st.auraContainer}>
            <Animated.View style={[st.aura, { borderColor: rankColor, opacity: Animated.multiply(glowOpacity, 0.3), transform: [{ scale: Animated.add(iconScaleAnim, 0.2) }] }]} />
            <Animated.View style={[st.aura, { borderColor: rankColor, opacity: Animated.multiply(glowOpacity, 0.15), transform: [{ scale: Animated.add(iconScaleAnim, 0.5) }] }]} />
          </View>

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

          {/* Origin chip */}
          <View style={[st.originChip, { borderColor: rankColor + '44' }]}>
            <Icon name="information-outline" size={10} color={rankColor} />
            <Text style={[st.originTxt, { color: rankColor }]}> ORIGEM: {originLabel}</Text>
          </View>

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

  originChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 4,
  },
  originTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 8,
    letterSpacing: 1.5,
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

  // Arise specific
  ariseLayer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  ariseTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 15,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  ariseSubLine: {
    width: 200,
    height: 2,
    marginVertical: 10,
  },
  ariseSubTxt: {
    color: '#fff',
    fontFamily: FONT.orbitron,
    fontSize: 8,
    letterSpacing: 4,
    opacity: 0.8,
  },
  pool: {
    position: 'absolute',
    bottom: '25%',
    width: '120%',
    height: 100,
    borderRadius: 50,
    zIndex: 0,
    opacity: 0.5,
  },
  auraContainer: {
    position: 'absolute',
    top: 150, // rough center of icon area
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: -1,
  },
  aura: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 16,
    borderWidth: 2,
  },
})
