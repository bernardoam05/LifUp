import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SoloLevelingModal from './SoloLevelingModal';
import { FONT, SPACING } from '../theme';
import { playSound } from '../utils/audioService';
import { CATALOG_MAP } from '../data/shopItems';

export const getBVStyles = (C: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.bg + 'cc', justifyContent: 'flex-end' },
  card: { backgroundColor: C.panel, borderRadius: 24, padding: SPACING.xl, paddingBottom: 40, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: C.gold + '66' },
  header: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 22, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.sm },
  sub: { color: C.muted, fontSize: 12, textAlign: 'center', marginBottom: SPACING.lg },
  rewardsBox: { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, width: '100%', gap: SPACING.sm, marginBottom: SPACING.md },
  rewardRow: { flexDirection: 'row', alignItems: 'center' },
  rewardTxt: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 14, fontWeight: '700' },
  shadowHint: { color: C.dimmed, fontSize: 10, fontStyle: 'italic', textAlign: 'center', marginBottom: SPACING.md },
  lootHeader: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 3, textAlign: 'center', marginBottom: SPACING.sm },
  lootBox: { backgroundColor: C.bg, borderRadius: 6, borderWidth: 1, borderColor: C.border, padding: SPACING.sm, width: '100%', gap: 6, marginBottom: SPACING.md },
  lootRow: { flexDirection: 'row', alignItems: 'center' },
  lootTxt: { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  btn: { backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold, borderRadius: 4, paddingVertical: 14, paddingHorizontal: SPACING.xl },
  btnTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2 },
});

interface BossVictoryModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestClose?: () => void;
  info: {
    xp: number;
    gold: number;
    shadowName?: string;
    leveledUpShadow?: boolean;
    droppedItems?: string[];
  };
  C: any;
}

export default function BossVictoryModal({
  visible,
  onClose,
  onRequestClose,
  info,
  C
}: BossVictoryModalProps) {
  const bv = getBVStyles(C);

  useEffect(() => {
    if (visible) {
      playSound('victory');
    }
  }, [visible]);

  return (
    <SoloLevelingModal transparent visible={visible} onRequestClose={onRequestClose}>
      <View style={bv.card}>
        <Icon name="sword" size={48} color={C.gold} style={{ marginBottom: SPACING.sm }} />
        <Text style={bv.header}>BOSS DERROTADO!</Text>
        <Text style={bv.sub}>O dungeon foi limpo. O Sistema reconhece a tua força.</Text>

        <View style={bv.rewardsBox}>
          <View style={bv.rewardRow}>
            <Icon name="star-four-points" size={16} color={C.neonBlue} />
            <Text style={bv.rewardTxt}> +{info.xp} XP</Text>
          </View>
          <View style={bv.rewardRow}>
            <Icon name="rhombus" size={16} color={C.gold} />
            <Text style={bv.rewardTxt}> +{info.gold} Gold</Text>
          </View>
          {info.shadowName && (
            <View style={[bv.rewardRow, { marginTop: SPACING.sm }]}>
              <Icon name="ghost" size={16} color={C.purple} />
              <Text style={[bv.rewardTxt, { color: C.purple }]}>
                {info.leveledUpShadow
                  ? ` ${info.shadowName} subiu de nível!`
                  : ` Sombra obtida: ${info.shadowName}`}
              </Text>
            </View>
          )}
        </View>

        {info.droppedItems && info.droppedItems.length > 0 && (
          <>
            <Text style={bv.lootHeader}>— LOOT —</Text>
            <View style={bv.lootBox}>
              {info.droppedItems.map((itemId, idx) => {
                const itm = CATALOG_MAP[itemId]
                if (!itm) return null
                return (
                  <View key={`${itemId}-${idx}`} style={bv.lootRow}>
                    <Icon name={itm.icon} size={14} color={itm.color} />
                    <Text style={[bv.lootTxt, { color: itm.color }]}> {itm.name}</Text>
                  </View>
                )
              })}
            </View>
          </>
        )}

        {!info.shadowName && (
          <Text style={bv.shadowHint}>Atinge o nível 10 para receber Sombras de boss raids.</Text>
        )}

        <TouchableOpacity style={bv.btn} onPress={onClose}>
          <Text style={bv.btnTxt}>CONTINUAR</Text>
        </TouchableOpacity>
      </View>
    </SoloLevelingModal>
  );
}
