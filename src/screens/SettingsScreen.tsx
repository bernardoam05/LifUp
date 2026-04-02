import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Clipboard from '@react-native-clipboard/clipboard';
import useGameStore from '../store/useGameStore';
import SystemAlertModal from '../components/SystemAlertModal';
import { useTheme, FONT, SPACING } from '../theme';

// Settings sections
import NotificationsSettings from '../components/SettingsSections/NotificationsSettings';
import ThemeSettings from '../components/SettingsSections/ThemeSettings';
import IntensitySettings from '../components/SettingsSections/IntensitySettings';
import DifficultySettings from '../components/SettingsSections/DifficultySettings';
import RestDaySettings from '../components/SettingsSections/RestDaySettings';
import AutoBlockSettings from '../components/SettingsSections/AutoBlockSettings';
import SideQuestPenaltySettings from '../components/SettingsSections/SideQuestPenaltySettings';
import BackupSettings from '../components/SettingsSections/BackupSettings';
import AboutSettings from '../components/SettingsSections/AboutSettings';
import ImportModal from '../components/SettingsSections/ImportModal';

// Utilities
import { btoa, atob } from '../utils/backup';

// ── Settings Screen ────────────────────────────────────────────────────────────

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const C = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);

  const player         = useGameStore(st => st.player);
  const settings       = useGameStore(st => st.settings);
  const updateSettings = useGameStore(st => st.updateSettings);
  const setActiveTheme = useGameStore(st => st.setActiveTheme);

  const [alertConfig, setAlertConfig] = React.useState<{ title: string; message: string } | null>(null);
  const [importVisible, setImportVisible] = React.useState(false);
  const [importText, setImportText] = React.useState('');

  const handleExport = () => {
    try {
      const state = useGameStore.getState();
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
      };
      const json = JSON.stringify(payload);
      const b64 = btoa(json);
      Clipboard.setString(b64);
      setAlertConfig({
        title: 'BACKUP CONCLUÍDO',
        message: 'Código de Backup copiado para a área de transferência! Guarda este código num local seguro.',
      });
    } catch (err) {
      console.error('Backup export error:', err);
      setAlertConfig({ title: 'ERRO', message: 'Falha ao exportar backup. Tenta novamente.' });
    }
  };

  const handleImport = () => {
    try {
      if (!importText.trim()) {return;}
      const json = atob(importText.trim());
      const data = JSON.parse(json);
      if (!data.player || typeof data.player !== 'object') {throw new Error('Estrutura de backup inválida');}
      if (typeof data.player.level !== 'number' || data.player.level < 1) {throw new Error('Dados de player corrompidos');}
      useGameStore.getState().restoreBackup(data);
      setImportVisible(false);
      setImportText('');
      setAlertConfig({
        title: 'RESTAURO CONCLUÍDO',
        message: 'Alma importada com sucesso! Podes precisar de reiniciar se houver bugs visuais.',
      });
    } catch (err) {
      console.error('Backup import error:', err);
      setAlertConfig({ title: 'ERRO', message: 'Código inválido ou corrompido. Verifica se copiaste bem.' });
    }
  };

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

        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* ── MISSÕES ─────────────────────────────────────────────────────── */}
          <View style={s.group}>
            <View style={s.groupHeader}>
              <Icon name="clipboard-list-outline" size={13} color={C.neonBlue} />
              <Text style={[s.groupTitle, { color: C.neonBlue }]}>MISSÕES</Text>
            </View>

            <View style={s.groupBody}>
              <View style={s.section}>
                <DifficultySettings
                  currentDifficulty={settings.missionDifficulty}
                  onDifficultyChange={v => updateSettings({ missionDifficulty: v })}
                  customDailyMissions={settings.customDailyMissions}
                  onCustomDailyMissionsChange={v => updateSettings({ customDailyMissions: v })}
                />
              </View>

              <View style={s.divider} />

              <View style={s.section}>
                <RestDaySettings
                  restDay={settings.restDay}
                  onRestDayChange={v => updateSettings({ restDay: v })}
                />
              </View>
            </View>
          </View>

          {/* ── PENALIDADES & BLOQUEIO ─────────────────────────────────────── */}
          <View style={[s.group, s.groupGap]}>
            <View style={s.groupHeader}>
              <Icon name="shield-alert-outline" size={13} color={C.neonRed} />
              <Text style={[s.groupTitle, { color: C.neonRed }]}>PENALIDADES & BLOQUEIO</Text>
            </View>

            <View style={s.groupBody}>
              <View style={s.section}>
                <IntensitySettings
                  currentIntensity={settings.punishmentIntensity}
                  onIntensityChange={v => updateSettings({ punishmentIntensity: v })}
                  customPenaltyHours={settings.customPenaltyHours}
                  onCustomPenaltyHoursChange={v => updateSettings({ customPenaltyHours: v })}
                />
              </View>

              <View style={s.divider} />

              <View style={s.section}>
                <AutoBlockSettings
                  autoBlockApps={settings.autoBlockApps}
                  onToggle={v => updateSettings({ autoBlockApps: v })}
                />
              </View>

              <View style={s.divider} />

              <View style={s.section}>
                <SideQuestPenaltySettings
                  sideQuestPenalize={settings.sideQuestPenalize ?? false}
                  onToggle={v => updateSettings({ sideQuestPenalize: v })}
                />
              </View>
            </View>
          </View>

          {/* ── VISUAL ───────────────────────────────────────────────────────── */}
          <View style={[s.group, s.groupGap]}>
            <View style={s.groupHeader}>
              <Icon name="palette-outline" size={13} color={C.purple} />
              <Text style={[s.groupTitle, { color: C.purple }]}>VISUAL</Text>
            </View>

            <View style={s.groupBody}>
              <View style={s.section}>
                <ThemeSettings
                  activeThemeId={player.activeThemeId}
                  unlockedThemes={player.unlockedThemes ?? ['theme_e_rank']}
                  onThemeChange={setActiveTheme}
                />
              </View>
            </View>
          </View>

          {/* ── SISTEMA ──────────────────────────────────────────────────────── */}
          <View style={[s.group, s.groupGap]}>
            <View style={s.groupHeader}>
              <Icon name="bell-outline" size={13} color={C.neonBlue} />
              <Text style={[s.groupTitle, { color: C.neonBlue }]}>SISTEMA</Text>
            </View>

            <View style={s.groupBody}>
              <View style={s.section}>
                <NotificationsSettings
                  notifications={settings.notifications}
                  sound={settings.sound}
                  onNotificationsChange={v => updateSettings({ notifications: v })}
                  onSoundChange={v => updateSettings({ sound: v })}
                />
              </View>
            </View>
          </View>

          {/* ── DADOS ────────────────────────────────────────────────────────── */}
          <View style={[s.group, s.groupGap]}>
            <View style={s.groupHeader}>
              <Icon name="database-outline" size={13} color={C.gold} />
              <Text style={[s.groupTitle, { color: C.gold }]}>DADOS</Text>
            </View>

            <View style={s.groupBody}>
              <View style={s.section}>
                <BackupSettings
                  onExport={handleExport}
                  onImport={() => setImportVisible(true)}
                />
              </View>
            </View>
          </View>

          {/* ── SOBRE ────────────────────────────────────────────────────────── */}
          <View style={[s.group, s.groupGap, { marginBottom: SPACING.xl }]}>
            <View style={s.groupHeader}>
              <Icon name="information-outline" size={13} color={C.muted} />
              <Text style={[s.groupTitle, { color: C.muted }]}>SOBRE</Text>
            </View>

            <View style={s.groupBody}>
              <View style={s.section}>
                <AboutSettings />
              </View>
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
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTxt: { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 3 },
  closeBtn: { padding: 6 },

  content: { padding: SPACING.md, paddingBottom: 40 },

  group: {
    borderWidth: 1,
    borderColor: C.border + '55',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: C.panel + '22',
  },
  groupGap: { marginTop: SPACING.md },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border + '33',
    backgroundColor: C.panel + '44',
  },
  groupTitle: {
    fontFamily: FONT.orbitron,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  groupBody: {},

  section: { padding: SPACING.md },
  divider: { height: 1, backgroundColor: C.border + '22', marginHorizontal: SPACING.md },
});
