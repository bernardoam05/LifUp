import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { FONT, SPACING } from '../theme';
import { SHADOW_DATABASE, getBossDropPreview } from '../data/shadows';
import useGameStore from '../store/useGameStore';
import { computeActivePassives } from '../store/helpers';

type Props = {
  visible: boolean
  shadowId: string
  category: 'dungeon' | 'dungeon_break' | 'event' | 'key' | 'raid'
  onClose: (success: boolean) => void
  C: any
}

export default function ShadowExtractionModal({ visible, shadowId, category, onClose, C }: Props) {
  const s = React.useMemo(() => getStyles(C), [C]);
  const { player, customShadows, activeBuffs } = useGameStore();
  const playerLevel = player?.level || 1;
  const playerRank = player?.rank || 'E';

  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState<'idle' | 'extracting' | 'success' | 'failed'>('idle');
  const [shakeAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [pulseAnim] = useState(new Animated.Value(1));

  const maxAttempts = category === 'event' ? 1 : 3;
  const shadow = (() => {
    const byId = SHADOW_DATABASE.find(sh => sh.id === shadowId);
    if (byId) {return byId;}
    const byBoss = getBossDropPreview(shadowId);
    if (byBoss) {return byBoss;}
    return SHADOW_DATABASE.find(sh => sh.id === 'crimson_knight')!;
  })();

  useEffect(() => {
    if (visible) {
      setAttempts(0);
      setStatus('idle');
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
  }, [visible, fadeAnim]);

  useEffect(() => {
    if (status === 'extracting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status, pulseAnim]);

  const handleArise = () => {
    if (status !== 'idle' && status !== 'failed') {return;}
    if (attempts >= maxAttempts) {return;}

    setStatus('extracting');

    setTimeout(() => {
      const nextAttempt = attempts + 1;
      setAttempts(nextAttempt);

      const RANK_CHANCES: Record<string, number> = {
        Normal: 0.70, Elite: 0.50, Knight: 0.30, Commander: 0.15, Marshal: 0.05,
      };
      const BaseRankChance = RANK_CHANCES[shadow.rank] || 0.10;
      const levelBonus = playerLevel * 0.0025;
      const RANK_VALUES: Record<string, number> = { E: 0, D: 1, C: 2, B: 3, A: 4, S: 5, National: 6 };
      const jobBonus = (RANK_VALUES[playerRank] || 0) * 0.02;
      const categoryBonus = (category === 'key' || category === 'raid') ? 0.20 : 0;

      const { ariseBoost } = computeActivePassives(player.activeShadowIds, player.shadows, customShadows, activeBuffs);

      let successChance = BaseRankChance + levelBonus + jobBonus + categoryBonus + ariseBoost;
      if (category === 'event') {successChance = 1.0;}

      const isSuccess = Math.random() < successChance;

      if (isSuccess) {
        setStatus('success');
      } else {
        if (nextAttempt >= maxAttempts) {
          setStatus('failed');
        } else {
          setStatus('idle');
          triggerShake();
        }
      }
    }, 1500);
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  if (!visible) {return null;}

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={s.overlay}>
        <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] }]}>

          <Text style={s.header}>EXTRAÇÃO DE SOMBRA</Text>

          <View style={[s.shadowPreview, { borderColor: shadow.color + '44' }]}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Icon name={shadow.icon} size={80} color={status === 'success' ? shadow.color : C.dimmed} />
            </Animated.View>
          </View>

          <Text
            style={[s.shadowName, { color: status === 'success' ? shadow.color : C.muted }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {status === 'success' ? shadow.name : '???'}
          </Text>
          <Text style={s.rankLabel}>RANK {shadow.rank.toUpperCase()}</Text>

          <View style={s.attemptsRow}>
            {[...Array(maxAttempts)].map((_, i) => (
              <View
                key={i}
                style={[
                  s.attemptDot,
                  { backgroundColor: (i + 1) <= attempts ? (status === 'success' && (i + 1) === attempts ? C.neonBlue : C.neonRed) : C.border },
                ]}
              />
            ))}
            <Text style={s.attemptsTxt}>{attempts}/{maxAttempts} TENTATIVAS</Text>
          </View>

          <Text style={s.message}>
            {status === 'idle' && 'A alma do boss resiste. Deseja tentar a extração?'}
            {status === 'extracting' && 'A extrair... O Sistema está a processar a tua vontade.'}
            {status === 'success' && 'SUCESSO! A sombra foi adicionada ao teu exército.'}
            {status === 'failed' && 'FALHA. A alma dissipou-se no vazio.'}
          </Text>

          <View style={s.btnContainer}>
            {(status === 'idle' || status === 'extracting') && (
              <TouchableOpacity
                style={[s.ariseBtn, status === 'extracting' && { opacity: 0.6 }]}
                onPress={handleArise}
                disabled={status === 'extracting'}
              >
                <Text style={s.ariseBtnTxt}>{status === 'extracting' ? 'A PROCESSAR...' : 'SURJA (ARISE)'}</Text>
              </TouchableOpacity>
            )}

            {(status === 'success' || status === 'failed') && (
              <TouchableOpacity
                style={[s.closeBtn, { borderColor: status === 'success' ? C.neonBlue : C.border }]}
                onPress={() => onClose(status === 'success')}
              >
                <Text style={[s.closeBtnTxt, { color: status === 'success' ? C.text.primary : C.text.secondary }]}>
                  {status === 'success' ? 'ACEITAR' : 'FECHAR'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.surface.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    backgroundColor: C.surface.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.neonBlue + '44',
    padding: SPACING.xl,
    alignItems: 'center',
  },
  header: {
    fontFamily: FONT.orbitron,
    fontSize: 14,
    color: C.text.primary,
    letterSpacing: 2,
    marginBottom: SPACING.xl,
  },
  shadowPreview: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface.base,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  shadowName: {
    fontFamily: FONT.orbitron,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  rankLabel: {
    fontSize: 10,
    color: C.text.secondary,
    marginTop: 2,
    letterSpacing: 1,
  },
  attemptsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.xl,
  },
  attemptDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  attemptsTxt: {
    fontSize: 12,
    color: C.text.secondary,
    marginLeft: 4,
  },
  message: {
    fontSize: 14,
    color: C.text.primary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
    minHeight: 44,
  },
  btnContainer: {
    width: '100%',
  },
  ariseBtn: {
    backgroundColor: C.state.successBg,
    borderWidth: 1,
    borderColor: C.neonBlue,
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
  },
  ariseBtnTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 14,
    color: C.text.primary,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  closeBtn: {
    borderWidth: 1,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  closeBtnTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 12,
    letterSpacing: 1,
  },
});
