// src/components/PenaltyModal.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Vibration, Animated, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import useGameStore from '../store/useGameStore';
import { useTheme, FONT, SPACING } from '../theme';

const getStyles = (C: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' },
  card: { width: '88%', backgroundColor: C.surface.elevated, borderWidth: 1.5, borderRadius: 12, padding: SPACING.xl, alignItems: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: SPACING.sm, marginBottom: SPACING.lg },
  topLine: { flex: 1, height: 1 },
  topLabel: { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 3 },
  warning: { fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 4, marginBottom: SPACING.sm, color: C.text.secondary },
  iconWrap: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg, borderWidth: 1 },
  title: { color: C.text.primary, fontFamily: FONT.orbitron, fontSize: 20, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.md },
  badge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 6, marginBottom: SPACING.lg },
  badgeTxt: { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', color: C.text.primary, letterSpacing: 2 },
  message: { color: C.text.secondary, fontSize: 13, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl },
  btn: { width: '100%', borderWidth: 1.5, borderRadius: 8, paddingVertical: 14, alignItems: 'center', backgroundColor: C.surface.base, minHeight: 48 },
  btnTxt: { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '900', letterSpacing: 2, color: C.text.primary },
});

const INTENSITY_FLAVOR = (C: any) => ({
  light: { icon: 'shield-alert-outline', color: C.green },
  medium: { icon: 'alert-octagon', color: C.gold },
  hardcore: { icon: 'skull-crossbones', color: C.neonRed },
  custom: { icon: 'alert-octagon', color: C.gold },
});

export default function PenaltyModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const C = useTheme();
  const { t } = useTranslation('modals');
  const s = getStyles(C);
  const lastPenaltyInfo = useGameStore(st => st.system.lastPenaltyInfo);
  const intensityFlavors = INTENSITY_FLAVOR(C);

  // ── Animações de entrada ───────────────────────────────────────────────────
  const cardScale   = useRef(new Animated.Value(0.82)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      cardScale.setValue(0.82);
      cardOpacity.setValue(0);
      return;
    }

    const intensity = lastPenaltyInfo?.intensity ?? 'medium';
    if (intensity === 'hardcore') { Vibration.vibrate([0, 300, 100, 300, 100, 600]); }
    else if (intensity === 'medium') { Vibration.vibrate([0, 200, 80, 200]); }
    else { Vibration.vibrate([0, 100]); }

    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, lastPenaltyInfo?.intensity]);

  const info = lastPenaltyInfo;
  const intensity = info?.intensity ?? 'medium';
  const flavor = intensityFlavors[intensity] ?? intensityFlavors.medium;

  const failLine = info
    ? t('penalty.fail_line', { failedCount: info.failedCount, totalCount: info.totalCount })
    : t('penalty.fail_line_default');

  const xpLine = info
    ? t('penalty.xp_line', { xpLost: info.xpLost, goldPart: info.goldLost ? t('penalty.xp_line_gold_part', { goldLost: info.goldLost }) : '' })
    : t('penalty.xp_line_default');

  const intensityLabels: Record<string, string> = {
    light: t('penalty.intensity_light'),
    medium: t('penalty.intensity_medium'),
    hardcore: t('penalty.intensity_hardcore'),
  };

  const flavorTitle = t(`penalty.title_${intensity}`, { defaultValue: t('penalty.title_medium') });

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onDismiss}>
      <Animated.View style={[s.overlay, { opacity: cardOpacity }]}>
        <Animated.View
          style={[
            s.card,
            { borderColor: flavor.color, transform: [{ scale: cardScale }], shadowColor: flavor.color },
          ]}
        >
          {/* ── Top bar RPG ──────────────────────────────────────────────── */}
          <View style={s.topBar}>
            <View style={[s.topLine, { backgroundColor: flavor.color + '55' }]} />
            <Text style={[s.topLabel, { color: flavor.color }]}>{t('penalty.system_label')}</Text>
            <View style={[s.topLine, { backgroundColor: flavor.color + '55' }]} />
          </View>

          <Text style={s.warning}>{flavorTitle}</Text>

          {/* ── Ícone com ring colorido ───────────────────────────────────── */}
          <View style={[s.iconWrap, { backgroundColor: flavor.color + '14', borderColor: flavor.color + '44' }]}>
            <Icon name={flavor.icon} size={44} color={flavor.color} />
          </View>

          <Text style={s.title}>{t('penalty.detected')}</Text>

          <View style={[s.badge, { borderColor: flavor.color, backgroundColor: flavor.color + '15' }]}>
            <Text style={[s.badgeTxt, { color: flavor.color }]}>
              {intensityLabels[intensity] ?? intensity.toUpperCase()}
            </Text>
          </View>

          <Text style={s.message}>
            {failLine}{'\n'}{xpLine}
            {'\n\n'}{t('penalty.escape_message')}
          </Text>

          <Pressable
            style={({ pressed }) => [
              s.btn,
              { borderColor: flavor.color, backgroundColor: pressed ? flavor.color + '22' : C.surface.base },
            ]}
            onPress={onDismiss}
          >
            <Text style={[s.btnTxt, { color: flavor.color }]}>{t('penalty.dismiss_btn')}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
