import React from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import Clipboard from '@react-native-clipboard/clipboard'
import useGameStore from '../store/useGameStore'
import SystemAlertModal from '../components/SystemAlertModal'
import { useTheme, FONT, SPACING } from '../theme'

// Settings sections
import NotificationsSettings from '../components/SettingsSections/NotificationsSettings'
import ThemeSettings from '../components/SettingsSections/ThemeSettings'
import IntensitySettings from '../components/SettingsSections/IntensitySettings'
import DifficultySettings from '../components/SettingsSections/DifficultySettings'
import RestDaySettings from '../components/SettingsSections/RestDaySettings'
import BackupSettings from '../components/SettingsSections/BackupSettings'
import AboutSettings from '../components/SettingsSections/AboutSettings'
import ImportModal from '../components/SettingsSections/ImportModal'

// Utilities
import { btoa, atob } from '../utils/backup'

// ── Settings Screen ────────────────────────────────────────────────────────────

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const C = useTheme()
  const s = React.useMemo(() => getStyles(C), [C])

  const player         = useGameStore(s => s.player)
  const settings       = useGameStore(s => s.settings)
  const updateSettings = useGameStore(s => s.updateSettings)
  const setActiveTheme = useGameStore(s => s.setActiveTheme)

  const [alertConfig, setAlertConfig] = React.useState<{ title: string; message: string } | null>(null)
  const [importVisible, setImportVisible] = React.useState(false)
  const [importText, setImportText] = React.useState('')

  const handleExport = () => {
    try {
      const state = useGameStore.getState()
      const payload = {
        player: state.player,
        system: state.system,
        statistics: state.statistics,
        unlockedAchievements: state.unlockedAchievements,
        achievementProgress: state.achievementProgress,
        customShadows: state.customShadows,
        quests: state.quests,
        extraQuests: state.extraQuests,
        sideQuests: state.sideQuests,
        questDictionary: state.questDictionary,
        questRecords: state.questRecords,
        questCompletions: state.questCompletions,
        extraQuestRerolledIds: state.extraQuestRerolledIds,
        extraQuestUsedPoolIds: state.extraQuestUsedPoolIds,
        lastResetDate: state.lastResetDate,
        activeMissionTimers: state.activeMissionTimers,
      }
      const json = JSON.stringify(payload)
      const b64 = btoa(json)
      Clipboard.setString(b64)
      setAlertConfig({ 
        title: 'BACKUP CONCLUÍDO', 
        message: 'Código de Backup copiado para a área de transferência! Guarda este código num local seguro.' 
      })
    } catch (err) {
      console.error('Backup export error:', err)
      setAlertConfig({ title: 'ERRO', message: 'Falha ao exportar backup. Tenta novamente.' })
    }
  }

  const handleImport = () => {
    try {
      if (!importText.trim()) return
      const json = atob(importText.trim())
      const data = JSON.parse(json)
      
      // Validação básica de integridade
      if (!data.player || typeof data.player !== 'object') {
        throw new Error('Estrutura de backup inválida')
      }
      if (typeof data.player.level !== 'number' || data.player.level < 1) {
        throw new Error('Dados de player corrompidos')
      }
      
      useGameStore.getState().restoreBackup(data)
      setImportVisible(false)
      setImportText('')
      setAlertConfig({ 
        title: 'RESTAURO CONCLUÍDO', 
        message: 'Alma importada com sucesso! Podes precisar de reiniciar se houver bugs visuais.' 
      })
    } catch (err) {
      console.error('Backup import error:', err)
      setAlertConfig({ 
        title: 'ERRO', 
        message: 'Código inválido ou corrompido. Verifica se copiaste bem.' 
      })
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={s.header}>
          <Icon name="cog" size={16} color={C.neonBlue} />
          <Text style={s.headerTxt}> [ DEFINIÇÕES DO SISTEMA ]</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Icon name="close" size={20} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content}>
          {/* ────── Gameplay Settings ────── */}
          <View style={s.sectionGroup}>
            <Text style={s.groupTitle}>⚔ GAMEPLAY</Text>
            <View style={s.groupContent}>
              <NotificationsSettings
                notifications={settings.notifications}
                sound={settings.sound}
                onNotificationsChange={v => updateSettings({ notifications: v })}
                onSoundChange={v => updateSettings({ sound: v })}
              />
            </View>
          </View>

          {/* ────── Experience & Appearance ────── */}
          <View style={[s.sectionGroup, { marginTop: SPACING.xl }]}>
            <Text style={s.groupTitle}>✨ EXPERIÊNCIA & VISUAL</Text>
            <View style={s.groupContent}>
              <View style={s.subsection}>
                <ThemeSettings
                  activeThemeId={player.activeThemeId}
                  unlockedThemes={player.unlockedThemes || ['theme_e_rank']}
                  onThemeChange={setActiveTheme}
                />
              </View>
              <View style={[s.subsection, { borderTopWidth: 1, borderTopColor: C.border + '22' }]}>
                <IntensitySettings
                  currentIntensity={settings.punishmentIntensity}
                  onIntensityChange={v => updateSettings({ punishmentIntensity: v })}
                />
              </View>
            </View>
          </View>

          {/* ────── Challenge Settings ────── */}
          <View style={[s.sectionGroup, { marginTop: SPACING.xl }]}>
            <Text style={s.groupTitle}>⚡ DESAFIOS</Text>
            <View style={s.groupContent}>
              <View style={s.subsection}>
                <DifficultySettings
                  currentDifficulty={settings.missionDifficulty}
                  onDifficultyChange={v => updateSettings({ missionDifficulty: v })}
                />
              </View>
              <View style={[s.subsection, { borderTopWidth: 1, borderTopColor: C.border + '22' }]}>
                <RestDaySettings
                  restDay={settings.restDay}
                  onRestDayChange={v => updateSettings({ restDay: v })}
                />
              </View>
            </View>
          </View>

          {/* ────── Data & System ────── */}
          <View style={[s.sectionGroup, { marginTop: SPACING.xl }]}>
            <Text style={s.groupTitle}>💾 DADOS & SISTEMA</Text>
            <View style={s.groupContent}>
              <BackupSettings
                onExport={handleExport}
                onImport={() => setImportVisible(true)}
              />
            </View>
          </View>

          {/* ────── About ────── */}
          <View style={[s.sectionGroup, { marginTop: SPACING.xl, marginBottom: SPACING.xl }]}>
            <Text style={s.groupTitle}>ℹ SOBRE</Text>
            <View style={s.groupContent}>
              <AboutSettings />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* ── Alerts & Modals ── */}
      {alertConfig && (
        <SystemAlertModal
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={() => setAlertConfig(null)}
          buttons={[{ text: 'ENTENDIDO', style: 'default' }]}
          C={C}
        />
      )}

      <ImportModal
        visible={importVisible}
        value={importText}
        onValueChange={setImportText}
        onImport={handleImport}
        onCancel={() => setImportVisible(false)}
      />
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTxt: { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 3 },
  closeBtn: { padding: 6 },
  content: { padding: SPACING.md, paddingBottom: 40 },
  
  sectionGroup: {
    backgroundColor: C.panel + '44',
    borderWidth: 1,
    borderColor: C.border + '66',
    borderRadius: 12,
    padding: SPACING.md,
    overflow: 'hidden',
  },
  groupTitle: {
    color: C.neonBlue,
    fontFamily: FONT.orbitron,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.neonBlue + '33',
  },
  groupContent: {
    gap: 0,
  },
  subsection: {
    paddingVertical: SPACING.sm,
  },
})
