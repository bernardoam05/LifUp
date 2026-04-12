import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme, SPACING, FONT } from '../../theme';
import { getIntensityOptions } from '../../data/settingsConfig';
import { PunishmentIntensity } from '../../store/useGameStore';

interface IntensitySettingsProps {
  currentIntensity: PunishmentIntensity
  onIntensityChange: (intensity: PunishmentIntensity) => void
  customPenaltyStartHour: number
  onCustomPenaltyStartHourChange: (value: number) => void
  customPenaltyEndHour: number
  onCustomPenaltyEndHourChange: (value: number) => void
}

const IntensitySettings = ({
  currentIntensity,
  onIntensityChange,
  customPenaltyStartHour,
  onCustomPenaltyStartHourChange,
  customPenaltyEndHour,
  onCustomPenaltyEndHourChange,
}: IntensitySettingsProps) => {
  const C = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { t } = useTranslation('settings');
  const INTENSITY_OPTIONS = React.useMemo(() => getIntensityOptions(C), [C]);
  const clampStart = (v: number) => Math.min(Math.max(v, 0), customPenaltyEndHour - 1);
  const clampEnd = (v: number) => Math.min(Math.max(v, customPenaltyStartHour + 1), 24);

  const current = INTENSITY_OPTIONS.find(o => o.value === currentIntensity) ?? INTENSITY_OPTIONS[1];

  return (
    <View>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: C.neonRed }]} />
        <Text style={s.sectionTitle}>{t('intensity.sectionTitle')}</Text>
      </View>

      <View style={s.intensityInfo}>
        <Icon name="information-outline" size={12} color={C.muted} />
        <Text style={s.intensityInfoTxt}>
          {' '}{t('intensity.infoText')}
        </Text>
      </View>

      {INTENSITY_OPTIONS.map(opt => {
        const active = currentIntensity === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.intensityCard, active && { borderColor: opt.color, backgroundColor: opt.color + '0d' }]}
            onPress={() => onIntensityChange(opt.value)}
            activeOpacity={0.8}
          >
            <View style={s.intensityCardHeader}>
              <View style={[s.intensityIconWrap, { backgroundColor: opt.color + '18', borderColor: opt.color + '44' }]}>
                <Icon name={opt.icon} size={20} color={active ? opt.color : C.dimmed} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.intensityLabel, { color: active ? opt.color : C.muted }]}>
                  {t(`intensity.${opt.value}.label`, { defaultValue: opt.label })}
                </Text>
                <Text style={s.intensitySublabel}>
                  {t(`intensity.${opt.value}.sublabel`, { defaultValue: opt.sublabel })}
                </Text>
              </View>
              {active ? (
                <Icon name="radiobox-marked" size={20} color={opt.color} />
              ) : (
                <Icon name="radiobox-blank" size={20} color={C.border} />
              )}
            </View>

            <View style={s.intensityDesc}>
              {opt.description.map((_line: string, i: number) => (
                <Text key={i} style={[s.intensityDescLine, active && { color: C.muted }]}>
                  {t(`intensity.${opt.value}.desc${i}`, { defaultValue: _line })}
                </Text>
              ))}
            </View>
            {opt.value === 'custom' && active && (
              <View style={[s.customRow, { flexDirection: 'column', alignItems: 'stretch' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                  <Text style={s.customLabel}>{t('intensity.blockStart')}</Text>
                  <View style={s.customStepper}>
                    <TouchableOpacity style={s.stepBtn} onPress={() => onCustomPenaltyStartHourChange(clampStart(customPenaltyStartHour - 1))}>
                      <Icon name="minus" size={16} color={C.neonBlue} />
                    </TouchableOpacity>
                    <View style={s.stepValue}><Text style={s.stepValueTxt}>{String(clampStart(customPenaltyStartHour)).padStart(2, '0')}:00</Text></View>
                    <TouchableOpacity style={s.stepBtn} onPress={() => onCustomPenaltyStartHourChange(clampStart(customPenaltyStartHour + 1))}>
                      <Icon name="plus" size={16} color={C.neonBlue} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Text style={s.customLabel}>{t('intensity.blockEnd')}</Text>
                  <View style={s.customStepper}>
                    <TouchableOpacity style={s.stepBtn} onPress={() => onCustomPenaltyEndHourChange(clampEnd(customPenaltyEndHour - 1))}>
                      <Icon name="minus" size={16} color={C.neonBlue} />
                    </TouchableOpacity>
                    <View style={s.stepValue}><Text style={s.stepValueTxt}>{String(clampEnd(customPenaltyEndHour)).padStart(2, '0')}:00</Text></View>
                    <TouchableOpacity style={s.stepBtn} onPress={() => onCustomPenaltyEndHourChange(clampEnd(customPenaltyEndHour + 1))}>
                      <Icon name="plus" size={16} color={C.neonBlue} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}

      <View style={[s.activeSummary, { borderColor: current.color + '44' }]}>
        <Icon name="check-decagram" size={12} color={current.color} />
        <Text style={[s.activeSummaryTxt, { color: current.color }]}>
          {' '}{t('intensity.activeProfile', {
            label: t(`intensity.${current.value}.label`, { defaultValue: current.label }),
            sublabel: t(`intensity.${current.value}.sublabel`, { defaultValue: current.sublabel }),
          })}
        </Text>
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

  intensityCard:       { backgroundColor: C.panel, borderRadius: 8, borderWidth: 1, borderColor: C.border + '66', padding: SPACING.md, marginBottom: SPACING.sm },
  intensityCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  intensityIconWrap:   { width: 40, height: 40, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  intensityLabel:      { fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  intensitySublabel:   { color: C.dimmed, fontSize: 10, marginTop: 2 },
  intensityDesc:       { paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: C.border, gap: 3 },
  intensityDescLine:   { color: C.dimmed, fontSize: 11, lineHeight: 17 },

  activeSummary:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderRadius: 4, padding: SPACING.sm, marginTop: SPACING.sm },
  activeSummaryTxt: { fontSize: 12, flex: 1 },

  customRow: { marginTop: SPACING.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  customLabel: { color: C.muted, fontSize: 11, fontFamily: FONT.orbitron, letterSpacing: 1 },
  customStepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 28, height: 28, borderRadius: 4, borderWidth: 1, borderColor: C.border + '66', alignItems: 'center', justifyContent: 'center' },
  stepValue: { minWidth: 40, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: C.border + '66', backgroundColor: C.bg },
  stepValueTxt: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '900' },
});

export default IntensitySettings;
