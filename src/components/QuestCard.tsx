// src/components/QuestCard.tsx
import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { Quest } from '../store/useGameStore'
import { getQuestConfig } from '../store/questDictionary'
import CustomModal from './CustomModal'
import GPSTrackerModal from './GPSTrackerModal'
import MissionActiveScreen from '../screens/MissionActiveScreen'
import { SPACING, FONT, RANK_COLORS } from '../theme'

const getQCStyles = (C: any) => StyleSheet.create({
  card: { opacity: 1, backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, marginBottom: 16, borderWidth: 1, borderColor: C.neonBlue + '33' },
  cardWarning: { backgroundColor: C.neonRed + '08', borderColor: C.neonRed + '44' },
  cardSuccess: { backgroundColor: C.green + '10', borderColor: C.green + '44' },
  cardDone: { opacity: 0.55 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: SPACING.sm },
  typeTag: { width: 28, height: 28, borderRadius: 2, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, color: C.muted, fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700' },
  labelDone: { color: C.muted },
  rewards: { flexDirection: 'row', alignItems: 'center' },
  xp: { color: C.neonBlue, fontSize: 11, fontWeight: '700' },
  gold: { color: C.gold, fontSize: 11, fontWeight: '700' },
  dimmedTxt: { color: C.dimmed },
  detail: { color: C.muted, fontSize: 12, marginBottom: SPACING.md, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 8 },
  actionTxt: { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
  doneRow: { flexDirection: 'row', alignItems: 'center' },
  doneTag: { color: C.green, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 0.5 },
  undoBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.dimmed, borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 5 },
  undoTxt: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 0.5 },
  recordChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: C.gold + '10', borderWidth: 1, borderColor: C.gold + '33', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, marginBottom: SPACING.sm },
  recordChipTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9 },
  cardActive: { borderColor: C.neonBlue + '99', shadowColor: C.neonBlue, shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  activeTimerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.neonBlue + '12', borderWidth: 1, borderColor: C.neonBlue + '55', borderRadius: 4, paddingHorizontal: SPACING.sm, paddingVertical: 10 },
  activeTimerTxt: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  forbiddenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  failBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.neonRed + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.neonRed + '40',
  },
  failBtnTxt: {
    color: C.neonRed,
    fontSize: 11,
    fontFamily: FONT.orbitron,
    marginLeft: 4,
  },
  forbiddenStatus: {
    color: C.neonRed,
    fontSize: 10,
    fontFamily: FONT.orbitron,
    letterSpacing: 1,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  limitControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitValue: {
    color: '#fff',
    fontSize: 14,
    fontFamily: FONT.orbitron,
    minWidth: 40,
    textAlign: 'center',
  },
  limitStatus: {
    fontSize: 10,
    fontFamily: FONT.orbitron,
    letterSpacing: 1,
  },
})

// Specific extra badge styles needed internally by QuestCard
const getExtraStyles = (C: any) => StyleSheet.create({
  extraBonusBadge: { marginLeft: 8, backgroundColor: C.gold + '22', borderWidth: 1, borderColor: C.gold + '55', borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  extraBonusTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5 },
})


export default function QuestCard({ quest, isExtra, C }: { quest: Quest; isExtra?: boolean; C: any }) {
  const qc = getQCStyles(C)
  const ex = getExtraStyles(C)
  const cfgInfo = getQuestConfig(quest.type)
  const cfg = { icon: cfgInfo.icon, color: (C as any)[cfgInfo.colorKey] || C.dimmed }

  const completeQuest = useGameStore(s => isExtra ? s.completeExtraQuest : s.completeQuest)
  // Use a stable identity for the no-op function
  const undoQuest = useGameStore(s => isExtra ? undefined : s.undoQuest)
  const recordFocus = useGameStore(s => s.recordFocusTime)
  const questRecords = useGameStore(s => s.questRecords)
  const activeMissionTimers = useGameStore(s => s.activeMissionTimers)
  const failQuest = useGameStore(s => s.failQuest)
  const updateQuestValue = useGameStore(s => s.updateQuestValue)
  const regenerateSingleDailyQuest = useGameStore(s => isExtra ? undefined : s.regenerateSingleDailyQuest)
  const weeklyRegenCount = useGameStore(s => s.system.weeklyRegenCount)
  const replaceExtraQuest = useGameStore(s => isExtra ? s.replaceExtraQuest : undefined)
  const extraQuestRerolledIds = useGameStore(s => s.extraQuestRerolledIds)

  const timer = activeMissionTimers[quest.id]
  const isTimerActive = !!timer && !quest.done
  const isWarningQuest = quest.type === 'forbidden' || quest.type === 'limit'

  const [showGPS, setShowGPS] = useState(false)
  const [showMission, setShowMission] = useState(false)
  const [showMissionOptions, setShowMissionOptions] = useState(false)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [showExtraRegenConfirm, setShowExtraRegenConfirm] = useState(false)
  const [extraRegenMsg, setExtraRegenMsg] = useState<string | null>(null)

  const record = questRecords[quest.id]


  function handleComplete() {
    completeQuest(quest.id)
  }

  function handleMissionComplete() {
    setShowMission(false)
    if (quest.type === 'focus') {
      const focusMinutes = Math.max(1, Math.round((quest.focusDuration ?? 30 * 60_000) / 60_000))
      recordFocus(focusMinutes)
    }
    handleComplete()
  }

  const Container = (quest.done ? View : TouchableOpacity) as React.ElementType

  return (
    <>
      <Container
        style={[qc.card, isWarningQuest && qc.cardWarning, quest.done && qc.cardSuccess, quest.done && qc.cardDone, isTimerActive && qc.cardActive]}
        activeOpacity={0.8}
        onPress={!quest.done ? () => {
          if (quest.type === 'gps') setShowGPS(true)
          else if (quest.type === 'forbidden' || quest.type === 'limit') { /* handled via inline buttons or state */ }
          else setShowMission(true)
        } : undefined}
      >
        <View style={qc.header}>
          <View style={[qc.typeTag, { borderColor: cfg.color + '55' }]}>
            <Icon name={cfg.icon} size={14} color={quest.done ? C.muted : cfg.color} />
          </View>
          <Text style={[qc.label, quest.done && qc.labelDone]} numberOfLines={1}>{quest.label}</Text>
          <View style={qc.rewards}>
            {isExtra && (
              <View style={ex.extraBonusBadge}>
                <Text style={ex.extraBonusTxt}>×1.5</Text>
              </View>
            )}
            {isExtra && !quest.done && replaceExtraQuest && !extraQuestRerolledIds.includes(quest.id) && (
              <TouchableOpacity
                style={{ padding: 4, marginRight: 4 }}
                onPress={() => setShowExtraRegenConfirm(true)}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={14} color={C.gold} />
              </TouchableOpacity>
            )}
            {!isExtra && !quest.done && regenerateSingleDailyQuest && (
              <TouchableOpacity
                style={{ padding: 2, marginRight: SPACING.sm }}
                onPress={() => {
                  if (weeklyRegenCount >= 7) {
                    setExtraRegenMsg('Já usaste as tuas 7 trocas desta semana.')
                    setShowExtraRegenConfirm(true)
                  } else {
                    setShowRegenConfirm(true)
                  }
                }}
                activeOpacity={0.7}
              >
                <Icon name="refresh" size={14} color={C.neonBlue} />
              </TouchableOpacity>
            )}
            <Icon name="star-four-points" size={10} color={quest.done ? C.dimmed : (isExtra ? C.gold : C.neonBlue)} />
            <Text style={[qc.xp, quest.done && qc.dimmedTxt, isExtra && { color: C.gold }]}> {quest.xp}</Text>
            <Text style={[qc.gold, quest.done && qc.dimmedTxt, isExtra && { color: C.gold }]}>  ◈{quest.gold}</Text>
          </View>
        </View>

        <Text style={[qc.detail, quest.done && qc.dimmedTxt]}>{quest.detail}</Text>

        {/* Personal record chip */}
        {record && record.bestTime > 0 && !quest.done && (
          <View style={qc.recordChip}>
            <Icon name="trophy-outline" size={10} color={C.gold} />
            <Text style={qc.recordChipTxt}>
              {' '}PR: {Math.floor(record.bestTime / 60).toString().padStart(2, '0')}:{(record.bestTime % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        )}

        {quest.done ? (
          <View style={[qc.doneRow, { paddingRight: 50 }]}>
            <Icon name="check-circle" size={14} color={C.green} />
            <Text style={qc.doneTag}> Concluida</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={qc.undoBtn} onPress={() => setConfirmUndo(true)}>
              <Icon name="undo-variant" size={13} color={C.muted} />
              <Text style={qc.undoTxt}> Desfazer</Text>
            </TouchableOpacity>
          </View>
        ) : quest.type === 'forbidden' ? (
          <View style={[qc.forbiddenRow, { paddingRight: 50 }]}>
            <TouchableOpacity style={qc.failBtn} onPress={() => failQuest(quest.id)}>
              <Icon name="close-circle-outline" size={14} color={C.neonRed} />
              <Text style={qc.failBtnTxt}> Falhei</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <Text style={qc.forbiddenStatus}>Em vigor</Text>
          </View>
        ) : quest.type === 'limit' ? (
          <View style={[qc.limitRow, { paddingRight: 50 }]}>
            <View style={qc.limitControls}>
              <TouchableOpacity onPress={() => updateQuestValue(quest.id, Math.max(0, (quest.currentValue ?? 0) - 10))}>
                <Icon name="minus-box-outline" size={20} color={C.dimmed} />
              </TouchableOpacity>
              <Text style={qc.limitValue}>{(quest.currentValue ?? 0).toString()}</Text>
              <TouchableOpacity onPress={() => updateQuestValue(quest.id, (quest.currentValue ?? 0) + 10)}>
                <Icon name="plus-box-outline" size={20} color={C.neonBlue} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }} />
            <Text style={[qc.limitStatus, (quest.currentValue ?? 0) > (quest.targetValue ?? 0) ? { color: C.purple } : { color: C.green }]}>
              Max: {quest.targetValue}
            </Text>
          </View>
        ) : isTimerActive ? (
          <TouchableOpacity 
            style={[qc.activeTimerRow, { paddingRight: 50, minHeight: 40 }]}
            onPress={() => setShowMission(true)}
          >
            <Icon name="timer-outline" size={13} color={C.neonBlue} />
            <Text style={qc.activeTimerTxt}> A DECORRER</Text>
            <View style={{ flex: 1 }} />
            <Icon name="chevron-right" size={14} color={C.neonBlue} />
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, opacity: 1, paddingRight: 50 }}>
            <Icon name="gesture-tap" size={14} color={C.neonBlue} style={{ opacity: 0.5 }} />
            <Text style={{ color: C.neonBlue, fontSize: 10, fontFamily: FONT.orbitron, marginLeft: 4, opacity: 0.5 }}>
              Toca para iniciar
            </Text>
            <View style={{ flex: 1 }} />
          </View>
        )}

        {showGPS && (
          <GPSTrackerModal
            quest={quest}
            onClose={() => setShowGPS(false)}
            onComplete={() => { setShowGPS(false); handleComplete() }}
            C={C}
          />
        )}


        {showMission && (
          <MissionActiveScreen
            quest={quest}
            onClose={() => setShowMission(false)}
            onComplete={handleMissionComplete}
            initialElapsed={timer ? (timer.accumulatedMs + (timer.isPaused ? 0 : Date.now() - timer.startTime)) : 0}
            initialPaused={timer?.isPaused}
            targetSeconds={quest.type === 'focus' ? (quest.focusDuration ? quest.focusDuration / 1000 : 30 * 60) : undefined}
            C={C}
          />
        )}


        <CustomModal
          visible={confirmUndo}
          title="DESFAZER MISSÃO"
          message={`Reverter a conclusão de "${quest.label}"?\nO XP e Gold ganhos serão deduzidos.`}
          confirmLabel="DESFAZER"
          confirmIcon="undo-variant"
          confirmColor={C.neonRed}
          onConfirm={() => { setConfirmUndo(false); undoQuest?.(quest.id) }}
          onCancel={() => setConfirmUndo(false)}
          C={C}
        />

        {/* Indicador de Classe */}
        <View style={{ position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: (quest.rank ? RANK_COLORS[quest.rank] : '#94a3b8') + (quest.done ? '88' : ''), fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
            {quest.rank || 'E'}-RANK
          </Text>
        </View>
      </Container>


      {/* Reroll extra quest Modal */}
      {isExtra && replaceExtraQuest && (
        <CustomModal
          visible={showExtraRegenConfirm}
          title="SUBSTITUIR MISSÃO EXTRA"
          message={extraRegenMsg || `Queres substituir esta missão extra por outra da pool?\nCada extra só pode ser substituída uma vez por dia.`}
          confirmLabel={extraRegenMsg ? "OK" : "SUBSTITUIR"}
          confirmIcon={extraRegenMsg ? "check" : "refresh"}
          confirmColor={extraRegenMsg ? C.neonRed : C.gold}
          onConfirm={() => {
            if (extraRegenMsg) {
              setExtraRegenMsg(null)
              setShowExtraRegenConfirm(false)
              return
            }
            const res = replaceExtraQuest(quest.id)
            if (!res.success && res.reason) {
              setExtraRegenMsg(res.reason)
            } else {
              setShowExtraRegenConfirm(false)
            }
          }}
          cancelLabel={extraRegenMsg ? undefined : "CANCELAR"}
          onCancel={() => { setShowExtraRegenConfirm(false); setExtraRegenMsg(null) }}
          C={C}
        />
      )}

      {/* Reroll single quest Modal */}
      {!isExtra && regenerateSingleDailyQuest && (
        <CustomModal
          visible={showRegenConfirm}
          title="TROCAR MISSÃO"
          message={`Queres trocar esta missão por outra aleatória?\nRestam-te ${Math.max(0, 7 - weeklyRegenCount)} de 7 trocas semanais.`}
          confirmLabel="TROCAR"
          onConfirm={() => {
            setShowRegenConfirm(false)
            regenerateSingleDailyQuest(quest.id)
          }}
          cancelLabel="CANCELAR"
          onCancel={() => setShowRegenConfirm(false)}
          C={C}
        />
      )}
    </>
  )
}
