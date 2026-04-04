import React, { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View, Animated, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../theme';

import { CATALOG_MAP } from '../data/shopItems';
import { ALL_DUNGEON_KEYS } from '../data/dungeonKeys';

interface Props {
  reward: { type: string; title: string; gold: number; xp: number; items: string[] } | null
  onClose: () => void
}

export function LootBoxModal({ reward, onClose }: Props) {
  const C = useTheme();
  const st = React.useMemo(() => getStyles(C), [C]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (reward) {
      setIsVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.8, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setIsVisible(false);
      });
    }
  }, [reward, fadeAnim, scaleAnim]);

  if (!isVisible || !reward) {return null;}

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={st.overlay}>
        <Animated.View style={[st.card, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Icon name="treasure-chest" size={56} color={C.gold} style={st.icon} />

          <Text style={st.title}>{reward.title}</Text>
          <Text style={st.subTitle}>RECOMPENSAS ABERTAS</Text>

          <View style={st.rewardsContainer}>
            {reward.gold > 0 && (
              <View style={st.rewardRow}>
                <Icon name="gold" size={24} color={C.gold} />
                <Text style={st.rewardText}>+{reward.gold} Gold</Text>
              </View>
            )}
            {reward.xp > 0 && (
              <View style={st.rewardRow}>
                <Icon name="star-four-points-outline" size={24} color={C.neonBlue} />
                <Text style={st.rewardText}>+{reward.xp} XP</Text>
              </View>
            )}

            {reward.items && reward.items.length > 0 && (
              <View style={st.itemsContainer}>
                <Text style={st.itemsTitle}>ITENS ADQUIRIDOS:</Text>
                {reward.items.map((itemId, i) => {
                  const item = CATALOG_MAP[itemId];
                  const key = !item ? ALL_DUNGEON_KEYS.find(k => k.id === itemId) : null;
                  const displayName = item?.name ?? key?.name ?? itemId;
                  const displayIcon = item?.icon ?? (key ? 'key-variant' : 'help-box');
                  const displayColor = item?.color ?? key?.color ?? C.purple;
                  return (
                    <View key={`${itemId}-${i}`} style={st.itemRow}>
                      <Icon name={displayIcon} size={20} color={displayColor} />
                      <Text style={[st.itemText, key && { color: displayColor }]}>{displayName}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <TouchableOpacity style={st.confirmButton} onPress={onClose}>
            <Text style={st.confirmText}>ACEITAR</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const getStyles = (C: any) => StyleSheet.create({

  overlay: {
    flex: 1,
    backgroundColor: C.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: C.surface.elevated,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: C.gold,
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    color: C.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  subTitle: {
    color: C.text.secondary,
    fontSize: 14,
    marginBottom: 24,
    letterSpacing: 2,
  },
  rewardsContainer: {
    width: '100%',
    backgroundColor: C.surface.base,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardText: {
    color: C.text.primary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  itemsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
  },
  itemsTitle: {
    color: C.text.secondary,
    fontSize: 12,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: C.surface.elevated,
    padding: 8,
    borderRadius: 6,
  },
  itemText: {
    color: C.text.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  confirmButton: {
    backgroundColor: C.gold,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  confirmText: {
    color: C.text.inverse,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
