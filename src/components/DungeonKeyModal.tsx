import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { DungeonKey } from '../data/dungeonKeys';
import MissionModalBase from './MissionModalBase';
import { FONT, SPACING } from '../theme';

const KEY_COOLDOWN_MS = 24 * 60 * 60_000;

function formatCooldown(ms: number): string {
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  if (h > 0) {return `${h}h ${m}m`;}
  return `${m}m`;
}

export const getDKMStyles = (C: any) => StyleSheet.create({
  section: { marginBottom: SPACING.lg, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.border },
  sectionTitle: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2, marginBottom: SPACING.sm, fontWeight: '700' },
  sectionContent: { color: C.muted, fontSize: 12, lineHeight: 18 },

  difficultyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  difficultyLabel: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  difficultyStars: { flexDirection: 'row', gap: 2 },

  missionTypeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  missionTypeLabel: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  missionTypeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  missionTypeText: { fontFamily: FONT.orbitron, fontSize: 9, fontWeight: '700' },

  alertBox: { backgroundColor: C.neonRed + '15', borderWidth: 1, borderColor: C.neonRed + '66', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.lg },
  alertTitle: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  alertText: { color: C.muted, fontSize: 11, lineHeight: 16 },

  startBtn: { marginTop: SPACING.sm, paddingVertical: 12, paddingHorizontal: SPACING.xl, backgroundColor: C.neonRed + '22', borderWidth: 1, borderColor: C.neonRed + '66', borderRadius: 4 },
  startBtnTxt: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2, fontWeight: '700', textAlign: 'center' },
  cancelBtn: { marginTop: SPACING.sm, paddingVertical: 10, paddingHorizontal: SPACING.xl, borderWidth: 1, borderColor: C.border, borderRadius: 4 },
  cancelTxt: { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, textAlign: 'center' },
});

interface DungeonKeyModalProps {
  visible: boolean
  onClose: () => void
  onRequestClose?: () => void
  onStartMission: (key: DungeonKey) => void
  dungeonKey: DungeonKey | null
  /** Epoch ms when this key was last used (from store.system.keyLastUsedAt) */
  keyLastUsedAt?: number
  C: any
}

export default function DungeonKeyModal({
  visible,
  onClose,
  onRequestClose,
  onStartMission,
  dungeonKey: key,
  keyLastUsedAt = 0,
  C,
}: DungeonKeyModalProps) {
  const { t } = useTranslation('dungeons');
  const dm = getDKMStyles(C);
  const [cooldownMs, setCooldownMs] = useState(0);

  useEffect(() => {
    const remaining = () => Math.max(0, KEY_COOLDOWN_MS - (Date.now() - keyLastUsedAt));
    setCooldownMs(remaining());
    if (remaining() <= 0) {return;}
    const interval = setInterval(() => {
      const r = remaining();
      setCooldownMs(r);
      if (r <= 0) {clearInterval(interval);}
    }, 30_000);
    return () => clearInterval(interval);
  }, [keyLastUsedAt, visible]);

  if (!key) {return null;}

  const onCooldown = cooldownMs > 0;

  const lore = key.lore || t('ui.defaultLore', { description: key.description });
  const environment = key.environment || t('ui.defaultEnvironment');
  const difficulty = key.difficulty || 3;

  const renderDifficulty = () => {
    if (difficulty === '???') {
      return (
        <View style={dm.difficultyRow}>
          <Text style={dm.difficultyLabel}>{t('ui.difficulty')}</Text>
          <Text style={[dm.difficultyLabel, { fontSize: 12, fontWeight: '900' }]}>???</Text>
        </View>
      );
    }
    const stars = Array.from({ length: 5 }).map((_, i) => (
      <Icon
        key={i}
        name={i < difficulty ? 'star' : 'star-outline'}
        size={14}
        color={i < difficulty ? C.gold : C.border}
      />
    ));
    return (
      <View style={dm.difficultyRow}>
        <Text style={dm.difficultyLabel}>{t('ui.difficulty')}</Text>
        <View style={dm.difficultyStars}>{stars}</View>
      </View>
    );
  };

  const getMissionTypeColor = () => {
    switch (key.missionType) {
      case 'focus': return { bg: C.neonBlue, text: C.neonBlue };
      case 'training': return { bg: '#84cc16', text: '#84cc16' };
      case 'gps': return { bg: C.gold, text: C.gold };
      default: return { bg: C.muted, text: C.muted };
    }
  };

  const missionColor = getMissionTypeColor();
  const missionTypeLabel = key.missionType === 'focus' ? t('ui.missionTypeFocus') : key.missionType === 'training' ? t('ui.missionTypeTraining') : t('ui.missionTypeGps');

  return (
    <MissionModalBase
      visible={visible}
      onClose={onClose}
      onRequestClose={onRequestClose}
      iconName="key-alert"
      iconColor={key.color}
      warningText={t('ui.dangerousPortal')}
      title={key.name}
      titleColor={key.color}
      borderColor={C.neonRed + '88'}
      C={C}
    >
        <View style={dm.section}>
          <Text style={dm.sectionTitle}>{t('ui.legend')}</Text>
          <Text style={dm.sectionContent}>{lore}</Text>
        </View>

        <View style={dm.section}>
          <Text style={dm.sectionTitle}>{t('ui.environment')}</Text>
          <Text style={dm.sectionContent}>{environment}</Text>
        </View>

        <View style={dm.section}>
          {renderDifficulty()}
          <View style={[dm.missionTypeRow, { marginTop: SPACING.sm }]}>
            <Text style={dm.missionTypeLabel}>{t('ui.missionType')}</Text>
            <View style={[dm.missionTypeBadge, { backgroundColor: missionColor.bg + '22', borderColor: missionColor.bg }]}>
              <Text style={[dm.missionTypeText, { color: missionColor.text }]}>{missionTypeLabel}</Text>
            </View>
          </View>
        </View>

        {onCooldown ? (
          <View style={[dm.alertBox, { borderColor: C.gold + '66', backgroundColor: C.gold + '10' }]}>
            <Text style={[dm.alertTitle, { color: C.gold }]}>{t('ui.cooldownActive')}</Text>
            <Text style={dm.alertText}>
              {t('ui.cooldownText')}{'\n\n'}
              <Text style={{ color: C.gold, fontFamily: FONT.orbitron, fontSize: 14, fontWeight: '900' }}>
                {formatCooldown(cooldownMs)}
              </Text>
            </Text>
          </View>
        ) : (
          <View style={dm.alertBox}>
            <Text style={dm.alertTitle}>{t('ui.criticalWarning')}</Text>
            <Text style={dm.alertText}>{t('ui.criticalWarningText')}</Text>
          </View>
        )}

      <TouchableOpacity
        style={[dm.startBtn, onCooldown && { opacity: 0.4, borderColor: C.gold + '44' }]}
        onPress={() => { if (!onCooldown) { onStartMission(key); onClose(); } }}
        disabled={onCooldown}
      >
        <Text style={[dm.startBtnTxt, onCooldown && { color: C.gold }]}>
          {onCooldown ? t('ui.cooldownBtn', { time: formatCooldown(cooldownMs) }) : t('ui.acceptChallenge')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={dm.cancelBtn} onPress={onClose}>
        <Text style={dm.cancelTxt}>{t('ui.retreat')}</Text>
      </TouchableOpacity>
    </MissionModalBase>
  );
}
