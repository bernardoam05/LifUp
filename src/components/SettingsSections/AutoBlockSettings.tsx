import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme, SPACING, FONT } from '../../theme';

interface AutoBlockSettingsProps {
  autoBlockApps: boolean
  onToggle: (enabled: boolean) => void
}

const AutoBlockSettings = ({
  autoBlockApps,
  onToggle,
}: AutoBlockSettingsProps) => {
  const C = useTheme();
  const { t } = useTranslation('settings');
  const s = React.useMemo(() => getStyles(C), [C]);

  return (
    <View style={s.container}>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: C.neonRed }]} />
        <Text style={[s.sectionTitle, { color: C.neonRed }]}>{t('autoBlock.sectionTitle')}</Text>
      </View>

      <View style={s.infoCard}>
        <Icon name="shield-lock" size={24} color={C.neonRed} style={s.infoIcon} />
        <View style={s.infoTextContent}>
          <Text style={s.infoTitle}>{t('autoBlock.cardTitle')}</Text>
          <Text style={s.infoDesc}>{t('autoBlock.cardDesc')}</Text>
          <View style={s.bulletPoints}>
            <Text style={s.bulletPoint}>• <Text style={s.highlightLight}>{t('autoBlock.bulletEasy')}</Text> {t('autoBlock.bulletEasyDetail')}</Text>
            <Text style={s.bulletPoint}>• <Text style={s.highlightNormal}>{t('autoBlock.bulletNormal')}</Text> {t('autoBlock.bulletNormalDetail')}</Text>
            <Text style={s.bulletPoint}>• <Text style={s.highlightHard}>{t('autoBlock.bulletHardcore')}</Text> {t('autoBlock.bulletHardcoreDetail')}</Text>
          </View>
        </View>
      </View>

      <View style={s.toggleRow}>
        <View style={s.toggleLabelContainer}>
          <Text style={s.toggleTitle}>{t('autoBlock.toggleTitle')}</Text>
          <Text style={s.toggleSub}>{t('autoBlock.toggleSub')}</Text>
        </View>
        <Switch
          trackColor={{ false: C.surface.elevated, true: C.neonRed }}
          thumbColor="#ffffff"
          ios_backgroundColor={C.surface.elevated}
          onValueChange={onToggle}
          value={autoBlockApps}
        />
      </View>
    </View>
  );
};

const getStyles = (C: any) => StyleSheet.create({
  container: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: C.border + '44',
  },
  sectionDot: {
    width: 3,
    height: 16,
    borderRadius: 2,
  },
  sectionTitle: {
    fontFamily: FONT.orbitron,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '900',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: C.surface.elevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoIcon: {
    marginRight: SPACING.md,
    marginTop: 2,
  },
  infoTextContent: {
    flex: 1,
  },
  infoTitle: {
    color: C.text.primary,
    fontFamily: FONT.orbitron,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  infoDesc: {
    color: C.text.secondary,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  bulletPoints: {
    gap: 2,
  },
  bulletPoint: {
    color: C.text.secondary,
    fontSize: 11,
  },
  highlightLight: {
    color: C.green,
    fontFamily: FONT.orbitron,
    fontWeight: '700',
  },
  highlightNormal: {
    color: C.gold,
    fontFamily: FONT.orbitron,
    fontWeight: '700',
  },
  highlightHard: {
    color: C.neonRed,
    fontFamily: FONT.orbitron,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.panel,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border + '66',
  },
  toggleLabelContainer: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  toggleTitle: {
    color: C.text.primary,
    fontFamily: FONT.orbitron,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  toggleSub: {
    color: C.dimmed,
    fontSize: 10,
  },
});

export default AutoBlockSettings;
