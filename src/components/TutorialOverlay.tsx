/**
 * TutorialOverlay.tsx
 *
 * Two-phase onboarding tutorial.
 *   phase={1} → First-launch tab tour
 *   phase={2} → Level-10 shadow mechanics
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Animated, Easing, PanResponder,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme, FONT, SPACING } from '../theme';


const { width: SW } = Dimensions.get('window');

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

const TAB_COUNT   = 5;
const TAB_W       = SW / TAB_COUNT;
// Approximate center X of each tab (0-indexed)
const tabX = (i: number) => TAB_W * i + TAB_W / 2 - SW / 2;   // offset from center of screen

const getPhase1Steps = (C: any, t: (k: string) => string): TutorialStep[] => [
  {
    splash: true,
    icon:   'sword-cross',
    color:  C.neonBlue,
    title:  t('tutorial.phase1.0.title'),
    body:   t('tutorial.phase1.0.body'),
    targetTab: 'Missões',
  },
  {
    icon:  'clipboard-list-outline',
    color: C.neonBlue,
    title: t('tutorial.phase1.1.title'),
    body:  t('tutorial.phase1.1.body'),
    arrow: { side: 'bottom', offsetX: tabX(0) },
    targetTab: 'Missões',
  },
  {
    splash: true,
    icon:   'anvil',
    color:  '#f97316',
    title:  t('tutorial.phase1.2.title'),
    body:   t('tutorial.phase1.2.body'),
    targetTab: 'Missões',
  },
  {
    icon:  'sword-cross',
    color: '#f59e0b',
    title: t('tutorial.phase1.3.title'),
    body:  t('tutorial.phase1.3.body'),
    arrow: { side: 'bottom', offsetX: tabX(1) },
    targetTab: 'Status',
  },
  {
    icon:  'account-group-outline',
    color: C.purple,
    title: t('tutorial.phase1.4.title'),
    body:  t('tutorial.phase1.4.body'),
    arrow: { side: 'bottom', offsetX: tabX(1) },
    targetTab: 'Status',
  },
  {
    icon:  'shopping-outline',
    color: C.gold,
    title: t('tutorial.phase1.5.title'),
    body:  t('tutorial.phase1.5.body'),
    arrow: { side: 'bottom', offsetX: tabX(2) },
    targetTab: 'Loja',
  },
  {
    icon:  'brain',
    color: '#22c55e',
    title: t('tutorial.phase1.6.title'),
    body:  t('tutorial.phase1.6.body'),
    arrow: { side: 'bottom', offsetX: tabX(4) },
    targetTab: 'Focus',
  },
  {
    splash: true,
    icon:   'check-circle-outline',
    color:  C.neonBlue,
    title:  t('tutorial.phase1.7.title'),
    body:   t('tutorial.phase1.7.body'),
    targetTab: 'Missões',
  },
];

const getPhase2Steps = (C: any, t: (k: string) => string): TutorialStep[] => [
  {
    splash: true,
    icon:   'ghost',
    color:  C.purple,
    title:  t('tutorial.phase2.0.title'),
    body:   t('tutorial.phase2.0.body'),
    targetTab: 'Status',
  },
  {
    icon:  'account-group-outline',
    color: C.purple,
    title: t('tutorial.phase2.1.title'),
    body:  t('tutorial.phase2.1.body'),
    arrow: { side: 'bottom', offsetX: tabX(1) },
    targetTab: 'Status',
  },
  {
    icon:  'star-outline',
    color: '#facc15',
    title: t('tutorial.phase2.2.title'),
    body:  t('tutorial.phase2.2.body'),
    arrow: { side: 'bottom', offsetX: tabX(1) },
    targetTab: 'Status',
  },
  {
    icon:  'lightning-bolt',
    color: '#f59e0b',
    title: t('tutorial.phase2.3.title'),
    body:  t('tutorial.phase2.3.body'),
    arrow: { side: 'bottom', offsetX: tabX(1) },
    targetTab: 'Status',
  },
  {
    splash: true,
    icon:   'crown',
    color:  '#facc15',
    title:  t('tutorial.phase2.4.title'),
    body:   t('tutorial.phase2.4.body'),
    targetTab: 'Missões',
  },
];


// ── Component ──────────────────────────────────────────────────────────────────

interface Props {
  phase:       1 | 2
  onDone:      () => void             // called when tutorial is complete or skipped
  onChangeTab?:(tabName: string) => void // navigate the bottom tab router
}

export default function TutorialOverlay({ phase, onDone, onChangeTab }: Props) {
  const C = useTheme();
  const { t } = useTranslation('common');
  const st = React.useMemo(() => getStyles(), []);
  const steps = React.useMemo(() => (phase === 1 ? getPhase1Steps(C, t) : getPhase2Steps(C, t)), [phase, C, t]);
  const [step, setStep] = useState(0);

  const [direction, setDirection] = useState<1 | -1>(1);

  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideXAnim = useRef(new Animated.Value(50)).current;

  const current = steps[step];
  const isLast  = step === steps.length - 1;

  const panResponder = useRef(
    PanResponder.create({
      // Ask to be the responder:
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -40) {
          // swiped left -> next
          handleNext();
        } else if (gestureState.dx > 40) {
          // swiped right -> prev
          handlePrev();
        }
      },
    })
  ).current;

  // Animate in on each step change and trigger tab navigate
  useEffect(() => {
    fadeAnim.setValue(0);
    slideXAnim.setValue(direction * 50);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slideXAnim, { toValue: 0, duration: 350, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
    ]).start();

    if (current.targetTab && onChangeTab) {
      onChangeTab(current.targetTab);
    }
  }, [step, phase, current.targetTab, direction, fadeAnim, onChangeTab, slideXAnim]);

  function handleNext() {
    if (isLast) {
      onDone();
    } else {
      setDirection(1);
      setStep(s => s + 1);
    }
  }

  function handlePrev() {
    if (step > 0) {
      setDirection(-1);
      setStep(s => s - 1);
    }
  }

  function handleSkip() {
    onDone();
  }

  /** Vertical position of the tooltip card */
  const tooltipOnTop = !!current.arrow && current.arrow.side === 'bottom';

  const spotlightX = current.arrow?.offsetX ? (SW / 2 + current.arrow.offsetX - TAB_W / 2) : 0;
  const spotlightW = TAB_W;

  return (
    <Modal transparent animationType="none" visible statusBarTranslucent onRequestClose={handleSkip}>
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
                <Text style={[st.sysTxt, { color: current.color }]}>{t('tutorial.system_label')}</Text>
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
                    <Text style={st.skipTxt}>{t('tutorial.skip')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleNext}
                  style={[st.nextBtn, { borderColor: current.color, backgroundColor: current.color + '15' }]}
                  activeOpacity={0.8}
                >
                  <Text style={[st.nextTxt, { color: current.color }]}>
                    {isLast ? t('tutorial.start') : t('tutorial.next')}
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
                    <Text style={st.skipTxt}>{t('tutorial.skip')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleNext}
                    style={[st.nextBtn, { borderColor: current.color, backgroundColor: current.color + '15' }]}
                    activeOpacity={0.8}
                  >
                    <Text style={[st.nextTxt, { color: current.color }]}>{t('tutorial.next')}</Text>
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
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = () => StyleSheet.create({
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
    borderRadius: 10,
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
    borderRadius: 10,
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
});
