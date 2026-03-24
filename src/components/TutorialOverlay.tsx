/**
 * TutorialOverlay.tsx
 *
 * Two-phase onboarding tutorial.
 *   phase={1} → First-launch tab tour
 *   phase={2} → Level-10 shadow mechanics
 */

import React, { useEffect, useRef, useState } from 'react'
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Animated, Easing, ScrollView, PanResponder
} from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, FONT, SPACING } from '../theme'


const { width: SW, height: SH } = Dimensions.get('window')

// ── Step definitions ───────────────────────────────────────────────────────────

type Arrow = {
  /** where the arrow triangle appears relative to the tooltip */
  side:  'top' | 'bottom' | 'left' | 'right'
  /** horizontal offset from centre (for bottom arrows pointing at tab bar) */
  offsetX?: number
}

type TutorialStep = {
  icon:    string
  title:   string
  body:    string
  arrow?:  Arrow
  /** if true, renders a large welcome card with no arrow */
  splash?: boolean
  /** accent colour */
  color:   string
  /** optional tab to switch to when this step becomes active */
  targetTab?: string
}

// ─── Phase 1 steps ────────────────────────────────────────────────────────────

const TAB_COUNT   = 6
const TAB_W       = SW / TAB_COUNT
// Approximate center X of each tab (0-indexed)
const tabX = (i: number) => TAB_W * i + TAB_W / 2 - SW / 2   // offset from center of screen

const getPhase1Steps = (C: any): TutorialStep[] => [
  {
    splash: true,
    icon:   'sword-cross',
    color:  C.neonBlue,
    title:  'BEM-VINDO, HUNTER',
    body:   'O Sistema acordou. Existe um único caminho à tua frente: ficar mais forte.\n\nEste guia vai mostrar-te como funciona o mundo do Sistema.',
    targetTab: 'Missões',
  },
  {
    icon:  'clipboard-list-outline',
    color: C.neonBlue,
    title: 'MISSÕES DIÁRIAS',
    body:  'Aqui encontras as tuas tarefas de hoje. Completa-as para ganhar XP, subir de nível e acumular Gold.\n\nSe completares todas as diárias recebes uma recompensa especial.',
    arrow: { side: 'bottom', offsetX: tabX(1) },
    targetTab: 'Missões',
  },
  {
    icon:  'sword-cross',
    color: '#f59e0b',
    title: 'O TEU PERFIL E CONFIGS',
    body:  'Aqui vês os teus atributos, o teu Rank de Caçador (que sobe automaticamente) e os teus títulos.\n\nNo canto superior direito, na Roda Dentada, podes ajustar a DIFICULDADE do jogo, afectando o XP ganho e perdido.',
    arrow: { side: 'bottom', offsetX: tabX(0) },
    targetTab: 'Status',
  },
  {
    icon:  'account-group-outline',
    color: C.purple,
    title: 'A TUA TROPA DE SOMBRAS',
    body:  'As Sombras são guerreiros que extrais ao derrotar bosses ou ao completar todas as missões diárias.\n\nCada uma tem um efeito passivo único que te fortalece passivamente.',
    arrow: { side: 'bottom', offsetX: tabX(5) },
    targetTab: 'Sombras',
  },
  {
    icon:  'shopping-outline',
    color: C.gold,
    title: 'A LOJA DO SISTEMA',
    body:  'Usa Gold para comprar Poções de XP, regenerações e outros consumíveis.\n\nAo atingires o Nível 10, sombras únicas ficam disponíveis para recrutamento.',
    arrow: { side: 'bottom', offsetX: tabX(2) },
    targetTab: 'Loja',
  },
  {
    icon:  'brain',
    color: '#22c55e',
    title: 'MODO FOCO & PENALIZAÇÕES',
    body:  'Activa o Modo Foco para bloquear distracções.\n\nSe falhares missões diárias entras na PENALTY ZONE e perdes XP. No modo Focus Hardcore, se falhares o timer, o Sistema bloqueia-te o telemóvel temporariamente!',
    arrow: { side: 'bottom', offsetX: tabX(4) },
    targetTab: 'Focus Mode',
  },
  {
    splash: true,
    icon:   'check-circle-outline',
    color:  C.neonBlue,
    title:  'PRONTO PARA COMEÇAR',
    body:   'A tua primeira missão é simples: completa as Missões Diárias de hoje.\n\nQuanto mais consistente fores, mais o teu Rank vai subir. Vai em frente, Hunter.',
    targetTab: 'Missões',
  },
]

const getPhase2Steps = (C: any): TutorialStep[] => [
  {
    splash: true,
    icon:   'ghost',
    color:  C.purple,
    title:  'NÍVEL 10 — AS SOMBRAS DESPERTAM',
    body:   'Chegaste a um marco importante. A partir de agora, as Sombras começam a revelar-se com mais frequência.\n\nVou mostrar-te como gerir o teu exército.',
    targetTab: 'Sombras',
  },
  {
    icon:  'account-group-outline',
    color: C.purple,
    title: 'A TUA SOMBRA',
    body:  'Cada sombra tem um EFEITO PASSIVO ÚNICO — bónus automáticos que se aplicam às tuas missões.\n\nRanks mais altos (Commander, Marshal) têm efeitos muito mais poderosos.',
    arrow: { side: 'bottom', offsetX: tabX(5) },
    targetTab: 'Sombras',
  },
  {
    icon:  'star-outline',
    color: '#facc15',
    title: 'ADICIONAR A FAVORITOS',
    body:  'Carrega no ícone ⭐ para favoritar.\n\nAs tuas 3 sombras favoritas aplicam os seus efeitos passivos globais: desde proteger-te de perder XP na Zona de Penalidade, a dar bónus de atributos.',
    arrow: { side: 'bottom', offsetX: tabX(5) },
    targetTab: 'Sombras',
  },
  {
    icon:  'lightning-bolt',
    color: '#f59e0b',
    title: 'EFEITOS PASSIVOS ACTIVOS',
    body:  'Com sombras favoritas activadas, os seus bónus aplicam-se automaticamente: mais XP por missão, mais Gold por quest, regeneração de penalidade, etc.\n\nPodes ver os bónus activos no teu Perfil.',
    arrow: { side: 'bottom', offsetX: tabX(0) },
    targetTab: 'Status',
  },
  {
    splash: true,
    icon:   'crown',
    color:  '#facc15',
    title:  'O MONARCA DESPERTA',
    body:   'Continua a conquistar, Hunter. As sombras mais poderosas ainda estão por vir — bosses de Rank S aguardam-te.\n\nForja o teu exército. Torna-te imparável.',
    targetTab: 'Missões',
  },
]


// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  phase:       1 | 2
  onDone:      () => void             // called when tutorial is complete or skipped
  onChangeTab?:(tabName: string) => void // navigate the bottom tab router
}

export default function TutorialOverlay({ phase, onDone, onChangeTab }: Props) {
  const C = useTheme()
  const st = React.useMemo(() => getStyles(C), [C])
  const steps = React.useMemo(() => (phase === 1 ? getPhase1Steps(C) : getPhase2Steps(C)), [phase, C])
  const [step, setStep] = useState(0)

  const [direction, setDirection] = useState<1 | -1>(1)
  
  const fadeAnim   = useRef(new Animated.Value(0)).current
  const slideXAnim = useRef(new Animated.Value(50)).current

  const current = steps[step]
  const isLast  = step === steps.length - 1

  const panResponder = useRef(
    PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -40) {
          // swiped left -> next
          handleNext()
        } else if (gestureState.dx > 40) {
          // swiped right -> prev
          handlePrev()
        }
      },
    })
  ).current

  // Animate in on each step change and trigger tab navigate
  useEffect(() => {
    fadeAnim.setValue(0)
    slideXAnim.setValue(direction * 50)
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideXAnim, { toValue: 0, duration: 350, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
    ]).start()

    if (current.targetTab && onChangeTab) {
      onChangeTab(current.targetTab)
    }
  }, [step, phase])

  function handleNext() {
    if (isLast) {
      onDone()
    } else {
      setDirection(1)
      setStep(s => s + 1)
    }
  }

  function handlePrev() {
    if (step > 0) {
      setDirection(-1)
      setStep(s => s - 1)
    }
  }

  function handleSkip() {
    onDone()
  }

  /** Vertical position of the tooltip card */
  const tooltipOnTop = !!current.arrow && current.arrow.side === 'bottom'

  const spotlightX = current.arrow?.offsetX ? (SW / 2 + current.arrow.offsetX - TAB_W / 2) : 0
  const spotlightW = TAB_W

  return (
    <Modal transparent animationType="none" visible onRequestClose={handleSkip}>
      {/* Dark overlay with swipe handler */}
      <View style={st.overlay} {...panResponder.panHandlers}>
        
        {/* Spotlight Effect (Cut-out simulation) */}
        {!current.splash && current.arrow?.side === 'bottom' && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* Top dark area */}
            <View style={{ flex: 1, backgroundColor: '#000000cc' }} />
            <View style={{ height: 60, flexDirection: 'row' }}>
              {/* Left of spotlight */}
              <View style={{ width: spotlightX, backgroundColor: '#000000cc' }} />
              {/* THE HOLE (Transparent) */}
              <View style={{ width: spotlightW, backgroundColor: 'transparent', borderWidth: 2, borderColor: current.color, borderRadius: 4 }} />
              {/* Right of spotlight */}
              <View style={{ flex: 1, backgroundColor: '#000000cc' }} />
            </View>
            {/* Bottom dark area (optional, depending on where tab bar is) */}
            <View style={{ height: 0, backgroundColor: '#000000cc' }} />
          </View>
        )}

        <Animated.View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', opacity: fadeAnim }}>
          {current.splash ? (
            <Animated.View style={[st.splashCard, { borderColor: current.color + '88', transform: [{ translateX: slideXAnim }] }]}>
              {/* System header */}
              <View style={st.sysRow}>
                <View style={[st.sysDot, { backgroundColor: current.color }]} />
                <Text style={[st.sysTxt, { color: current.color }]}>SISTEMA — PROTOCOLO DE TUTORIAL</Text>
                <View style={[st.sysDot, { backgroundColor: current.color }]} />
              </View>

              {/* Icon */}
              <View style={[st.splashIcon, { borderColor: current.color + '44', backgroundColor: current.color + '12' }]}>
                <Icon name={current.icon} size={48} color={current.color} />
              </View>

              <Text style={[st.splashTitle, { color: current.color }]}>{current.title}</Text>
              <Text style={st.splashBody}>{current.body}</Text>

              {/* Progress dots */}
              <View style={st.dots}>
                {steps.map((_, i) => (
                  <View key={i} style={[st.dot, { backgroundColor: i === step ? current.color : current.color + '33' }]} />
                ))}
              </View>

              {/* Buttons */}
              <View style={st.btnRow}>
                {!isLast && (
                  <TouchableOpacity onPress={handleSkip} style={st.skipBtn}>
                    <Text style={st.skipTxt}>SALTAR</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleNext}
                  style={[st.nextBtn, { borderColor: current.color, backgroundColor: current.color + '15' }]}
                  activeOpacity={0.8}
                >
                  <Text style={[st.nextTxt, { color: current.color }]}>
                    {isLast ? 'COMEÇAR' : 'PRÓXIMO'}
                  </Text>
                  <Icon name={isLast ? 'sword-cross' : 'arrow-right'} size={14} color={current.color} />
                </TouchableOpacity>
              </View>
            </Animated.View>

          ) : (
            /* ── Arrow tooltip pointing at tab bar ── */
            <Animated.View
              style={[
                st.tooltipWrap,
                tooltipOnTop ? st.tooltipTop : st.tooltipBottom,
                { transform: [{ translateX: slideXAnim }] },
              ]}
            >
              <View style={[st.tooltipCard, { borderColor: current.color + '88', backgroundColor: '#0a0f1d' }]}>
                {/* Header */}
                <View style={st.tooltipHeader}>
                  <Icon name={current.icon} size={16} color={current.color} />
                  <Text style={[st.tooltipTitle, { color: current.color }]}> {current.title}</Text>
                </View>
                <View style={[st.tooltipDivider, { backgroundColor: current.color + '44' }]} />
                <Text style={st.tooltipBody}>{current.body}</Text>

                {/* Progress dots */}
                <View style={[st.dots, { marginTop: SPACING.md }]}>
                  {steps.map((_, i) => (
                    <View key={i} style={[st.dot, { backgroundColor: i === step ? current.color : current.color + '33' }]} />
                  ))}
                </View>

                {/* Buttons */}
                <View style={st.btnRow}>
                  <TouchableOpacity onPress={handleSkip} style={st.skipBtn}>
                    <Text style={st.skipTxt}>SALTAR</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleNext}
                    style={[st.nextBtn, { borderColor: current.color, backgroundColor: current.color + '15' }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[st.nextTxt, { color: current.color }]}>PRÓXIMO</Text>
                    <Icon name="arrow-right" size={14} color={current.color} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Arrow triangle pointing down at tab bar */}
              {current.arrow?.side === 'bottom' && (
                <View
                  style={[
                    st.arrowDown,
                    {
                      borderTopColor: current.color,
                      alignSelf:      'center',
                      marginLeft:     current.arrow.offsetX ?? 0,
                    },
                  ]}
                />
              )}
            </Animated.View>
          )}
        </Animated.View>
      </View>
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
 
const getStyles = (C: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000099', // Slightly lighter to let spotlight stand out
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Splash card (centred, no arrow)
  splashCard: {
    backgroundColor: '#0a0f1d',
    borderWidth: 2,
    borderRadius: 12,
    padding: SPACING.xl,
    width: SW - SPACING.xl * 2,
    alignItems: 'center',
    gap: SPACING.md,
    // Add glowing shadow
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  sysRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sysDot: { width: 4, height: 4, borderRadius: 2 },
  sysTxt: { fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 2, fontWeight: '700' },
  splashIcon: {
    width: 96, height: 96, borderRadius: 48, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginVertical: SPACING.sm,
  },
  splashTitle: {
    fontFamily: FONT.orbitron, fontSize: 20, fontWeight: '900',
    letterSpacing: 2, textAlign: 'center', textTransform: 'uppercase',
  },
  splashBody: {
    color: '#cbd5e1', fontSize: 13, lineHeight: 22, textAlign: 'center', fontFamily: FONT.orbitron,
  },

  // Tooltip (at bottom, arrow pointing down)
  tooltipWrap: {
    width: SW - SPACING.lg * 2,
  },
  tooltipTop:    { position: 'absolute', bottom: 100 },   // adjusted for better tab bar clearance
  tooltipBottom: { position: 'absolute', top: 100 },

  tooltipCard: {
    backgroundColor: '#0a0f1d',
    borderWidth: 2,
    borderRadius: 12,
    padding: SPACING.lg,
    shadowColor: '#00ffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  tooltipHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tooltipTitle:  { fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  tooltipDivider:{ height: 1, marginBottom: 12 },
  tooltipBody:   { color: '#cbd5e1', fontSize: 13, lineHeight: 21, fontFamily: FONT.orbitron },

  // Arrow
  arrowDown: {
    width: 0, height: 0,
    borderLeftWidth: 12, borderLeftColor: 'transparent',
    borderRightWidth: 12, borderRightColor: 'transparent',
    borderTopWidth: 15,
    marginTop: -1, // merge with card border
  },

  // Shared
  dots: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  dot:  { width: 6, height: 6, borderRadius: 3 },

  btnRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'flex-end', gap: SPACING.md,
    marginTop: SPACING.lg, width: '100%',
  },
  skipBtn: { padding: 10 },
  skipTxt: { color: '#64748b', fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1, fontWeight: '700' },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 20,
  },
  nextTxt: { fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 1.5, fontWeight: '900' },
})
