import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Shadow, ShadowRank, SHADOW_RANK_COLOR } from '../data/shadows_types';
import { SHADOWS_SHOP } from '../data/shadows_shop';
import { FONT, SPACING } from '../theme';
import SoloLevelingModal from './SoloLevelingModal';

interface ShadowShopModalProps {
  visible: boolean
  onClose: () => void
  playerGold: number
  ownedShadowIds: string[]
  onBuy: (shadow: Shadow) => void
  C: any
}

const RANKS: ShadowRank[] = ['Normal', 'Elite', 'Knight', 'Commander', 'Marshal'];

export default function ShadowShopModal({ visible, onClose, playerGold, ownedShadowIds, onBuy, C }: ShadowShopModalProps) {
  const [selectedRank, setSelectedRank] = useState<ShadowRank>('Normal');
  const s = getStyles(C);

  const filteredShadows = SHADOWS_SHOP.filter(sh => sh.rank === selectedRank);

  return (
    <SoloLevelingModal
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={s.container}>
        <View style={s.header}>
           <Text style={s.title}>RECRUTAMENTO DE SOMBRAS</Text>
           <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={C.dimmed} />
           </TouchableOpacity>
        </View>
        {/* Tabs */}
        <View style={s.tabBar}>
          {RANKS.map(rank => {
            const active = selectedRank === rank;
            const color = SHADOW_RANK_COLOR[rank];
            return (
              <TouchableOpacity
                key={rank}
                onPress={() => setSelectedRank(rank)}
                style={[s.tab, active && { borderBottomColor: color, backgroundColor: color + '11' }]}
              >
                <Text style={[s.tabText, { color: active ? color : C.dimmed }]}>
                  {rank.toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
          {filteredShadows.length === 0 ? (
            <View style={s.empty}>
              <Icon name="ghost-off" size={32} color={C.dimmed} />
              <Text style={s.emptyText}>Nenhuma sombra deste rank disponível na loja.</Text>
            </View>
          ) : (
            filteredShadows.map(sh => {
              const owned = ownedShadowIds.includes(sh.id);
              const color = SHADOW_RANK_COLOR[sh.rank];
              const price = (sh.unlockMethod as any).price || 0;
              const canAfford = playerGold >= price;

              return (
                <View key={sh.id} style={[s.card, { borderColor: color + '44' }]}>
                  <View style={[s.iconWrap, { backgroundColor: color + '18' }]}>
                    <Icon name={sh.icon} size={24} color={color} />
                  </View>

                  <View style={s.info}>
                    <Text style={[s.name, { color }]}>{sh.name}</Text>
                    <Text style={s.type}>{sh.type} • {sh.passiveEffect.description}</Text>
                    {owned && <Text style={s.ownedBadge}>ADQUIRIDO</Text>}
                  </View>

                  <View style={s.buyCol}>
                    <View style={s.priceRow}>
                      <Icon name="rhombus" size={12} color={C.gold} />
                      <Text style={s.priceText}>{price}</Text>
                    </View>
                    <TouchableOpacity
                      disabled={!canAfford}
                      onPress={() => onBuy(sh)}
                      activeOpacity={canAfford ? 0.6 : 1}
                      style={[s.buyBtn, { borderColor: color }, !canAfford && { opacity: 0.3 }]}
                    >
                      <Text style={[s.buyBtnText, { color }]}>
                        {owned ? 'UPGRADE' : 'RECRUTAR'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    </SoloLevelingModal>
  );
}

const getStyles = (C: any) => StyleSheet.create({
  container: { height: Dimensions.get('window').height * 0.7, width: '90%', backgroundColor: C.bg, borderRadius: 20, borderWidth: 1, borderColor: C.panel, padding: SPACING.md, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  title: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: C.panel, marginBottom: SPACING.md },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xl },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 40, opacity: 0.5 },
  emptyText: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 10, marginTop: 12, textAlign: 'center' },
  card: { flexDirection: 'row', backgroundColor: C.panel, borderRadius: 12, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, alignItems: 'center', gap: SPACING.sm },
  iconWrap: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  type: { color: C.muted, fontSize: 11, lineHeight: 15 },
  ownedBadge: { color: C.green, fontFamily: FONT.orbitron, fontSize: 9, marginTop: 4, letterSpacing: 1 },
  buyCol: { alignItems: 'flex-end', gap: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceText: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '700' },
  buyBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  buyBtnText: { fontFamily: FONT.orbitron, fontSize: 9, fontWeight: '700' },
});
