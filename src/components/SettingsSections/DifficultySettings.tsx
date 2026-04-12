import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme, SPACING, FONT } from '../../theme';
import { getDifficultyOptions } from '../../data/settingsConfig';
import { MissionDifficulty } from '../../store/useGameStore';

interface DifficultySettingsProps {
  currentDifficulty: MissionDifficulty
  onDifficultyChange: (difficulty: MissionDifficulty) => void
  customDailyMissions: number
  onCustomDailyMissionsChange: (value: number) => void
}

const DifficultySettings = ({
  currentDifficulty,
  onDifficultyChange,
  customDailyMissions,
  onCustomDailyMissionsChange,
}: DifficultySettingsProps) => {
  const C = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { t } = useTranslation('settings');
  const DIFFICULTY_OPTIONS = React.useMemo(() => getDifficultyOptions(C), [C]);
  const clampCustom = (v: number) => Math.min(Math.max(v, 1), 10);

  return (
    <View>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: C.neonBlue }]} />
        <Text style={s.sectionTitle}>{t('difficulty.sectionTitle')}</Text>
      </View>

      <View style={s.intensityInfo}>
        <Icon name="information-outline" size={12} color={C.muted} />
        <Text style={s.intensityInfoTxt}>
          {' '}{t('difficulty.infoText')}
        </Text>
      </View>

      {DIFFICULTY_OPTIONS.map(opt => {
        const active = currentDifficulty === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.intensityCard, active && { borderColor: opt.color, backgroundColor: opt.color + '0d' }]}
            onPress={() => onDifficultyChange(opt.value)}
            activeOpacity={0.8}
          >
            <View style={s.intensityCardHeader}>
              <View style={[s.intensityIconWrap, { backgroundColor: opt.color + '18', borderColor: opt.color + '44' }]}>
                <Icon name={opt.icon} size={20} color={active ? opt.color : C.dimmed} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.intensityLabel, { color: active ? opt.color : C.muted }]}>
                  {t(`difficulty.${opt.value}.label`, { defaultValue: opt.label })}
                </Text>
                <Text style={s.intensitySublabel}>
                  {t(`difficulty.${opt.value}.sublabel`, { defaultValue: opt.sublabel })}
                </Text>
              </View>
              {active
                ? <Icon name="radiobox-marked" size={20} color={opt.color} />
                : <Icon name="radiobox-blank"  size={20} color={C.border} />}
            </View>
            <View style={s.intensityDesc}>
              {opt.description.map((_line: string, i: number) => (
                <Text key={i} style={[s.intensityDescLine, active && { color: C.muted }]}>
                  {t(`difficulty.${opt.value}.desc${i}`, { defaultValue: _line })}
                </Text>
              ))}
            </View>
            {opt.value === 'custom' && active && (
              <View style={s.customRow}>
                <Text style={s.customLabel}>{t('difficulty.customLabel')}</Text>
                <View style={s.customStepper}>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() => onCustomDailyMissionsChange(clampCustom(customDailyMissions - 1))}
                  >
                    <Icon name="minus" size={16} color={C.neonBlue} />
                  </TouchableOpacity>
                  <View style={s.stepValue}>
                    <Text style={s.stepValueTxt}>{clampCustom(customDailyMissions)}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() => onCustomDailyMissionsChange(clampCustom(customDailyMissions + 1))}
                  >
                    <Icon name="plus" size={16} color={C.neonBlue} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
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

  intensityCard:       { backgroundColor: C.panel, borderRadius: 8, borderWidth: 1, borderColor: C.border + '66', padding: SPACING.md, marginBottom: SPACING.sm },
  intensityCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  intensityIconWrap:   { width: 40, height: 40, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  intensityLabel:      { fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  intensitySublabel:   { color: C.dimmed, fontSize: 10, marginTop: 2 },
  intensityDesc:       { paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: C.border, gap: 3 },
  intensityDescLine:   { color: C.dimmed, fontSize: 11, lineHeight: 17 },

  customRow: { marginTop: SPACING.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customLabel: { color: C.muted, fontSize: 11, fontFamily: FONT.orbitron, letterSpacing: 1 },
  customStepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 28, height: 28, borderRadius: 4, borderWidth: 1, borderColor: C.border + '66', alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 36, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: C.border + '66', backgroundColor: C.bg },
  stepValueTxt: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '900' },
});

export default DifficultySettings;
