import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme, SPACING, FONT } from '../../theme';
import { APP_THEMES } from '../../data/themes';

interface ThemeSettingsProps {
  activeThemeId: string
  unlockedThemes: string[]
  onThemeChange: (themeId: string) => void
}

const ThemeSettings = ({
  activeThemeId,
  unlockedThemes,
  onThemeChange,
}: ThemeSettingsProps) => {
  const C = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);

  return (
    <View>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: C.purple }]} />
        <Text style={s.sectionTitle}>ASPETO DO SISTEMA</Text>
      </View>

      <View style={s.intensityInfo}>
        <Icon name="palette-outline" size={12} color={C.muted} />
        <Text style={s.intensityInfoTxt}>
          {' '}Seleciona o tema visual do teu Sistema de Monarca.
          Novos temas são desbloqueados ao subir de Classe ou na Loja.
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true} style={s.themeScroll}>
        {APP_THEMES.map(theme => {
          const isUnlocked = unlockedThemes.includes(theme.id);
          const isActive = activeThemeId === theme.id;

          if (!isUnlocked) {return null;}

          return (
            <TouchableOpacity
              key={theme.id}
              style={[
                s.themeCard,
                { borderColor: theme.colors.neonBlue + (isActive ? 'ff' : '44') },
                isActive && { backgroundColor: theme.colors.neonBlue + '11' },
              ]}
              onPress={() => onThemeChange(theme.id)}
            >
              <View style={[s.themePreview, { backgroundColor: theme.colors.bg }]}>
                <View style={[s.themePreviewAccent, { backgroundColor: theme.colors.neonBlue }]} />
              </View>
              <Text style={[s.themeName, { color: isActive ? theme.colors.neonBlue : C.muted }]}>
                {theme.name.replace(' (Standard)', '').replace(' (Premium)', '')}
              </Text>
              {isActive && <Icon name="check-circle" size={12} color={theme.colors.neonBlue} style={s.themeCheck} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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

  themeScroll: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  themeCard: {
    width: 100,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
  },
  themePreview: {
    width: '100%',
    height: 40,
    borderRadius: 2,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#ffffff10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePreviewAccent: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  themeName: {
    fontFamily: FONT.orbitron,
    fontSize: 7,
    textAlign: 'center',
    fontWeight: '700',
  },
  themeCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});

export default ThemeSettings;
