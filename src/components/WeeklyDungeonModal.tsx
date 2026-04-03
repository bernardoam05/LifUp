import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DungeonMission, getDungeonMissions, RAID_BOSSES } from '../data/bosses';
import { getKeyByBossId } from '../data/dungeonKeys';
import { SHADOW_MAP, getBossDropPreview } from '../data/shadows';
import BottomSheetModal from './BottomSheetModal';
import { FONT, SPACING } from '../theme';

// Helper function to get boss name from bossId
function getBossName(bossId: string): string {
  // Try to find in RAID_BOSSES first
  const raidBoss = RAID_BOSSES.find(b => b.id === bossId);
  if (raidBoss) {return raidBoss.name;}

  // Try to get from drop shadow name
  const shadow = getBossDropPreview(bossId);
  if (shadow) {return shadow.name;}

  // Try direct lookup in SHADOW_MAP
  const shadowMapEntry = SHADOW_MAP[bossId as keyof typeof SHADOW_MAP];
  if (shadowMapEntry) {return shadowMapEntry.name;}

  // Fallback: format the ID nicely
  return bossId.replace(/_/g, ' ').replace(/(^|\s)\w/g, c => c.toUpperCase());
}

export const getDMStyles = (C: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.bg + 'cc', justifyContent: 'flex-end' },
  card: { backgroundColor: C.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.lg, paddingBottom: 40, width: '100%', alignItems: 'center', borderWidth: 1, borderBottomWidth: 0, borderColor: C.neonRed + '88' },
  header: { width: '100%', alignItems: 'center', marginBottom: SPACING.lg },
  headerIconWrap: { width: 56, height: 56, borderRadius: 12, backgroundColor: C.neonRed + '12', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm, borderWidth: 1, borderColor: C.neonRed + '44' },
  headerBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: C.neonRed + '55', backgroundColor: C.neonRed + '10', marginBottom: SPACING.sm },
  headerBadgeTxt: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  title: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 16, fontWeight: '900', letterSpacing: 2, marginBottom: SPACING.sm, textAlign: 'center' },
  sub: { color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 0, maxWidth: '92%' },
  missionBtn: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, padding: SPACING.md, marginBottom: SPACING.sm, gap: SPACING.sm },
  missionIcon: { width: 40, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  missionInfo: { flex: 1 },
  missionLabel: { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', marginBottom: 3 },
  missionDetail: { color: C.muted, fontSize: 11, lineHeight: 15 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: SPACING.sm, paddingHorizontal: 4 },
  eventHeaderTxt: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  eventProgressTxt: { color: C.dimmed, fontSize: 11, marginBottom: SPACING.sm, alignSelf: 'flex-start' },
  eventLockedTxt: { color: C.dimmed, fontSize: 11, marginTop: SPACING.xs, marginBottom: SPACING.sm, textAlign: 'center' },
  cancelBtn: { marginTop: SPACING.sm, paddingVertical: 10, paddingHorizontal: SPACING.xl },
  cancelTxt: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  shadowExtractTag: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  shadowExtractTxt: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5 },
});

interface WeeklyDungeonModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestClose?: () => void;
  onSelectMission: (m: DungeonMission) => void;
  customMissions: DungeonMission[];
  defeatedId?: string;
  playerKeys: string[];
  C: any;
}

export default function WeeklyDungeonModal({
  visible,
  onClose,
  onRequestClose,
  onSelectMission,
  customMissions,
  defeatedId,
  playerKeys,
  C,
}: WeeklyDungeonModalProps) {
  const insets = useSafeAreaInsets();
  const dm = getDMStyles(C);
  const weeklyMissions = customMissions.length > 0 ? [...customMissions] : getDungeonMissions(C);

  return (
    <BottomSheetModal visible={visible} onClose={onRequestClose ?? onClose} contentStyle={{ backgroundColor: 'transparent' }}>
      <View style={[dm.card, { paddingBottom: Math.max(40, insets.bottom + SPACING.sm) }]}>
        <View style={dm.header}>
          <View style={dm.headerIconWrap}>
            <Icon name="gate" size={32} color={C.neonRed} />
          </View>
          <View style={dm.headerBadge}>
            <Text style={dm.headerBadgeTxt}>ALERTA DO SISTEMA</Text>
          </View>
          <Text style={dm.title} numberOfLines={2}>
            {weeklyMissions.length > 0 ? `[ ${weeklyMissions[0].label.toUpperCase()} ]` : '[ PORTAL DIÁRIO ]'}
          </Text>
          <Text style={dm.sub}>
            Completa a Missão do Boss Diário para ganhares XP, Gold e extraíres a sua Sombra.
          </Text>
        </View>

        <ScrollView style={{ width: '100%', maxHeight: 400 }} contentContainerStyle={{ alignItems: 'center' }} showsVerticalScrollIndicator={false}>
          {weeklyMissions.map(m => {
            const isDefeated = defeatedId === m.shadowHint;
            const key = getKeyByBossId(m.shadowHint);
            const hasKey = key ? playerKeys.includes(key.id) : true; // fallback true for event/special
            const isLocked = (!!defeatedId && !isDefeated) || (!isDefeated && !hasKey);

            return (
              <TouchableOpacity
                key={m.id}
                style={[dm.missionBtn, isDefeated && { borderColor: C.green + '88' }, isLocked && { opacity: 0.3 }]}
                onPress={() => { if (!isLocked) { onClose(); onSelectMission(m); } }}
                disabled={isLocked}
              >
                <View style={[dm.missionIcon, { backgroundColor: m.color + '22', borderColor: m.color + '66', borderWidth: 1 }]}>
                  <Icon name={m.icon} size={20} color={m.color} />
                </View>
                <View style={dm.missionInfo}>
                  <Text style={[dm.missionLabel, { color: m.color }]}>
                    {isDefeated ? '[ BOSS DERROTADO ]' : m.label}
                  </Text>
                  <Text style={dm.missionDetail}>{m.detail}</Text>
                  {!isDefeated && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                      <View style={dm.shadowExtractTag}>
                        <Icon name="ghost" size={9} color={C.purple} />
                        <Text style={dm.shadowExtractTxt}>
                          {' '}Sombra: {m.customShadow?.name ?? (getBossDropPreview(m.shadowHint)?.name ?? getBossName(m.shadowHint))}
                        </Text>
                      </View>
                      {!hasKey && key && (
                        <View style={[dm.shadowExtractTag, { borderColor: C.neonRed + '66' }]}>
                          <Icon name="key-remove" size={9} color={C.neonRed} />
                          <Text style={[dm.shadowExtractTxt, { color: C.neonRed }]}> CHAVE EM FALTA</Text>
                        </View>
                      )}
                      {hasKey && key && !isDefeated && (
                        <View style={[dm.shadowExtractTag, { borderColor: C.gold + '66' }]}>
                          <Icon name="key-check" size={9} color={C.gold} />
                          <Text style={[dm.shadowExtractTxt, { color: C.gold }]}> MASTER KEY PRONTA</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity style={dm.cancelBtn} onPress={onClose}>
          <Text style={dm.cancelTxt}>RECUAR</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
}
