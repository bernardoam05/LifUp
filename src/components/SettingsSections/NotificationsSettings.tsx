import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme, SPACING, FONT } from '../../theme';

interface NotificationsSettingsProps {
  notifications: boolean
  sound: boolean
  onNotificationsChange: (value: boolean) => void
  onSoundChange: (value: boolean) => void
}

const NotificationsSettings = ({
  notifications,
  sound,
  onNotificationsChange,
  onSoundChange,
}: NotificationsSettingsProps) => {
  const C = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);
  const { t } = useTranslation('settings');

  return (
    <View>
      <View style={s.sectionHeader}>
        <View style={[s.sectionDot, { backgroundColor: C.neonBlue }]} />
        <Text style={s.sectionTitle}>{t('notifications.sectionTitle')}</Text>
      </View>

      <View style={s.row}>
        <Icon name="bell-outline" size={18} color={C.neonBlue} />
        <View style={s.rowInfo}>
          <Text style={s.rowLabel}>{t('notifications.notificationsLabel')}</Text>
          <Text style={s.rowSub}>{t('notifications.notificationsSub')}</Text>
        </View>
        <Switch
          value={notifications}
          onValueChange={onNotificationsChange}
          trackColor={{ false: C.border, true: C.neonBlue + '55' }}
          thumbColor={notifications ? C.neonBlue : C.dimmed}
        />
      </View>

      <View style={[s.row, { borderBottomWidth: 0 }]}>
        <Icon name="volume-high" size={18} color={C.neonBlue} />
        <View style={s.rowInfo}>
          <Text style={s.rowLabel}>{t('notifications.soundLabel')}</Text>
          <Text style={s.rowSub}>{t('notifications.soundSub')}</Text>
        </View>
        <Switch
          value={sound}
          onValueChange={onSoundChange}
          trackColor={{ false: C.border, true: C.neonBlue + '55' }}
          thumbColor={sound ? C.neonBlue : C.dimmed}
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

  row:       {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border + '66',
    borderRadius: 8,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  rowInfo:   { flex: 1 },
  rowLabel:  { color: C.muted, fontSize: 13, fontWeight: '700' },
  rowSub:    { color: C.dimmed, fontSize: 10, marginTop: 3 },
});

export default NotificationsSettings;
