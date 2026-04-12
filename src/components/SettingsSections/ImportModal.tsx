import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme, SPACING, FONT } from '../../theme';

interface ImportModalProps {
  visible: boolean
  value: string
  onValueChange: (text: string) => void
  onImport: () => void
  onCancel: () => void
}

const ImportModal = ({
  visible,
  value,
  onValueChange,
  onImport,
  onCancel,
}: ImportModalProps) => {
  const C = useTheme();
  const { t } = useTranslation('settings');
  const s = React.useMemo(() => getStyles(C), [C]);

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={s.importOverlay}>
        <View style={s.importCard}>
          <View style={s.importHeader}>
            <Icon name="database-import" size={20} color={C.gold} />
            <Text style={s.importTitle}> {t('importModal.title')}</Text>
          </View>
          <Text style={s.importSubtitle}>{t('importModal.subtitle')}</Text>
          <TextInput
            style={s.importInput}
            value={value}
            onChangeText={onValueChange}
            placeholder={t('importModal.placeholder')}
            placeholderTextColor={C.dimmed}
            multiline
          />
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            <TouchableOpacity style={[s.collectBtn, { flex: 1, borderColor: C.muted }]} onPress={onCancel}>
              <Text style={[s.collectTxt, { color: C.muted }]}>{t('importModal.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.collectBtn, { flex: 1, borderColor: C.gold }]} onPress={onImport}>
              <Text style={[s.collectTxt, { color: C.gold }]}>{t('importModal.restore')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (C: any) => StyleSheet.create({
  importOverlay: {
    flex: 1,
    backgroundColor: '#000000e0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  importCard: {
    width: '100%',
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: SPACING.lg,
  },
  importHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  importTitle: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 14, letterSpacing: 2, fontWeight: '900' },
  importSubtitle: { color: C.muted, fontSize: 11, marginBottom: SPACING.md, lineHeight: 16 },
  importInput: {
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border + '66',
    borderRadius: 8,
    color: C.muted,
    padding: SPACING.md,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.lg,
    fontFamily: FONT.orbitron,
    fontSize: 10,
  },
  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  collectTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});

export default ImportModal;
