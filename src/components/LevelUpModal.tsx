import React, { useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Modal, ScrollView,
  Animated, Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme, FONT, SPACING } from '../theme';
import { playSound } from '../utils/audioService';
import { SHOP_CATALOG } from '../data/shopItems';
import { getKeyById } from '../data/dungeonKeys';

interface Props {
  level: number
  items: string[]
  onDismiss: () => void
}

const ITEM_NAMES: Record<string, string> = Object.fromEntries(SHOP_CATALOG.map(i => [i.id, i.name]));

export default function LevelUpModal({ level, items, onDismiss }: Props) {
  const { t } = useTranslation('common');
  const C = useTheme();
  const st = React.useMemo(() => getStyles(C), [C]);

  // ── Entrada do card ────────────────────────────────────────────────────────
  const cardScale   = useRef(new Animated.Value(0.72)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  // ── Pulsação do ícone ──────────────────────────────────────────────────────
  const iconScale = useRef(new Animated.Value(1)).current;

  // ── Brilho da borda (non-native — cor não suporta nativeDriver) ────────────
  const glowOpacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    playSound('levelUp');

    // Entrada: spring no card
    Animated.parallel([
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 90,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    // Ícone: pulsa em loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconScale, { toValue: 1.18, duration: 550, useNativeDriver: true }),
        Animated.timing(iconScale, { toValue: 1.0,  duration: 550, useNativeDriver: true }),
      ])
    ).start();

    // Borda: pulsa opacidade em loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1.0,  duration: 1000, useNativeDriver: false }),
        Animated.timing(glowOpacity, { toValue: 0.35, duration: 1000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const animatedBorderColor = glowOpacity.interpolate({
    inputRange:  [0, 1],
    outputRange: [C.gold + '55', C.gold + 'FF'],
  });

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      {/* Overlay com fade próprio */}
      <Animated.View style={[st.overlay, { opacity: cardOpacity }]}>
        {/* Card com spring de entrada */}
        <Animated.View
          style={[
            st.card,
            {
              transform:   [{ scale: cardScale }],
              borderColor: animatedBorderColor,
              shadowColor: C.gold,
            },
          ]}
        >
          {/* ── Cabeçalho RPG ─────────────────────────────────────────────── */}
          <View style={st.topBar}>
            <View style={st.topLine} />
            <Text style={st.topLabel}>{t('level_up.system_label')}</Text>
            <View style={st.topLine} />
          </View>

          {/* ── Ícone + Título ─────────────────────────────────────────────── */}
          <View style={st.heroSection}>
            <Animated.View style={{ transform: [{ scale: iconScale }] }}>
              <View style={st.iconRing}>
                <Icon name="chevron-double-up" size={52} color={C.gold} />
              </View>
            </Animated.View>

            <Text style={st.title}>{t('level_up.title')}</Text>

            <View style={st.levelBadge}>
              <Text style={st.levelSmall}>{t('level_up.level_label')}</Text>
              <Text style={st.levelNum}>{level}</Text>
            </View>
          </View>

          {/* ── Recompensas ────────────────────────────────────────────────── */}
          {items.length > 0 && (
            <View style={st.rewardsBox}>
              <View style={st.sectionDivider}>
                <View style={st.dividerLine} />
                <Text style={st.dividerLabel}>{t('level_up.rewards_label')}</Text>
                <View style={st.dividerLine} />
              </View>

              <ScrollView
                style={st.itemList}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {items.map((item, idx) => {
                  const keyData = getKeyById(item);
                  const isKey = !!keyData;
                  const iconName = isKey ? 'key-variant' : 'gift-outline';
                  const iconColor = isKey ? (keyData.color ?? C.gold) : C.gold;
                  const shopName = ITEM_NAMES[item];
                  const displayName = shopName
                    ?? t(`items.${item}.name`, { ns: 'shop', defaultValue: keyData?.name ?? item })
                  return (
                    <View key={idx} style={st.itemRow}>
                      <View style={[st.itemIcon, isKey && { backgroundColor: iconColor + '14' }]}>
                        <Icon name={iconName} size={16} color={iconColor} />
                      </View>
                      <Text style={st.itemText}>{displayName}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* ── Botão Continuar ────────────────────────────────────────────── */}
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [
              st.continueBtn,
              pressed && st.continueBtnPressed,
            ]}
          >
            <Icon name="arrow-right-circle-outline" size={18} color={C.bg} />
            <Text style={st.continueTxt}>{t('level_up.continue')}</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '88%',
    backgroundColor: C.panel,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: 'center',
    // iOS glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 24,
    // Android
    elevation: 16,
  },

  // ── Top bar ──────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  topLine: { flex: 1, height: 1, backgroundColor: C.gold + '44' },
  topLabel: {
    color: C.gold,
    fontFamily: FONT.orbitron,
    fontSize: 9,
    letterSpacing: 3,
    opacity: 0.8,
  },

  // ── Hero ─────────────────────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.gold + '14',
    borderWidth: 1,
    borderColor: C.gold + '44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    color: C.gold,
    fontFamily: FONT.orbitron,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 6,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.gold + '15',
    borderWidth: 1,
    borderColor: C.gold + '44',
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  levelSmall: {
    color: C.gold,
    fontFamily: FONT.orbitron,
    fontSize: 9,
    letterSpacing: 2,
    opacity: 0.7,
  },
  levelNum: {
    color: C.gold,
    fontFamily: FONT.orbitron,
    fontSize: 22,
    fontWeight: '900',
  },

  // ── Rewards ──────────────────────────────────────────────────────────────
  rewardsBox: {
    width: '100%',
    marginBottom: SPACING.lg,
    maxHeight: 200,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.border },
  dividerLabel: {
    color: C.muted,
    fontFamily: FONT.orbitron,
    fontSize: 9,
    letterSpacing: 2,
  },
  itemList: { width: '100%' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: SPACING.sm,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: C.gold + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    color: C.text.secondary,
    fontSize: 13,
    flex: 1,
  },

  // ── Continue button ───────────────────────────────────────────────────────
  continueBtn: {
    width: '100%',
    backgroundColor: C.gold,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 48,
  },
  continueBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.97 }],
  },
  continueTxt: {
    color: C.bg,
    fontFamily: FONT.orbitron,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
  },
});
