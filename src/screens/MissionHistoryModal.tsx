import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore from '../store/useGameStore'
import SoloLevelingModal from '../components/SoloLevelingModal'
import { FONT, SPACING } from '../theme'


const QUEST_TYPE_ICON: Record<string, string> = {
  training: 'arm-flex',
  knowledge: 'book-open-variant',
  focus: 'timer-sand',
  gps: 'run-fast',
}

const getQuestTypeColor = (C: any): Record<string, string> => ({
  training: '#ef4444',
  knowledge: C.neonBlue,
  focus: '#a855f7',
  gps: '#22c55e',
})


function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── MissionHistoryModal ────────────────────────────────────────────────────────

export default function MissionHistoryModal({ visible = true, onClose, C }: { visible?: boolean; onClose: () => void; C: any }) {
  const s = getStyles(C)
  const QUEST_TYPE_COLOR = getQuestTypeColor(C)

  const questRecords = useGameStore(s => s.questRecords)
  const questCompletions = useGameStore(s => s.questCompletions)
  const questDictionary = useGameStore(s => s.questDictionary)

  // Build display entries from dictionary + records/completions
  const entries = questDictionary
    .filter(def => def.type !== 'boss')
    .map(def => ({
      id: def.id,
      label: def.title,
      questType: def.questType,
      completions: questCompletions[def.id] ?? 0,
      bestTime: questRecords[def.id]?.bestTime ?? 0,
      lastNote: questRecords[def.id]?.lastNote ?? '',
      history: questRecords[def.id]?.history ?? [],
    }))
    .filter(e => e.completions > 0)
    .sort((a, b) => b.completions - a.completions)

  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  return (
    <SoloLevelingModal visible={visible} onRequestClose={onClose} contentStyle={{ flex: 1, width: '100%' }}>
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>

        <View style={s.header}>
          <Icon name="database-outline" size={14} color={C.neonBlue} />
          <Text style={s.headerTxt}> [ REGISTOS DO SISTEMA ]</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Icon name="close" size={20} color={C.muted} />
          </TouchableOpacity>
        </View>

        <View style={s.subHeader}>
          <Icon name="information-outline" size={11} color={C.dimmed} />
          <Text style={s.subHeaderTxt}>
            {' '}Missões completadas pelo menos uma vez · Ordenadas por frequência
          </Text>
        </View>

        {entries.length === 0 ? (
          <View style={s.empty}>
            <Icon name="ghost" size={40} color={C.border} />
            <Text style={s.emptyTxt}>Nenhum registo ainda.</Text>
            <Text style={s.emptySub}>Completa missões para ver o teu historial aqui.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.list}>
            {entries.map(e => {
              const icon = QUEST_TYPE_ICON[e.questType] ?? 'help-circle'
              const color = QUEST_TYPE_COLOR[e.questType] ?? C.muted
              const isExpanded = expandedId === e.id
              const history = e.history

              return (
                <View key={e.id} style={{ marginBottom: SPACING.sm }}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setExpandedId(isExpanded ? null : e.id)}
                    style={[s.row, { marginBottom: 0, borderBottomLeftRadius: isExpanded ? 0 : 4, borderBottomRightRadius: isExpanded ? 0 : 4, borderBottomWidth: isExpanded ? 0 : 1 }]}
                  >
                    <View style={[s.iconWrap, { backgroundColor: color + '18' }]}>
                      <Icon name={icon} size={18} color={color} />
                    </View>
                    <View style={s.info}>
                      <Text style={s.label} numberOfLines={1}>{e.label}</Text>
                      <View style={s.metaRow}>
                        <Icon name="check-circle-outline" size={10} color={C.dimmed} />
                        <Text style={s.meta}> {e.completions}×</Text>
                        {e.bestTime > 0 && (
                          <>
                            <Icon name="trophy-outline" size={10} color={C.gold} style={{ marginLeft: 10 }} />
                            <Text style={[s.meta, { color: C.gold }]}> {formatSeconds(e.bestTime)}</Text>
                          </>
                        )}
                      </View>
                      {e.lastNote && !isExpanded ? (
                        <Text style={s.note} numberOfLines={1}>"{e.lastNote}"</Text>
                      ) : null}
                    </View>
                    <View style={[s.countBadge, { borderColor: color + '55', backgroundColor: isExpanded ? color + '10' : 'transparent' }]}>
                      <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={color} />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[s.historyContainer, { borderColor: C.border }]}>
                      {history.length > 0 ? history.slice().reverse().map((h, i) => (
                        <View key={i} style={[s.historyItem, i < history.length - 1 && s.historyItemBorder]}>
                          <View style={s.historyHeader}>
                            <Text style={s.historyDate}>
                              <Icon name="calendar-blank" size={10} color={C.dimmed} /> {new Date(h.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                            </Text>
                            {h.time > 0 && (
                              <Text style={s.historyTime}>
                                <Icon name="timer-outline" size={10} color={color} /> {formatSeconds(h.time)}
                              </Text>
                            )}
                          </View>
                          {h.note ? <Text style={s.historyNote}>"{h.note}"</Text> : null}
                        </View>
                      )) : (
                        <Text style={s.emptyHistory}>Sem eventos passados.</Text>
                      )}
                    </View>
                  )}
                </View>
              )
            })}
          </ScrollView>
        )}

      </SafeAreaView>
    </SoloLevelingModal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg, width: '100%' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTxt: { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 3 },
  closeBtn: { padding: 6 },

  subHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, backgroundColor: C.panel, borderBottomWidth: 1, borderBottomColor: C.border },
  subHeaderTxt: { flex: 1, color: C.dimmed, fontSize: 11, lineHeight: 16 },

  list: { padding: SPACING.md, paddingBottom: 40 },

  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.border, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  iconWrap: { width: 36, height: 36, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1 },
  label: { color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  meta: { color: C.dimmed, fontSize: 11 },
  note: { color: C.dimmed, fontSize: 10, fontStyle: 'italic', marginTop: 3 },

  countBadge: { width: 36, height: 36, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  countTxt: { fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '900' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.xl },
  emptyTxt: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 13, letterSpacing: 1 },
  emptySub: { color: C.dimmed, fontSize: 12 },

  historyContainer: { backgroundColor: C.panel, padding: SPACING.sm, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderWidth: 1, borderTopWidth: 0 },
  historyItem: { paddingVertical: SPACING.sm, paddingHorizontal: 4 },
  historyItemBorder: { borderBottomWidth: 1, borderBottomColor: C.border + '55' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  historyDate: { color: C.dimmed, fontSize: 11, fontFamily: FONT.orbitron },
  historyTime: { color: '#e2e8f0', fontSize: 11, fontFamily: FONT.orbitron },
  historyNote: { color: C.muted, fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  emptyHistory: { color: C.dimmed, fontSize: 11, textAlign: 'center', padding: SPACING.md, fontStyle: 'italic' },
})

