import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { Vibration } from 'react-native'
import useGameStore from '../store/useGameStore'
import { CATALOG_MAP } from '../data/shopItems'
import CustomModal from '../components/CustomModal'
import { C, FONT, SPACING } from '../theme'

// ── Quest picker modal (for System Pass) ──────────────────────────────────────

function QuestPickerModal({ onPick, onCancel }: {
  onPick: (questId: string) => void
  onCancel: () => void
}) {
  const quests = useGameStore(s => s.quests).filter(q => !q.done)

  return (
    <Modal transparent animationType="fade">
      <View style={qp.overlay}>
        <View style={qp.card}>
          <Icon name="ticket-confirmation-outline" size={28} color={C.gold} style={{ marginBottom: 8 }} />
          <Text style={qp.title}>ESCOLHE A MISSÃO</Text>
          <Text style={qp.sub}>O Passe do Sistema completará esta missão automaticamente.</Text>

          {quests.length === 0 ? (
            <Text style={qp.empty}>Todas as missões já estão concluídas!</Text>
          ) : (
            <FlatList
              data={quests}
              keyExtractor={q => q.id}
              style={{ width: '100%', maxHeight: 280 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={qp.questRow} onPress={() => onPick(item.id)}>
                  <View style={qp.questInfo}>
                    <Text style={qp.questLabel}>{item.label}</Text>
                    <Text style={qp.questDetail} numberOfLines={1}>{item.detail}</Text>
                  </View>
                  <View style={qp.questReward}>
                    <Icon name="star-four-points" size={10} color={C.neonBlue} />
                    <Text style={qp.rewardTxt}> {item.xp} XP</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}

          <TouchableOpacity style={qp.cancelBtn} onPress={onCancel}>
            <Icon name="close-circle-outline" size={14} color={C.muted} />
            <Text style={qp.cancelTxt}> CANCELAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ── Inventory item card ────────────────────────────────────────────────────────

function InventoryCard({ itemId, quantity }: { itemId: string; quantity: number }) {
  const item       = CATALOG_MAP[itemId]
  const useItem    = useGameStore(s => s.useInventoryItem)
  const addXP      = useGameStore(s => s.addXP)
  const skipQuest  = useGameStore(s => s.skipQuest)
  const setPenRed  = useGameStore(s => s.setPenaltyReduced)

  const [confirmUse, setConfirmUse] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [feedback,   setFeedback]   = useState<string | null>(null)

  if (!item) return null

  function handleUse() {
    if (item.effect === 'skip_quest') {
      setShowPicker(true)
    } else {
      setConfirmUse(true)
    }
  }

  function applyEffect() {
    useItem(itemId)
    Vibration.vibrate([0, 80, 40, 120])

    switch (item.effect) {
      case 'add_xp':
        const { leveledUp } = addXP(item.effectValue ?? 50)
        setFeedback(leveledUp
          ? `+${item.effectValue} XP — LEVEL UP!`
          : `+${item.effectValue} XP absorvido!`
        )
        break
      case 'reduce_penalty':
        setPenRed(true)
        setFeedback('Pergaminho ativado! Penalização de amanhã reduzida em 50%.')
        break
      default:
        setFeedback('Item utilizado com sucesso!')
    }
    setConfirmUse(false)
    setTimeout(() => setFeedback(null), 3000)
  }

  function handleSkip(questId: string) {
    skipQuest(questId)
    useItem(itemId)
    Vibration.vibrate([0, 80, 40, 120])
    setShowPicker(false)
    setFeedback('Missão completada pelo Sistema!')
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <View style={[ic.card, { borderColor: item.color + '44' }]}>
      <View style={[ic.iconWrap, { backgroundColor: item.color + '18' }]}>
        <Icon name={item.icon} size={26} color={item.color} />
        <View style={ic.badge}>
          <Text style={ic.badgeTxt}>{quantity}</Text>
        </View>
      </View>

      <View style={ic.info}>
        <Text style={[ic.name, { color: item.color }]}>{item.name}</Text>
        <Text style={ic.desc}>{item.description}</Text>
        {feedback && (
          <Text style={[ic.feedback, { color: item.color }]}>{feedback}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[ic.useBtn, { borderColor: item.color }]}
        onPress={handleUse}
        disabled={quantity === 0}
      >
        <Icon name="play-circle-outline" size={14} color={item.color} />
        <Text style={[ic.useTxt, { color: item.color }]}> USAR</Text>
      </TouchableOpacity>

      {/* Confirm use */}
      <CustomModal
        visible={confirmUse}
        title="USAR ITEM"
        message={`Usar "${item.name}"?\n\n${item.description}`}
        confirmLabel="USAR"
        confirmIcon="play-circle-outline"
        confirmColor={item.color}
        onConfirm={applyEffect}
        onCancel={() => setConfirmUse(false)}
      />

      {/* Quest picker for System Pass */}
      {showPicker && (
        <QuestPickerModal
          onPick={handleSkip}
          onCancel={() => setShowPicker(false)}
        />
      )}
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const inventory = useGameStore(s => s.player.inventory)
  const gold      = useGameStore(s => s.player.gold)

  const total = inventory.reduce((sum, e) => sum + e.quantity, 0)

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        <View style={s.titleRow}>
          <Icon name="bag-personal" size={16} color={C.neonBlue} />
          <Text style={s.title}> INVENTÁRIO</Text>
        </View>

        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Icon name="cube-outline" size={12} color={C.muted} />
            <Text style={s.statTxt}> {total} itens</Text>
          </View>
          <View style={s.statChip}>
            <Icon name="rhombus" size={12} color={C.gold} />
            <Text style={[s.statTxt, { color: C.gold }]}> {gold.toLocaleString()} Gold</Text>
          </View>
        </View>

        {inventory.length === 0 ? (
          <View style={s.emptyWrap}>
            <Icon name="bag-personal-outline" size={48} color={C.dimmed} />
            <Text style={s.emptyTitle}>INVENTÁRIO VAZIO</Text>
            <Text style={s.emptyDesc}>Visita a Loja do Sistema para adquirir itens.</Text>
          </View>
        ) : (
          inventory.map(entry => (
            <InventoryCard key={entry.itemId} itemId={entry.itemId} quantity={entry.quantity} />
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: C.bg },
  content:    { padding: SPACING.md, paddingBottom: SPACING.xl },
  titleRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  title:      { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },
  statsRow:   { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  statChip:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 6, borderWidth: 1, borderColor: C.border },
  statTxt:    { color: C.muted, fontSize: 11, fontFamily: FONT.orbitron },
  emptyWrap:  { alignItems: 'center', paddingTop: 60, gap: SPACING.md },
  emptyTitle: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2 },
  emptyDesc:  { color: C.dimmed, fontSize: 12, textAlign: 'center' },
})

const ic = StyleSheet.create({
  card:     { flexDirection: 'row', backgroundColor: C.panel, borderRadius: 12, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm, alignItems: 'center' },
  iconWrap: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 },
  badge:    { position: 'absolute', top: -4, right: -4, backgroundColor: C.neonBlue, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeTxt: { color: '#000', fontSize: 9, fontWeight: '900' },
  info:     { flex: 1 },
  name:     { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  desc:     { color: C.muted, fontSize: 11, lineHeight: 16 },
  feedback: { fontSize: 11, marginTop: 4, fontFamily: FONT.orbitron, letterSpacing: 1 },
  useBtn:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 8, flexShrink: 0 },
  useTxt:   { fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
})

const qp = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: '#000d', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  card:       { backgroundColor: C.panel, borderRadius: 16, padding: SPACING.lg, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: C.gold + '55' },
  title:      { color: C.gold, fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2, marginBottom: 4 },
  sub:        { color: C.muted, fontSize: 12, textAlign: 'center', marginBottom: SPACING.md },
  empty:      { color: C.dimmed, fontSize: 12, fontStyle: 'italic', marginBottom: SPACING.md },
  questRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 8, padding: SPACING.sm, marginBottom: 6, borderWidth: 1, borderColor: C.border, width: '100%' },
  questInfo:  { flex: 1 },
  questLabel: { color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  questDetail:{ color: C.muted, fontSize: 10, marginTop: 2 },
  questReward:{ flexDirection: 'row', alignItems: 'center' },
  rewardTxt:  { color: C.neonBlue, fontSize: 10, fontWeight: '700' },
  cancelBtn:  { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md, borderWidth: 1, borderColor: C.dimmed, borderRadius: 8, paddingHorizontal: SPACING.md, paddingVertical: 10 },
  cancelTxt:  { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
})
