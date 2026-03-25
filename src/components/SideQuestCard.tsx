import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useGameStore, { SideQuest } from '../store/useGameStore';
import { scheduleSideQuestNotification, cancelSideQuestNotification } from '../utils/notifications';
import CustomModal from './CustomModal';
import BottomSheetModal from './BottomSheetModal';
import { FONT, SPACING } from '../theme';

export const SIDE_RANK_COLOR: Record<string, string> = {
  E: '#94a3b8',
  D: '#22c55e',
  C: '#00d4ff',
};

export const getSQSStyles = (C: any) => StyleSheet.create({
  card: { opacity: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: C.border + '55', gap: SPACING.sm, borderLeftWidth: 2, borderLeftColor: 'transparent' },
  cardDone: { opacity: 0.5 },
  cardActive: { borderLeftColor: C.purple, backgroundColor: C.purple + '08' },
  rankBadge: { width: 28, height: 28, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rankTxt: { fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700' },
  info: { flex: 1 },
  title: { color: '#e2e8f0', fontSize: 13, lineHeight: 17 },
  titleDone: { color: C.muted, textDecorationLine: 'line-through' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  xp: { color: C.neonBlue, fontSize: 10, fontWeight: '700' },
  gold: { color: C.gold, fontSize: 10, fontWeight: '700' },
  dimmed: { color: C.dimmed },
  noteLine: { color: C.purple, fontSize: 10, marginTop: 4, fontStyle: 'italic' },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  timerTxt: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 9, fontWeight: '700' },
  doneBtn: { width: 32, height: 32, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  doneWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: 0.7 },
  delBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

interface SideQuestCardProps {
  sq: SideQuest;
  C: any;
  formatTime: (seconds: number) => string;
}

export default function SideQuestCard({ sq, C, formatTime }: SideQuestCardProps) {
  const sq_s = getSQSStyles(C);
  const insets = useSafeAreaInsets();
  const completeSQ = useGameStore(s => s.completeSideQuest);
  const startSQ = useGameStore(s => s.startSideQuest);
  const updateNote = useGameStore(s => s.updateSideQuestNote);
  const removeSQ = useGameStore(s => s.removeSideQuest);

  const [confirm, setConfirm] = useState(false);
  const [showTimerSelect, setShowTimerSelect] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState(sq.note || '');

  const rankColor = SIDE_RANK_COLOR[sq.rank] ?? C.muted;
  const isActive = !!(sq.startTime && !sq.done && (Date.now() - sq.startTime < (sq.duration ?? 0) * 1000));

  // Timer logic
  const [timeLeft, setTimeLeft] = useState(0);
  useEffect(() => {
    if (!sq.startTime || !sq.duration || sq.done) return;
    const update = () => {
      const elapsed = (Date.now() - sq.startTime!) / 1000;
      const remaining = Math.max(0, sq.duration! - elapsed);
      setTimeLeft(Math.floor(remaining));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => { if (interval) clearInterval(interval); };
  }, [sq.startTime, sq.duration, sq.done]);

  function handleComplete() {
    cancelSideQuestNotification(sq.id).catch(() => { });
    const { leveledUp } = completeSQ(sq.id);
  }

  return (
    <View style={[sq_s.card, sq.done && sq_s.cardDone, isActive && sq_s.cardActive]}>
      <View style={[sq_s.rankBadge, { borderColor: rankColor + '55', backgroundColor: rankColor + '10' }]}>
        <Text style={[sq_s.rankTxt, { color: rankColor }]}>{sq.rank}</Text>
      </View>

      <View style={sq_s.info}>
        <Text style={[sq_s.title, sq.done && sq_s.titleDone]} numberOfLines={2}>
          {sq.title}
        </Text>

        {sq.note ? <Text style={sq_s.noteLine}>{sq.note}</Text> : null}

        <View style={sq_s.rewardRow}>
          <Icon name="star-four-points" size={9} color={sq.done ? C.dimmed : C.neonBlue} />
          <Text style={[sq_s.xp, sq.done && sq_s.dimmed]}> {sq.xp} XP</Text>
          <Text style={[sq_s.gold, sq.done && sq_s.dimmed]}>  ◈{sq.gold}</Text>
        </View>
        {isActive && (
          <View style={sq_s.timerRow}>
            <Icon name="timer-sand" size={10} color={C.purple} />
            <Text style={sq_s.timerTxt}>{formatTime(timeLeft)}</Text>
          </View>
        )}
      </View>

      {!sq.done && (
        <>
          <TouchableOpacity style={sq_s.actionBtn} onPress={() => setShowNoteInput(true)}>
            <Icon name="note-edit-outline" size={16} color={C.dimmed} />
          </TouchableOpacity>

          {!sq.startTime && (
            <TouchableOpacity style={sq_s.actionBtn} onPress={() => setShowTimerSelect(true)}>
              <Icon name="timer-outline" size={17} color={C.purple} />
            </TouchableOpacity>
          )}
        </>
      )}

      {sq.done ? (
        <View style={sq_s.doneWrap}>
          <Icon name="check-circle" size={16} color={C.green} />
        </View>
      ) : (
        <TouchableOpacity style={[sq_s.doneBtn, { borderColor: rankColor }]} onPress={() => setConfirm(true)}>
          <Icon name="check-bold" size={13} color={rankColor} />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={sq_s.delBtn} onPress={() => {
        cancelSideQuestNotification(sq.id).catch(() => { });
        removeSQ(sq.id);
      }}>
        <Icon name="close" size={13} color={C.dimmed} />
      </TouchableOpacity>

      {/* Timer Selection Modal */}
      <CustomModal
        visible={showTimerSelect}
        title="DEFINIR TEMPO"
        message="Quanto tempo vais dedicar a esta tarefa?"
        confirmLabel="30 MIN"
        onConfirm={() => {
          setShowTimerSelect(false);
          startSQ(sq.id, 30);
          scheduleSideQuestNotification(sq.id, 30 * 60_000, sq.title).catch(() => { });
        }}
        cancelLabel="60 MIN"
        onCancel={() => {
          setShowTimerSelect(false);
          startSQ(sq.id, 60);
          scheduleSideQuestNotification(sq.id, 60 * 60_000, sq.title).catch(() => { });
        }}
        C={C}
      />

      {/* Note Input Modal */}
      <BottomSheetModal visible={showNoteInput} onClose={() => setShowNoteInput(false)} contentStyle={{ backgroundColor: 'transparent' }}>
        <View style={{ backgroundColor: C.panel, padding: 20, paddingBottom: Math.max(20, insets.bottom + SPACING.sm), borderTopLeftRadius: 16, borderTopRightRadius: 16, width: '100%' }}>
          <Text style={{ color: C.purple, fontFamily: FONT.orbitron, marginBottom: 10 }}>NOTA DA MISSÃO</Text>
          <TextInput
            style={{ backgroundColor: C.bg, color: '#fff', padding: 12, borderRadius: 8, textAlignVertical: 'top', height: 100 }}
            multiline
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Escreve aqui..."
            placeholderTextColor={C.dimmed}
            autoFocus
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
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
        title="MISSÃO SECUNDÁRIA"
        message={`Concluíste:\n"${sq.title}"?`}
        confirmLabel="SIM, CONCLUÍ"
        confirmIcon="check-circle-outline"
        confirmColor={rankColor}
        onConfirm={() => { setConfirm(false); handleComplete(); }}
        onCancel={() => setConfirm(false)}
        C={C}
      />
    </View>
  );
}
