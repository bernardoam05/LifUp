import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Vibration } from 'react-native';
import useGameStore from '../store/useGameStore';
import { CATALOG_MAP } from '../data/shopItems';
import KeyVaultModal from '../components/KeyVaultModal';
import CustomModal from '../components/CustomModal';
import { useTheme, FONT, SPACING } from '../theme';


// ── Quest picker modal (for System Pass) ──────────────────────────────────────

function QuestPickerModal({ onPick, onCancel, C }: {
  onPick: (questId: string) => void
  onCancel: () => void
  C: any
}) {
  const qp = getQPStyles(C);

  const quests = useGameStore(s => s.quests).filter(q => !q.done);

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
  );
}

// ── Inventory item card ────────────────────────────────────────────────────────

function InventoryCard({ itemId, quantity, C }: { itemId: string; quantity: number; C: any }) {
  const ic = getICStyles(C);

  const item            = CATALOG_MAP[itemId];
  const consumeItem     = useGameStore(s => s.useInventoryItem);
  const addXP           = useGameStore(s => s.addXP);
  const skipQuest       = useGameStore(s => s.skipQuest);
  const setPenRed       = useGameStore(s => s.setPenaltyReduced);
  const removePenalty   = useGameStore(s => s.removePenalty);
  const setXpBoostNext  = useGameStore(s => s.setXpBoostNext);
  const setHardcoreMode = useGameStore(s => s.setHardcoreFocusMode);
  const hardcoreActive  = useGameStore(s => s.system.hardcoreFocusMode);
  const triggerEvent    = useGameStore(s => s.triggerEvent);
  const openLootBox     = useGameStore(s => s.openLootBox);
  const addGold         = useGameStore(s => s.addGold);
  const resetExtraction = useGameStore(s => s.resetExtraction);

  const [confirmUse, setConfirmUse] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [feedback,   setFeedback]   = useState<string | null>(null);

  if (!item) {return null;}

  // Upgrade materials (shadow evolution) can only be used in the Shadows screen
  const isUpgradeMaterial = item.effect === 'material' && !item.buffStat && itemId !== 'shadow_essence';

  function handleUse() {
    if (isUpgradeMaterial) {
      setFeedback('Material de evolução — usa no ecrã de Sombras para evoluir');
      setTimeout(() => setFeedback(null), 3500);
      return;
    }
    if (item.effect === 'skip_quest') {
      setShowPicker(true);
    } else {
      setConfirmUse(true);
    }
  }

  function applyEffect() {
    Vibration.vibrate([0, 80, 40, 120]);

    switch (item.effect) {
      case 'add_xp': {
        consumeItem(itemId);
        const { leveledUp } = addXP(item.effectValue ?? 50);
        // health_potion also grants gold
        if (item.effectGold && item.effectGold > 0) {
          addGold(item.effectGold);
        }
        const goldText = item.effectGold ? ` e +${item.effectGold} Gold` : '';
        setFeedback(leveledUp
          ? `+${item.effectValue} XP${goldText} — LEVEL UP!`
          : `+${item.effectValue} XP${goldText} absorvido!`
        );
        break;
      }
      case 'reduce_penalty': {
        consumeItem(itemId);
        setPenRed(true);
        setFeedback('Pergaminho ativado! Penalização de amanhã reduzida em 50%.');
        break;
      }
      case 'remove_penalty': {
        consumeItem(itemId);
        triggerEvent('lagrima_used_during_penalty');
        removePenalty();
        setFeedback('Penalização removida! O Sistema purificou o teu registo.');
        break;
      }
      case 'xp_boost_next': {
        consumeItem(itemId);
        setXpBoostNext(true);
        setFeedback('Ampulheta ativada! Próxima missão com XP dobrado.');
        break;
      }
      case 'open_loot_box': {
        const success = openLootBox();
        if (success) {
          setFeedback('Cofre aberto! Verifica a recompensa...');
        } else {
          setFeedback('Nenhum cofre disponível!');
        }
        break;
      }
      case 'break_hardcore': {
        if (!hardcoreActive) {
          setFeedback('Nenhum Modo Hardcore ativo para quebrar.');
        } else {
          consumeItem(itemId);
          setHardcoreMode(false);
          setFeedback('Juramento quebrado! Podes parar o Focus Mode livremente.');
        }
        break;
      }
      case 'material': {
        consumeItem(itemId);
        if (itemId === 'shadow_essence') {
          setFeedback('O Sistema cedeu! Uma nova sombra foi invocada.');
        } else if (item.buffStat && item.buffMult && item.buffDuration) {
          const pct = Math.round((item.buffMult - 1) * 100);
          const stat = item.buffStat === 'xp' ? 'XP' : 'Gold';
          const mins = item.buffDuration / 60_000;
          const timeLabel = mins >= 60 ? `${mins / 60}h` : `${mins}min`;
          // Buff is applied by the store's useInventoryItem — no duplicate needed here
          setFeedback(`Buff ativo: +${pct}% ${stat} por ${timeLabel}!`);
        } else {
          setFeedback('Consumível ativado!');
        }
        break;
      }
      default: {
        consumeItem(itemId);
        setFeedback('Item utilizado com sucesso!');
      }
    }
    setConfirmUse(false);
    setTimeout(() => setFeedback(null), 3000);
  }

  function handleSkip(questId: string) {
    skipQuest(questId);
    consumeItem(itemId);
    Vibration.vibrate([0, 80, 40, 120]);
    setShowPicker(false);
    setFeedback('Missão completada pelo Sistema!');
    setTimeout(() => setFeedback(null), 3000);
  }

  // Warn if break_hardcore used when no hardcore mode active
  const isBreakHardcore = item.effect === 'break_hardcore';
  const breakHardcoreDisabled = isBreakHardcore && !hardcoreActive;

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
        <Text style={[ic.desc, { color: C.text.secondary }]} numberOfLines={2}>{item.description}</Text>
        {isUpgradeMaterial && !feedback && (
          <View style={ic.upgradeBadge}>
            <Icon name="sword-cross" size={8} color={C.neonBlue} />
            <Text style={ic.upgradeTxt}> Usa em Sombras para evoluir</Text>
          </View>
        )}
        {feedback && (
          <Text style={[ic.feedback, { color: isUpgradeMaterial ? C.neonBlue : item.color }]}>{feedback}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[ic.useBtn, isUpgradeMaterial ? { borderColor: C.neonBlue + '44', backgroundColor: C.neonBlue + '10' } : { borderColor: item.color + '66', backgroundColor: item.color + '10' }, breakHardcoreDisabled && ic.useBtnDisabled]}
        onPress={handleUse}
        disabled={quantity === 0 || breakHardcoreDisabled}
      >
        {isUpgradeMaterial
          ? <Icon name="ghost" size={14} color={C.neonBlue} />
          : <Text style={[ic.useTxt, { color: breakHardcoreDisabled ? C.dimmed : item.color }]}>USAR</Text>
        }
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
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function InventoryScreen() {
  const C = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const inventory = useGameStore(st => st.player.inventory);
  const dungeonKeys = useGameStore(st => st.player.dungeonKeys);

  const gold      = useGameStore(st => st.player.gold);
  const activeInventory = React.useMemo(() => inventory.filter(e => e.quantity > 0), [inventory]);
  const total = activeInventory.reduce((sum, e) => sum + e.quantity, 0);

  const [showVaultModal, setShowVaultModal] = useState(false);

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

        {/* Vault Button */}
        <TouchableOpacity
          style={[s.vaultBtn, { borderColor: C.neonBlue + '44' }]}
          onPress={() => setShowVaultModal(true)}
          activeOpacity={0.7}
        >
          <View style={[s.vaultIconWrap, { backgroundColor: C.neonBlue + '12' }]}>
            <Icon name="safe" size={32} color={C.neonBlue} />
          </View>
          <View style={s.vaultInfo}>
            <Text style={s.vaultTitle}>COFRE DE CHAVES</Text>
            <Text style={s.vaultCount}>
              {dungeonKeys && dungeonKeys.length > 0
                ? `${dungeonKeys.length} chave${dungeonKeys.length !== 1 ? 's' : ''} guardada${dungeonKeys.length !== 1 ? 's' : ''}`
                : 'Nenhuma chave'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={C.neonBlue} />
        </TouchableOpacity>

        <View style={[s.sectionHeader, { marginTop: SPACING.lg }]}>
          <Icon name="bag-personal-outline" size={14} color={C.neonBlue} />
          <Text style={s.sectionTitle}> ITENS</Text>
        </View>

        {activeInventory.length === 0 ? (
          <View style={s.emptyWrap}>
            <Icon name="bag-personal-outline" size={48} color={C.dimmed} />
            <Text style={s.emptyTitle}>INVENTÁRIO VAZIO</Text>
            <Text style={s.emptyDesc}>Visita a Loja do Sistema para adquirir itens.</Text>
          </View>
        ) : (
          activeInventory.map(entry => (
            <InventoryCard key={entry.itemId} itemId={entry.itemId} quantity={entry.quantity} C={C} />
          ))
        )}


      </ScrollView>

      {/* Modals */}
      <KeyVaultModal
        visible={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        keys={dungeonKeys || []}
        C={C}
      />

    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  safeArea:   { flex: 1, backgroundColor: C.bg },
  content:    { padding: SPACING.md, paddingBottom: SPACING.lg, gap: SPACING.md },
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
  vaultBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 8, borderWidth: 1, padding: SPACING.md, gap: SPACING.md, marginBottom: SPACING.md },
  vaultIconWrap: { width: 56, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.neonBlue + '44' },
  vaultInfo: { flex: 1 },
  vaultTitle: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  vaultCount: { color: C.muted, fontSize: 10, marginTop: 2 },
});

const getICStyles = (C: any) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: C.panel,
    borderRadius: 8,
    borderWidth: 1,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
    alignItems: 'center',
    minHeight: 70,
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
  upgradeBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: C.neonBlue + '12', borderRadius: 4, borderWidth: 1, borderColor: C.neonBlue + '33', paddingHorizontal: 4, paddingVertical: 2, alignSelf: 'flex-start' },
  upgradeTxt: { color: C.neonBlue, fontSize: 8, fontFamily: FONT.orbitron },
  useBtn: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  useBtnDisabled: { opacity: 0.3 },
  useTxt: { fontFamily: FONT.orbitron, fontSize: 8, fontWeight: '900' },
});

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
});
