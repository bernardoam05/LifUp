import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore, { SideQuest } from '../store/useGameStore';
import BottomSheetModal from './BottomSheetModal';
import CustomModal from './CustomModal';
import { FONT, SPACING } from '../theme';

export const getSQSStyles = (C: any) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: C.border + '44',
    gap: SPACING.sm,
  },
  cardDone: { opacity: 0.45 },
  info: { flex: 1 },
  title: { color: '#e2e8f0', fontSize: 13, lineHeight: 18 },
  titleDone: { color: C.muted, textDecorationLine: 'line-through' },
  noteLine: { color: C.purple + 'cc', fontSize: 10, marginTop: 3, fontStyle: 'italic' },
  actionBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: 0.7 },
  doneBtn: {
    width: 44, height: 44, borderWidth: 1.5, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderColor: C.purple + '88', backgroundColor: C.purple + '0d',
  },
  doneBtnPressed: {
    backgroundColor: C.purple + '33',
    borderColor: C.purple,
  },
  doneWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  delBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});

interface SideQuestCardProps {
  sq: SideQuest;
  C: any;
}

export default function SideQuestCard({ sq, C }: SideQuestCardProps) {
  const sq_s = getSQSStyles(C);
  const insets = useSafeAreaInsets();
  const completeSQ = useGameStore(s => s.completeSideQuest);
  const updateNote = useGameStore(s => s.updateSideQuestNote);
  const removeSQ = useGameStore(s => s.removeSideQuest);

  const [confirm, setConfirm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(sq.note ?? '');

  return (
    <View style={[sq_s.card, sq.done && sq_s.cardDone]}>
      <View style={sq_s.info}>
        <Text style={[sq_s.title, sq.done && sq_s.titleDone]} numberOfLines={2}>
          {sq.title}
        </Text>
        {sq.note ? <Text style={sq_s.noteLine}>{sq.note}</Text> : null}
      </View>

      {!sq.done && (
        <TouchableOpacity style={sq_s.actionBtn} onPress={() => setShowNoteInput(true)}>
          <Icon name="note-edit-outline" size={16} color={C.dimmed} />
        </TouchableOpacity>
      )}

      {sq.done ? (
        <View style={sq_s.doneWrap}>
          <Icon name="check-circle" size={22} color={C.green} />
        </View>
      ) : (
        <Pressable
          style={({ pressed }) => [sq_s.doneBtn, pressed && sq_s.doneBtnPressed]}
          onPress={() => setConfirm(true)}
        >
          <Icon name="check-bold" size={16} color={C.purple} />
        </Pressable>
      )}

      <Pressable
        style={({ pressed }) => [sq_s.delBtn, { opacity: pressed ? 0.5 : 1 }]}
        onPress={() => setConfirmDelete(true)}
      >
        <Icon name="close" size={14} color={C.dimmed} />
      </Pressable>

      {/* Note Input */}
      <BottomSheetModal visible={showNoteInput} onClose={() => setShowNoteInput(false)} contentStyle={{ backgroundColor: 'transparent' }}>
        <View style={{ backgroundColor: C.panel, padding: 20, paddingBottom: Math.max(20, insets.bottom + SPACING.sm), borderTopLeftRadius: 16, borderTopRightRadius: 16, width: '100%' }}>
          <Text style={{ color: C.purple, fontFamily: FONT.orbitron, marginBottom: 10 }}>NOTA DA TAREFA</Text>
          <TextInput
            style={{ backgroundColor: C.bg, color: '#fff', padding: 12, borderRadius: 8, textAlignVertical: 'top', height: 90 }}
            multiline
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Escreve aqui..."
            placeholderTextColor={C.dimmed}
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: C.purple, padding: 12, borderRadius: 8, alignItems: 'center' }}
              onPress={() => { updateNote(sq.id, noteText); setShowNoteInput(false); }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>GUARDAR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, borderWidth: 1, borderColor: C.dimmed, padding: 12, borderRadius: 8, alignItems: 'center' }}
              onPress={() => setShowNoteInput(false)}
            >
              <Text style={{ color: C.dimmed }}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>

      <CustomModal
        visible={confirm}
        title="TAREFA CONCLUÍDA"
        message={`Marcas como feita:\n"${sq.title}"?`}
        confirmLabel="SIM, FIZ"
        confirmIcon="check-circle-outline"
        confirmColor={C.purple}
        onConfirm={() => { setConfirm(false); completeSQ(sq.id); }}
        onCancel={() => setConfirm(false)}
        C={C}
      />

      <CustomModal
        visible={confirmDelete}
        title="APAGAR TAREFA"
        message={`Apagar permanentemente:\n"${sq.title}"?`}
        confirmLabel="APAGAR"
        confirmIcon="trash-can-outline"
        confirmColor={C.neonRed}
        onConfirm={() => { setConfirmDelete(false); removeSQ(sq.id); }}
        onCancel={() => setConfirmDelete(false)}
        C={C}
      />
    </View>
  );
}
