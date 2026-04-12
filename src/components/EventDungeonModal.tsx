import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DungeonMission, EventWindow } from '../data/bosses';
import { SHADOW_MAP } from '../data/shadows';
import MissionModalBase from './MissionModalBase';
import { SPACING, FONT } from '../theme';

interface EventDungeonModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestClose?: () => void;
  onSelectMission: (m: DungeonMission) => void;
  eventTrials: DungeonMission[];
  eventBossMission: DungeonMission | null;
  eventProgress: { completedIds: string[]; required: number; defeated: boolean } | null;
  eventWindow: EventWindow | null;
  C: any;
}

export default function EventDungeonModal({
  visible,
  onClose,
  onRequestClose,
  onSelectMission,
  eventTrials,
  eventBossMission,
  eventProgress,
  eventWindow,
  C,
}: EventDungeonModalProps) {
  if (!eventProgress) {return null;}
  const ed = getEDStyles(C);
  const { t } = useTranslation('modals');

  return (
    <MissionModalBase
      visible={visible}
      onClose={onClose}
      onRequestClose={onRequestClose}
      iconName="calendar-star"
      iconColor={C.gold}
      warningText={t('event_dungeon.warning_text')}
      title={t('event_dungeon.title')}
      titleColor={C.gold}
      borderColor={C.gold + '88'}
      C={C}
    >
      {eventWindow && (
        <View style={[ed.eventWindowTag, { borderColor: C.gold + '66' }]}>
          <Text style={ed.eventWindowTxt}>
            {t('event_dungeon.available', { start: eventWindow.start, end: eventWindow.end })}
          </Text>
        </View>
      )}

      <View style={ed.eventHeader}>
        <Text style={ed.eventHeaderTxt}>{t('event_dungeon.trials_header')}</Text>
      </View>
      <Text style={ed.eventProgressTxt}>
        {t('event_dungeon.progress', { completed: eventProgress.completedIds.length, required: eventProgress.required })}
      </Text>

      <View style={{ width: '100%' }}>
        {eventTrials.map(m => {
          const completed = eventProgress.completedIds.includes(m.id);
          return (
            <TouchableOpacity
              key={m.id}
              style={[ed.missionBtn, { borderColor: m.color + '88', opacity: completed ? 0.3 : 1 }]}
              onPress={() => { if (!completed) { onSelectMission(m); } }}
              activeOpacity={0.7}
            >
              <View style={[ed.missionIcon, { backgroundColor: m.color + '22', borderColor: m.color + '66', borderWidth: 1 }]}>
                <Icon name={m.icon} size={20} color={m.color} />
              </View>
              <View style={ed.missionInfo}>
                <Text style={[ed.missionLabel, { color: m.color }]}>
                  {completed ? t('event_dungeon.trial_complete') : m.label}
                </Text>
                <Text style={ed.missionDetail}>{m.detail}</Text>
              </View>
              <Icon name={completed ? 'check-circle' : 'chevron-right'} size={18} color={completed ? C.green : m.color} />
            </TouchableOpacity>
          );
        })}

        <View style={[ed.eventHeader, { marginTop: SPACING.md }]}>
          <Text style={ed.eventHeaderTxt}>{t('event_dungeon.event_boss_header')}</Text>
        </View>

        {eventBossMission ? (
          <TouchableOpacity
            style={[ed.missionBtn, { borderColor: eventBossMission.color + '88', opacity: eventProgress.defeated ? 0.3 : 1 }]}
            onPress={() => { if (!eventProgress.defeated) { onSelectMission(eventBossMission); } }}
            activeOpacity={0.7}
          >
            <View style={[ed.missionIcon, { backgroundColor: eventBossMission.color + '22', borderColor: eventBossMission.color + '66', borderWidth: 1 }]}>
              <Icon name={eventBossMission.icon} size={20} color={eventBossMission.color} />
            </View>
            <View style={ed.missionInfo}>
              <Text style={[ed.missionLabel, { color: eventBossMission.color }]}>
                {eventProgress.defeated ? t('event_dungeon.event_concluded') : eventBossMission.label}
              </Text>
              <Text style={ed.missionDetail}>{eventBossMission.detail}</Text>
              {!eventProgress.defeated && (
                <View style={ed.shadowExtractTag}>
                  <Icon name="ghost" size={9} color={C.purple} />
                  <Text style={ed.shadowExtractTxt}>
                    {' '}{t('event_dungeon.shadow_label', {
                      name: SHADOW_MAP[eventBossMission.shadowHint as keyof typeof SHADOW_MAP]?.name
                        ?? eventBossMission.shadowHint
                        ?? t('event_dungeon.shadow_unknown'),
                    })}
                  </Text>
                </View>
              )}
            </View>
            <Icon name={eventProgress.defeated ? 'check-circle' : 'chevron-right'} size={18} color={eventProgress.defeated ? C.green : eventBossMission.color} />
          </TouchableOpacity>
        ) : (
          <Text style={ed.eventLockedTxt}>
            {t('event_dungeon.boss_locked')}
          </Text>
        )}
      </View>

      <TouchableOpacity style={ed.cancelBtn} onPress={onClose}>
        <Text style={ed.cancelTxt}>{t('event_dungeon.back')}</Text>
      </TouchableOpacity>
    </MissionModalBase>
  );
}

const getEDStyles = (C: any) => StyleSheet.create({
  missionBtn: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  missionIcon: { width: 40, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  missionInfo: { flex: 1 },
  missionLabel: { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', marginBottom: 2 },
  missionDetail: { color: C.muted, fontSize: 11, lineHeight: 15 },

  eventHeader: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: SPACING.sm, paddingHorizontal: 4 },
  eventHeaderTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  eventProgressTxt: { color: C.dimmed, fontSize: 11, marginBottom: SPACING.sm, alignSelf: 'flex-start' },
  eventLockedTxt: { color: C.dimmed, fontSize: 11, marginTop: SPACING.xs, marginBottom: SPACING.sm, textAlign: 'center' },

  eventWindowTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.gold + '08', borderWidth: 1, borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: 6, marginBottom: SPACING.md, alignSelf: 'flex-start' },
  eventWindowTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 0.5 },

  shadowExtractTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.purple + '12', borderWidth: 1, borderColor: C.purple + '33', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4, alignSelf: 'flex-start' },
  shadowExtractTxt: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 8 },

  cancelBtn: { marginTop: SPACING.sm, paddingVertical: 10, paddingHorizontal: SPACING.xl, borderWidth: 1, borderColor: C.border, borderRadius: 4 },
  cancelTxt: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, textAlign: 'center' },
});
