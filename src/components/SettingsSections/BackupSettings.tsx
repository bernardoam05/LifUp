import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme, SPACING, FONT } from '../../theme';

interface BackupSettingsProps {
  onExport: () => void
  onImport: () => void
}

const BackupSettings = ({
  onExport,
  onImport,
}: BackupSettingsProps) => {
  const C = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { t } = useTranslation('settings');

  return (
    <View>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: C.gold }]} />
        <Text style={s.sectionTitle}>{t('backup.sectionTitle')}</Text>
      </View>

      <View style={s.intensityInfo}>
        <Icon name="information-outline" size={12} color={C.muted} />
        <Text style={s.intensityInfoTxt}>
          {' '}{t('backup.infoText')}
        </Text>
      </View>

      <View style={{ gap: SPACING.sm, marginBottom: SPACING.lg }}>
        <TouchableOpacity style={[s.collectBtn, { borderColor: C.neonBlue }]} onPress={onExport} activeOpacity={0.8}>
          <Icon name="upload" size={16} color={C.neonBlue} style={{ marginRight: 6 }} />
          <Text style={[s.collectTxt, { color: C.neonBlue }]}> {t('backup.exportBtn')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.collectBtn, { borderColor: C.gold }]} onPress={onImport} activeOpacity={0.8}>
          <Icon name="download" size={16} color={C.gold} style={{ marginRight: 6 }} />
          <Text style={[s.collectTxt, { color: C.gold }]}> {t('backup.importBtn')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (C: any) => StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border + '44',
  },
  sectionDot:    {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionTitle:  {
    color: C.neonBlue,
    fontFamily: FONT.orbitron,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '900',
  },

  intensityInfo:    {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border + '66',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  intensityInfoTxt: { flex: 1, color: C.dimmed, fontSize: 10, lineHeight: 16 },

  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  collectTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});

export default BackupSettings;
