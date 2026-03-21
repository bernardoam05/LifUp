import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore from '../store/useGameStore'
import { SHOP_CATALOG, ShopItem } from '../data/shopItems'
import CustomModal from '../components/CustomModal'
import { C, FONT, SPACING } from '../theme'

// ── Item card ──────────────────────────────────────────────────────────────────

function ItemCard({ item, gold, onBuy }: { item: ShopItem; gold: number; onBuy: () => void }) {
  const canAfford = gold >= item.cost

  return (
    <View style={[ic.card, { borderColor: item.color + '44' }]}>
      {/* Icon */}
      <View style={[ic.iconWrap, { backgroundColor: item.color + '18' }]}>
        <Icon name={item.icon} size={28} color={item.color} />
      </View>

      {/* Info */}
      <View style={ic.info}>
        <Text style={[ic.name, { color: item.color }]}>{item.name}</Text>
        <Text style={ic.desc}>{item.description}</Text>
        <Text style={ic.lore}>{item.lore}</Text>
      </View>

      {/* Buy */}
      <View style={ic.buyCol}>
        <View style={ic.costRow}>
          <Icon name="rhombus" size={12} color={C.gold} />
          <Text style={ic.cost}> {item.cost}</Text>
        </View>
        <TouchableOpacity
          style={[ic.buyBtn, { borderColor: item.color }, !canAfford && ic.buyBtnDisabled]}
          onPress={onBuy}
          disabled={!canAfford}
        >
          <Text style={[ic.buyTxt, { color: canAfford ? item.color : C.dimmed }]}>
            {canAfford ? 'COMPRAR' : 'SEM GOLD'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function ShopScreen() {
  const player      = useGameStore(s => s.player)
  const purchaseItem = useGameStore(s => s.purchaseItem)

  const [pending,    setPending]    = useState<ShopItem | null>(null)
  const [lastBought, setLastBought] = useState<string | null>(null)

  function confirmBuy() {
    if (!pending) return
    const ok = purchaseItem(pending.id, pending.cost)
    if (ok) setLastBought(pending.id)
    setPending(null)
  }

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        {/* Header */}
        <View style={s.titleRow}>
          <Icon name="shopping-outline" size={16} color={C.neonBlue} />
          <Text style={s.title}> LOJA DO SISTEMA</Text>
        </View>
        <Text style={s.subtitle}>Gasta ouro para potenciar a tua jornada, Hunter.</Text>

        {/* Gold balance */}
        <View style={s.goldBar}>
          <Icon name="rhombus" size={18} color={C.gold} />
          <Text style={s.goldTxt}> {player.gold.toLocaleString()} Gold disponível</Text>
        </View>

        {/* Success banner */}
        {lastBought && (
          <View style={s.successBanner}>
            <Icon name="check-circle" size={14} color={C.green} />
            <Text style={s.successTxt}> Item adicionado ao inventário!</Text>
            <TouchableOpacity onPress={() => setLastBought(null)}>
              <Icon name="close" size={14} color={C.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Items */}
        {SHOP_CATALOG.map(item => (
          <ItemCard
            key={item.id}
            item={item}
            gold={player.gold}
            onBuy={() => setPending(item)}
          />
        ))}

      </ScrollView>

      {/* Confirm modal */}
      <CustomModal
        visible={!!pending}
        title="CONFIRMAR COMPRA"
        message={
          pending
            ? `Comprar "${pending.name}" por ${pending.cost} Gold?\n\n${pending.description}`
            : ''
        }
        confirmLabel="COMPRAR"
        confirmIcon="cart-check"
        confirmColor={pending?.color ?? C.gold}
        onConfirm={confirmBuy}
        onCancel={() => setPending(null)}
      />
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: C.bg },
  content:       { padding: SPACING.md, paddingBottom: SPACING.xl },
  titleRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title:         { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },
  subtitle:      { color: C.muted, fontSize: 11, marginBottom: SPACING.md },
  goldBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 10, borderWidth: 1, borderColor: C.gold + '44', padding: SPACING.sm, marginBottom: SPACING.md },
  goldTxt:       { color: C.gold, fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '700' },
  successBanner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#0d2a1a', borderWidth: 1, borderColor: C.green + '44', borderRadius: 8, padding: SPACING.sm, marginBottom: SPACING.md },
  successTxt:    { flex: 1, color: C.green, fontSize: 12 },
})

const ic = StyleSheet.create({
  card:     { flexDirection: 'row', backgroundColor: C.panel, borderRadius: 12, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm, alignItems: 'flex-start' },
  iconWrap: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info:     { flex: 1 },
  name:     { fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '700', marginBottom: 3 },
  desc:     { color: '#94a3b8', fontSize: 12, lineHeight: 17, marginBottom: 3 },
  lore:     { color: C.dimmed, fontSize: 10, fontStyle: 'italic', lineHeight: 15 },
  buyCol:   { alignItems: 'flex-end', gap: SPACING.sm, flexShrink: 0 },
  costRow:  { flexDirection: 'row', alignItems: 'center' },
  cost:     { color: C.gold, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '900' },
  buyBtn:   { borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 6 },
  buyBtnDisabled: { opacity: 0.4 },
  buyTxt:   { fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
})
