import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme, SPACING, FONT } from '../../theme';

interface SideQuestPenaltySettingsProps {
  sideQuestPenalize: boolean
  onToggle: (value: boolean) => void
}

const SideQuestPenaltySettings = ({
  sideQuestPenalize,
  onToggle,
}: SideQuestPenaltySettingsProps) => {
  const C = useTheme();
  const { t } = useTranslation('settings');
  const s = React.useMemo(() => getStyles(C), [C]);

  return (
    <View>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: C.purple }]} />
        <Text style={s.sectionTitle}>{t('sideQuestPenalty.sectionTitle')}</Text>
      </View>

      <View style={s.infoBox}>
        <Icon name="information-outline" size={12} color={C.muted} />
        <Text style={s.infoTxt}>{' '}{t('sideQuestPenalty.infoText')}</Text>
      </View>

      <View style={[s.row, { borderColor: sideQuestPenalize ? C.neonRed + '44' : C.border, backgroundColor: sideQuestPenalize ? C.neonRed + '08' : C.panel }]}>
        <Icon name="format-list-checks" size={18} color={sideQuestPenalize ? C.neonRed : C.dimmed} />
        <View style={s.rowInfo}>
          <Text style={[s.rowLabel, { color: sideQuestPenalize ? C.neonRed : C.muted }]}>
            {t('sideQuestPenalty.rowLabel')}
          </Text>
          <Text style={s.rowSub}>
            {sideQuestPenalize
              ? t('sideQuestPenalty.rowSubActive')
              : t('sideQuestPenalty.rowSubInactive')}
          </Text>
        </View>
        <Switch
          value={sideQuestPenalize}
          onValueChange={onToggle}
          trackColor={{ false: C.border, true: C.neonRed + '55' }}
          thumbColor={sideQuestPenalize ? C.neonRed : C.dimmed}
        />
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
  sectionDot: { width: 3, height: 16, borderRadius: 2 },
  sectionTitle: {
    color: C.neonBlue,
    fontFamily: FONT.orbitron,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '900',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.panel,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border + '66',
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoTxt: { flex: 1, color: C.dimmed, fontSize: 10, lineHeight: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 13, fontWeight: '600' },
  rowSub: { color: C.dimmed, fontSize: 11, marginTop: 2 },
});

export default SideQuestPenaltySettings;
