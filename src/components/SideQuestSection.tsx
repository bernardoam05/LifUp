import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore from '../store/useGameStore';
import { FONT, SPACING } from '../theme';
import SideQuestCard from './SideQuestCard';

export const getSideStyles = (C: any) => StyleSheet.create({
  container: { marginTop: SPACING.md, borderWidth: 1, borderColor: C.purple + '44', borderRadius: 4, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, backgroundColor: C.purple + '0d' },
  title: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  badge: { backgroundColor: C.purple + '22', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, marginLeft: SPACING.sm },
  badgeTxt: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 9 },
  sub: { color: C.dimmed, fontSize: 11, paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, lineHeight: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm, gap: SPACING.sm },
  input: { flex: 1, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 10, color: '#e2e8f0', fontSize: 13 },
  addBtn: { backgroundColor: C.purple + '18', borderWidth: 1, borderColor: C.purple + '66', borderRadius: 4, padding: 10 },
  empty: { color: C.dimmed, fontSize: 11, fontStyle: 'italic', textAlign: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md },
});

interface SideQuestSectionProps {
  C: any;
}

export default function SideQuestSection({ C }: SideQuestSectionProps) {
  const side = getSideStyles(C);
  const list = useGameStore(s => s.sideQuests);
  const addSQ = useGameStore(s => s.addSideQuest);
  const [collapsed, setCollapsed] = useState(false);
  const [input, setInput] = useState('');

  function handleAdd() {
    const title = input.trim();
    if (!title) return;
    addSQ(title);
    setInput('');
  }

  function formatTime(totalSeconds: number) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return (
    <View style={side.container}>
      <TouchableOpacity style={side.header} onPress={() => setCollapsed(v => !v)} activeOpacity={0.7}>
        <Icon name="sword-cross" size={14} color={C.purple} />
        <Text style={side.title}> MISSÕES SECUNDÁRIAS</Text>
        <View style={side.badge}>
          <Text style={side.badgeTxt}>{list.filter(q => q.done).length}/{list.length}</Text>
        </View>
        <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} size={16} color={C.muted} style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {!collapsed && (
        <>
          <Text style={side.sub}>
            Tarefas pessoais. Não contam para streak. O Sistema atribui recompensa aleatória.
          </Text>

          <View style={side.inputRow}>
            <TextInput
              style={side.input}
              placeholder="Nova tarefa..."
              placeholderTextColor={C.dimmed}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleAdd}
              returnKeyType="done"
            />
            <TouchableOpacity style={side.addBtn} onPress={handleAdd}>
              <Icon name="plus" size={20} color={C.purple} />
            </TouchableOpacity>
          </View>

          <View>
            {list.length === 0 ? (
              <Text style={side.empty}>Sem missões secundárias. Adiciona uma acima.</Text>
            ) : (
              list.map(sq => <SideQuestCard key={sq.id} sq={sq} C={C} formatTime={formatTime} />)
            )}
          </View>
        </>
      )}
    </View>
  );
}
