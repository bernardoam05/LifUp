import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, SPACING, FONT } from '../../theme';

const AboutSettings = () => {
  const C = useTheme();
  const { t } = useTranslation('settings');
  const s = React.useMemo(() => getStyles(C), [C]);

  return (
    <View>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: C.dimmed }]} />
        <Text style={s.sectionTitle}>{t('about.sectionTitle')}</Text>
      </View>

      <View style={s.aboutCard}>
        <Text style={s.aboutLine}>
          <Text style={s.aboutKey}>{t('about.version')} </Text>
          <Text style={s.aboutVal}>{t('about.versionVal')}</Text>
        </Text>
        <Text style={s.aboutLine}>
          <Text style={s.aboutKey}>{t('about.missionEngine')} </Text>
          <Text style={s.aboutVal}>{t('about.missionEngineVal')}</Text>
        </Text>
        <Text style={s.aboutLine}>
          <Text style={s.aboutKey}>{t('about.persistence')} </Text>
          <Text style={s.aboutVal}>{t('about.persistenceVal')}</Text>
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

  aboutCard:  { backgroundColor: C.panel, borderRadius: 8, borderWidth: 1, borderColor: C.border + '66', padding: SPACING.md, gap: 6 },
  aboutLine:  { fontSize: 12 },
  aboutKey:   { color: C.dimmed },
  aboutVal:   { color: C.muted },
});

export default AboutSettings;
