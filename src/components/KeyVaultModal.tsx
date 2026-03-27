import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme, FONT, SPACING } from '../theme'
import { ALL_DUNGEON_KEYS, DungeonKey } from '../data/dungeonKeys'
import DungeonKeyModal from './DungeonKeyModal'
import useGameStore from '../store/useGameStore'

interface Props {
  visible: boolean
  onClose: () => void
  keys: string[]
  C: any
}

export default function KeyVaultModal({ visible, onClose, keys, C }: Props) {
  const insets = useSafeAreaInsets()
  const st = React.useMemo(() => getStyles(C), [C])
  const [selectedKey, setSelectedKey] = React.useState<DungeonKey | null>(null)
  const [showKeyDetail, setShowKeyDetail] = React.useState(false)
  const setPendingKeyMission = useGameStore(s => s.setPendingKeyMission)

  const keyObjects = keys
    .map(keyId => ALL_DUNGEON_KEYS.find(k => k.id === keyId))
    .filter((k): k is DungeonKey => !!k)

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={st.overlay}>
          <View style={[st.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={st.header}>
              <Icon name="safe" size={24} color={C.gold} />
              <Text style={st.title}> COFRE DE CHAVES</Text>
              <TouchableOpacity onPress={onClose} style={st.closeBtn}>
                <Icon name="close" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* Keys List */}
            {keyObjects.length > 0 ? (
              <FlatList
                data={keyObjects}
                keyExtractor={(item, idx) => `${item.id}-${idx}`}
                contentContainerStyle={st.listContent}
                scrollEnabled={true}
                renderItem={({ item: key }) => (
                  <TouchableOpacity
                    style={[st.keyCard, { borderColor: key.color + '44' }]}
                    onPress={() => {
                      setSelectedKey(key)
                      setShowKeyDetail(true)
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[st.keyIcon, { backgroundColor: key.color + '12', borderColor: key.color + '44' }]}>
                      <Icon name="key-variant" size={28} color={key.color} />
                    </View>
                    <View style={st.keyInfo}>
                      <Text style={[st.keyName, { color: key.color }]} numberOfLines={1}>
                        {key.name.toUpperCase()}
                      </Text>
                      <Text style={st.keyType} numberOfLines={1}>
                        {key.missionType === 'focus' && '⏱️ FOCO'}
                        {key.missionType === 'training' && '💪 TREINO'}
                        {key.missionType === 'gps' && '🏃 PASSEIO'}
                      </Text>
                      <Text style={st.keyDesc} numberOfLines={2}>
                        {key.description}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={C.dimmed} />
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={st.emptyState}>
                <Icon name="shield-lock-outline" size={48} color={C.dimmed} />
                <Text style={st.emptyTitle}>Cofre Vazio</Text>
                <Text style={st.emptySub}>Sobe de nível ou abre Cofres para encontrar chaves raras.</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Key Detail Modal */}
      {selectedKey && (
        <DungeonKeyModal
          visible={showKeyDetail}
          onClose={() => setShowKeyDetail(false)}
          onRequestClose={() => setShowKeyDetail(false)}
          onStartMission={(key) => {
            setPendingKeyMission(key.id)
            setShowKeyDetail(false)
            onClose()
            Linking.openURL('sololeveling://missions')
          }}
          dungeonKey={selectedKey}
          C={C}
        />
      )}
    </>
  )
}

const getStyles = (C: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    flex: 0.9,
    backgroundColor: C.panel,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    flex: 1,
    color: C.gold,
    fontFamily: FONT.orbitron,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  closeBtn: {
    padding: 8,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  keyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 8,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  keyIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  keyInfo: {
    flex: 1,
  },
  keyName: {
    fontFamily: FONT.orbitron,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 4,
  },
  keyType: {
    color: C.muted,
    fontSize: 9,
    fontFamily: FONT.orbitron,
    marginBottom: 2,
  },
  keyDesc: {
    color: C.text.secondary,
    fontSize: 10,
    lineHeight: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  emptyTitle: {
    color: C.text.primary,
    fontFamily: FONT.orbitron,
    fontSize: 14,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  emptySub: {
    color: C.text.secondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
})
