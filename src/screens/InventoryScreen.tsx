import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { Vibration } from 'react-native'
import useGameStore from '../store/useGameStore'
import { CATALOG_MAP } from '../data/shopItems'
import { ALL_DUNGEON_KEYS } from '../data/dungeonKeys'
import CustomModal from '../components/CustomModal'
import { useTheme, FONT, SPACING } from '../theme'


// ── Quest picker modal (for System Pass) ──────────────────────────────────────

function QuestPickerModal({ onPick, onCancel, C }: {
  onPick: (questId: string) => void
  onCancel: () => void
  C: any
}) {
  const qp = getQPStyles(C)

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

function InventoryCard({ itemId, quantity, C }: { itemId: string; quantity: number; C: any }) {
  const ic = getICStyles(C)

  const item            = CATALOG_MAP[itemId]
  const useItem         = useGameStore(s => s.useInventoryItem)
  const addXP           = useGameStore(s => s.addXP)
  const skipQuest       = useGameStore(s => s.skipQuest)
  const setPenRed       = useGameStore(s => s.setPenaltyReduced)
  const removePenalty   = useGameStore(s => s.removePenalty)
  const setXpBoostNext  = useGameStore(s => s.setXpBoostNext)
  const setHardcoreMode = useGameStore(s => s.setHardcoreFocusMode)
  const focusActive     = useGameStore(s => s.system.focusModeActive)
  const hardcoreActive  = useGameStore(s => s.system.hardcoreFocusMode)
  const triggerEvent    = useGameStore(s => s.triggerEvent)
  const openLootBox     = useGameStore(s => s.openLootBox)

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
      case 'add_xp': {
        const { leveledUp } = addXP(item.effectValue ?? 50)
        setFeedback(leveledUp
          ? `+${item.effectValue} XP — LEVEL UP!`
          : `+${item.effectValue} XP absorvido!`
        )
        break
      }
      case 'reduce_penalty':
        setPenRed(true)
        setFeedback('Pergaminho ativado! Penalização de amanhã reduzida em 50%.')
        break
      case 'remove_penalty':
        triggerEvent('lagrima_used_during_penalty')
        removePenalty()
        setFeedback('Penalização removida! O Sistema purificou o teu registo.')
        break
      case 'xp_boost_next':
        setXpBoostNext(true)
        setFeedback('Ampulheta ativada! Próxima missão com XP dobrado.')
        break
      case 'open_loot_box': {
        const res = openLootBox()
        setFeedback(`${res.reward}: ${res.detail}`)
        break
      }
      case 'break_hardcore':
        if (!hardcoreActive) {
          setFeedback('Nenhum Modo Hardcore ativo para quebrar.')
        } else {
          setHardcoreMode(false)
          setFeedback('Juramento quebrado! Podes parar o Focus Mode livremente.')
        }
        break
      case 'material':
        useItem(itemId)
        if (itemId === 'shadow_essence') {
          setFeedback('O Sistema cedeu! Extração resetada para hoje.')
        } else {
          setFeedback('Consumível ativado! Verifica os teus Status.')
        }
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

  // Warn if break_hardcore used when no hardcore mode active
  const isBreakHardcore = item.effect === 'break_hardcore'
  const breakHardcoreDisabled = isBreakHardcore && !hardcoreActive

  return (
    <View style={[ic.card, { borderColor: item.color + '44' }]}>
      <View style={[ic.iconWrap, { backgroundColor: item.color + '12', borderColor: item.color + '44' }]}>
        <Icon name={item.icon} size={28} color={item.color} />
        <View style={[ic.badge, { backgroundColor: item.color }]}>
          <Text style={ic.badgeTxt}>{quantity}</Text>
        </View>
      </View>

      <View style={ic.info}>
        <Text style={[ic.name, { color: item.color }]}>{item.name.toUpperCase()}</Text>
        <Text style={ic.desc} numberOfLines={2}>{item.description}</Text>
        {feedback && (
          <Text style={[ic.feedback, { color: item.color }]}>{feedback}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[ic.useBtn, { borderColor: item.color + '66', backgroundColor: item.color + '10' }, breakHardcoreDisabled && ic.useBtnDisabled]}
        onPress={handleUse}
        disabled={quantity === 0 || breakHardcoreDisabled}
      >
        <Text style={[ic.useTxt, { color: breakHardcoreDisabled ? C.dimmed : item.color }]}>USAR</Text>
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
        C={C}
      />


      {/* Quest picker for System Pass */}
      {showPicker && (
        <QuestPickerModal
          onPick={handleSkip}
          onCancel={() => setShowPicker(false)}
          C={C}
        />

      )}
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const C = useTheme()
  const s = React.useMemo(() => getStyles(C), [C])
  const sk = React.useMemo(() => getSKStyles(C), [C])
  const inventory = useGameStore(s => s.player.inventory)
  const dungeonKeys = useGameStore(s => s.player.dungeonKeys)

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

        {/* Vault Section */}
        <View style={s.sectionHeader}>
          <Icon name="safe" size={14} color={C.neonBlue} />
          <Text style={s.sectionTitle}> COFRE DE CHAVES</Text>
        </View>
        {dungeonKeys && dungeonKeys.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sk.keyGrid}>
            {dungeonKeys.map((keyId, idx) => {
              const key = ALL_DUNGEON_KEYS.find(k => k.id === keyId)
              if (!key) return null
              return (
                <View key={idx} style={[sk.keyCard, { borderColor: key.color + '44' }]}>
                  <View style={[sk.keyIconWrap, { backgroundColor: key.color + '12', borderColor: key.color + '44' }]}>
                    <Icon name="key-variant" size={20} color={key.color} />
                  </View>
                  <View style={sk.keyInfo}>
                    <Text style={[sk.keyName, { color: key.color }]} numberOfLines={1}>{key.name.toUpperCase()}</Text>
                    <Text style={sk.keyBoss} numberOfLines={1}>ALVO: {key.bossId.replace(/_/g, ' ')}</Text>
                  </View>
                </View>
              )
            })}
          </ScrollView>
        ) : (
          <View style={sk.emptyKeys}>
            <Text style={sk.emptyKeysTxt}>Nenhuma Chave obtida</Text>
            <Text style={sk.emptyKeysSub}>Sobe de nível ou abre Cofres para encontrar chaves de masmorra.</Text>
          </View>
        )}

        <View style={[s.sectionHeader, { marginTop: SPACING.lg }]}>
          <Icon name="bag-personal-outline" size={14} color={C.neonBlue} />
          <Text style={s.sectionTitle}> ITENS</Text>
        </View>

        {inventory.length === 0 ? (
          <View style={s.emptyWrap}>
            <Icon name="bag-personal-outline" size={48} color={C.dimmed} />
            <Text style={s.emptyTitle}>INVENTÁRIO VAZIO</Text>
            <Text style={s.emptyDesc}>Visita a Loja do Sistema para adquirir itens.</Text>
          </View>
        ) : (
          inventory.map(entry => (
            <InventoryCard key={entry.itemId} itemId={entry.itemId} quantity={entry.quantity} C={C} />
          ))
        )}


      </ScrollView>
    </SafeAreaView>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  sectionTitle:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2, fontWeight: '700' },
})

const getSKStyles = (C: any) => StyleSheet.create({
  keyGrid: { gap: SPACING.md, paddingRight: SPACING.md },
  keyCard: { 
    flexDirection: 'row', 
    width: 200, 
    height: 70, 
    backgroundColor: C.panel, 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: SPACING.sm, 
    alignItems: 'center', 
    gap: SPACING.sm 
  },
  keyIconWrap: { 
    width: 44, 
    height: 44, 
    borderRadius: 8, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
  },
  keyInfo: { flex: 1, justifyContent: 'center' },
  keyName: { fontFamily: FONT.orbitron, fontSize: 9, fontWeight: '900', marginBottom: 2 },
  keyBoss: { color: C.dimmed, fontSize: 7, textTransform: 'uppercase', fontFamily: FONT.orbitron },
  emptyKeys: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 8, padding: SPACING.md, width: '100%', alignItems: 'center' },
  emptyKeysTxt: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 11, marginBottom: 4 },
  emptyKeysSub: { color: C.muted, fontSize: 10, textAlign: 'center' },
})

const getICStyles = (C: any) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: C.panel,
    borderRadius: 8,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: 10,
    gap: SPACING.md,
    alignItems: 'center',
    height: 90,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
    borderWidth: 1.5,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#000',
  },
  badgeTxt: { color: '#000', fontSize: 10, fontWeight: '900' },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '900', marginBottom: 4, letterSpacing: 1 },
  desc: { color: C.muted, fontSize: 10, lineHeight: 14 },
  feedback: { fontSize: 10, marginTop: 4, fontFamily: FONT.orbitron, letterSpacing: 0.5 },
  useBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  useBtnDisabled: { opacity: 0.3 },
  useTxt: { fontFamily: FONT.orbitron, fontSize: 8, fontWeight: '900' },
})

const getQPStyles = (C: any) => StyleSheet.create({
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
