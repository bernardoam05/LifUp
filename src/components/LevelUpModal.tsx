import React, { useEffect } from 'react'
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { useTheme } from '../theme'
import { playSound } from '../utils/audioService'
import { SHOP_CATALOG } from '../data/shopItems'

interface Props {
  level: number
  items: string[]
  onDismiss: () => void
}

const ITEM_NAMES: Record<string, string> = Object.fromEntries(SHOP_CATALOG.map(i => [i.id, i.name]))
const EXTRA_NAMES: Record<string, string> = {
  shadow_essence: 'Essência das Sombras',
  blood_fallen: 'Sangue dos Caídos',
  loot_box: 'Cofre Misterioso',
}

export default function LevelUpModal({ level, items, onDismiss }: Props) {
  const C = useTheme()
  const st = React.useMemo(() => getStyles(C), [C])

  useEffect(() => {
    playSound('levelUp')
  }, [])

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={st.overlay}>
        <View style={st.modalContent}>
          <View style={st.header}>
            <Icon name="chevron-double-up" size={48} color={C.gold} />
            <Text style={st.title}>LEVEL UP!</Text>
            <Text style={st.levelText}>Nível {level}</Text>
          </View>

          {items.length > 0 && (
            <View style={st.rewardsSection}>
              <Text style={st.rewardsLabel}>Recompensas</Text>
              <ScrollView style={st.itemsList} nestedScrollEnabled>
                {items.map((item, idx) => (
                  <View key={idx} style={st.itemRow}>
                    <Icon name="gift" size={20} color={C.gold} />
                    <Text style={st.itemText}>{ITEM_NAMES[item] ?? EXTRA_NAMES[item] ?? item}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <TouchableOpacity style={st.closeBtn} onPress={onDismiss}>
            <Text style={st.closeBtnText}>CONTINUAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const getStyles = (C: any) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
  },
  modalContent: {
    width: '85%',
    backgroundColor: C.panel,
    borderWidth: 2,
    borderColor: C.gold,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: C.gold,
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  levelText: {
    color: C.text.secondary,
    fontSize: 16,
  },
  rewardsSection: {
    width: '100%',
    marginBottom: 20,
    maxHeight: 200,
  },
  rewardsLabel: {
    color: C.text.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  itemsList: {
    width: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  itemText: {
    color: C.text.secondary,
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  closeBtn: {
    width: '100%',
    backgroundColor: C.gold,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeBtnText: {
    color: C.bg,
    fontSize: 16,
    fontWeight: 'bold',
  },
})
