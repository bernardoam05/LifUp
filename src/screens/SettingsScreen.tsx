import React from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Modal, Switch, TextInput
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import Clipboard from '@react-native-clipboard/clipboard'
import useGameStore, { PunishmentIntensity, MissionDifficulty } from '../store/useGameStore'
import SystemAlertModal from '../components/SystemAlertModal'
import { C, FONT, SPACING } from '../theme'

// ── Difficulty option config ────────────────────────────────────────────────────

type DifficultyOption = {
  value:       MissionDifficulty
  label:       string
  sublabel:    string
  icon:        string
  color:       string
  description: string[]
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    value:    'easy',
    label:    'FÁCIL',
    sublabel: 'Protocolo de Treino Leve',
    icon:     'leaf',
    color:    '#22c55e',
    description: [
      '· Máximo de 3 missões por dia',
      '· Ideal para começar ou dias difíceis',
      '· Recompensas base sem escalonamento',
    ],
  },
  {
    value:    'normal',
    label:    'NORMAL',
    sublabel: 'Protocolo Padrão do Sistema',
    icon:     'sword',
    color:    C.neonBlue,
    description: [
      '· 3 missões base + 1 por cada 10 níveis (máx 5)',
      '· Recompensas escalonadas com o nível',
      '· Dificuldade recomendada',
    ],
  },
  {
    value:    'hard',
    label:    'DIFÍCIL',
    sublabel: 'Protocolo do Monarca Sombrio',
    icon:     'skull-crossbones',
    color:    C.neonRed,
    description: [
      '· 4 missões base + 1 por cada 5 níveis (máx 8)',
      '· Para caçadores de elite',
      '· Recompensas e penalizações amplificadas',
    ],
  },
]

// ── Intensity option config ────────────────────────────────────────────────────

type IntensityOption = {
  value:       PunishmentIntensity
  label:       string
  sublabel:    string
  icon:        string
  color:       string
  description: string[]
}

const INTENSITY_OPTIONS: IntensityOption[] = [
  {
    value:    'light',
    label:    'LEVE',
    sublabel: 'Protocolo Brando',
    icon:     'shield-outline',
    color:    '#22c55e',
    description: [
      '· Perda de XP: ~3% por missão falhada',
      '· 1 missão de penalização',
      '· Streak mantida (excepto falha total)',
      '· Sem bloqueio de apps',
    ],
  },
  {
    value:    'medium',
    label:    'MÉDIO',
    sublabel: 'Protocolo Padrão',
    icon:     'sword',
    color:    C.gold,
    description: [
      '· Perda de XP: 10% + 1% por falha',
      '· 1–3 missões de penalização',
      '· Streak reposta a zero',
      '· Bloqueio de apps se ≥50% falhado',
    ],
  },
  {
    value:    'hardcore',
    label:    'HARDCORE',
    sublabel: 'Protocolo do Monarca',
    icon:     'skull-crossbones',
    color:    C.neonRed,
    description: [
      '· Perda de XP: 20% total',
      '· 2–4 missões de penalização',
      '· Streak reposta a zero',
      '· Bloqueio de apps sempre ativo',
    ],
  },
]

// ── Base64 polyfills ────────────────────────────────────────────────────────
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function btoa(input: string) {
  let str = input, output = ''
  for (let block = 0, charCode, i = 0, map = chars; str.charAt(i | 0) || (map = '=', i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3/4)
    if (charCode > 0xFF) return input // fallback
    block = block << 8 | charCode
  }
  return output
}
function atob(input: string) {
  let str = input.replace(/=+$/, ''), output = ''
  for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
    buffer = chars.indexOf(buffer)
  }
  return output
}

// ── Settings Screen ────────────────────────────────────────────────────────────

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const settings       = useGameStore(s => s.settings)
  const updateSettings = useGameStore(s => s.updateSettings)

  const current = INTENSITY_OPTIONS.find(o => o.value === settings.punishmentIntensity)
    ?? INTENSITY_OPTIONS[1]

  const [alertConfig, setAlertConfig] = React.useState<{ title: string; message: string } | null>(null)
  const [importVisible, setImportVisible] = React.useState(false)
  const [importText, setImportText] = React.useState('')

  const handleExport = () => {
    try {
      const state = useGameStore.getState()
      const payload = {
        player: state.player,
        system: state.system,
        statistics: state.statistics,
        unlockedAchievements: state.unlockedAchievements,
        achievementProgress: state.achievementProgress,
        customShadows: state.customShadows,
      }
      const json = JSON.stringify(payload)
      const b64 = btoa(json)
      Clipboard.setString(b64)
      setAlertConfig({ title: 'BACKUP CONCLUÍDO', message: 'Código de Backup copiado para a área de transferência!' })
    } catch (err) {
      setAlertConfig({ title: 'ERRO', message: 'Falha ao exportar backup.' })
    }
  }

  const handleImport = () => {
    try {
      if (!importText.trim()) return
      const json = atob(importText.trim())
      const data = JSON.parse(json)
      useGameStore.getState().restoreBackup(data)
      setImportVisible(false)
      setImportText('')
      setAlertConfig({ title: 'RESTAURO CONCLUÍDO', message: 'Alma importada com sucesso. (Podes precisar de reiniciar o painel se houver bugs visuais).' })
    } catch (err) {
      setAlertConfig({ title: 'ERRO', message: 'Código inválido ou corrompido.' })
    }
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={s.header}>
          <Icon name="cog" size={16} color={C.neonBlue} />
          <Text style={s.headerTxt}> [ DEFINIÇÕES DO SISTEMA ]</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Icon name="close" size={20} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content}>

          {/* ── SECTION: Notificações ── */}
          <View style={s.sectionHeader}>
            <View style={[s.sectionDot, { backgroundColor: C.neonBlue }]} />
            <Text style={s.sectionTitle}>SISTEMA</Text>
          </View>

          <View style={s.row}>
            <Icon name="bell-outline" size={18} color={C.neonBlue} />
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Notificações</Text>
              <Text style={s.rowSub}>Alertas diários e avisos do Sistema</Text>
            </View>
            <Switch
              value={settings.notifications}
              onValueChange={v => updateSettings({ notifications: v })}
              trackColor={{ false: C.border, true: C.neonBlue + '55' }}
              thumbColor={settings.notifications ? C.neonBlue : C.dimmed}
            />
          </View>

          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <Icon name="volume-high" size={18} color={C.neonBlue} />
            <View style={s.rowInfo}>
              <Text style={s.rowLabel}>Som</Text>
              <Text style={s.rowSub}>Efeitos sonoros e feedback de áudio</Text>
            </View>
            <Switch
              value={settings.sound}
              onValueChange={v => updateSettings({ sound: v })}
              trackColor={{ false: C.border, true: C.neonBlue + '55' }}
              thumbColor={settings.sound ? C.neonBlue : C.dimmed}
            />
          </View>

          {/* ── SECTION: Punishment Intensity ── */}
          <View style={[s.sectionHeader, { marginTop: SPACING.lg }]}>
            <View style={[s.sectionDot, { backgroundColor: C.neonRed }]} />
            <Text style={s.sectionTitle}>INTENSIDADE DA PUNIÇÃO</Text>
          </View>

          <View style={s.intensityInfo}>
            <Icon name="information-outline" size={12} color={C.muted} />
            <Text style={s.intensityInfoTxt}>
              {' '}Define o rigor das penalizações ao falhar missões diárias.
              A punição é calculada com base no número de missões falhadas.
            </Text>
          </View>

          {INTENSITY_OPTIONS.map(opt => {
            const active = settings.punishmentIntensity === opt.value
            return (
              <TouchableOpacity
                key={opt.value}
                style={[s.intensityCard, active && { borderColor: opt.color, backgroundColor: opt.color + '0d' }]}
                onPress={() => updateSettings({ punishmentIntensity: opt.value })}
                activeOpacity={0.8}
              >
                {/* Card header row */}
                <View style={s.intensityCardHeader}>
                  <View style={[s.intensityIconWrap, { backgroundColor: opt.color + '18', borderColor: opt.color + '44' }]}>
                    <Icon name={opt.icon} size={20} color={active ? opt.color : C.dimmed} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.intensityLabel, { color: active ? opt.color : C.muted }]}>
                      {opt.label}
                    </Text>
                    <Text style={s.intensitySublabel}>{opt.sublabel}</Text>
                  </View>
                  {active ? (
                    <Icon name="radiobox-marked" size={20} color={opt.color} />
                  ) : (
                    <Icon name="radiobox-blank" size={20} color={C.border} />
                  )}
                </View>

                {/* Description lines */}
                <View style={s.intensityDesc}>
                  {opt.description.map((line, i) => (
                    <Text key={i} style={[s.intensityDescLine, active && { color: C.muted }]}>
                      {line}
                    </Text>
                  ))}
                </View>
              </TouchableOpacity>
            )
          })}

          {/* Active profile summary */}
          <View style={[s.activeSummary, { borderColor: current.color + '44' }]}>
            <Icon name="check-decagram" size={12} color={current.color} />
            <Text style={[s.activeSummaryTxt, { color: current.color }]}>
              {' '}Perfil ativo: <Text style={{ fontWeight: '900' }}>{current.label}</Text> — {current.sublabel}
            </Text>
          </View>

          {/* ── SECTION: Mission Difficulty ── */}
          <View style={[s.sectionHeader, { marginTop: SPACING.lg }]}>
            <View style={[s.sectionDot, { backgroundColor: C.neonBlue }]} />
            <Text style={s.sectionTitle}>RIGOR DO SISTEMA (MISSÕES DIÁRIAS)</Text>
          </View>

          <View style={s.intensityInfo}>
            <Icon name="information-outline" size={12} color={C.muted} />
            <Text style={s.intensityInfoTxt}>
              {' '}Controla quantas missões são geradas por dia.
              Tem efeito no próximo reset diário ou regeneração.
            </Text>
          </View>

          {DIFFICULTY_OPTIONS.map(opt => {
            const active = settings.missionDifficulty === opt.value
            return (
              <TouchableOpacity
                key={opt.value}
                style={[s.intensityCard, active && { borderColor: opt.color, backgroundColor: opt.color + '0d' }]}
                onPress={() => updateSettings({ missionDifficulty: opt.value })}
                activeOpacity={0.8}
              >
                <View style={s.intensityCardHeader}>
                  <View style={[s.intensityIconWrap, { backgroundColor: opt.color + '18', borderColor: opt.color + '44' }]}>
                    <Icon name={opt.icon} size={20} color={active ? opt.color : C.dimmed} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.intensityLabel, { color: active ? opt.color : C.muted }]}>
                      {opt.label}
                    </Text>
                    <Text style={s.intensitySublabel}>{opt.sublabel}</Text>
                  </View>
                  {active
                    ? <Icon name="radiobox-marked" size={20} color={opt.color} />
                    : <Icon name="radiobox-blank"  size={20} color={C.border} />}
                </View>
                <View style={s.intensityDesc}>
                  {opt.description.map((line, i) => (
                    <Text key={i} style={[s.intensityDescLine, active && { color: C.muted }]}>{line}</Text>
                  ))}
                </View>
              </TouchableOpacity>
            )
          })}

          {/* ── SECTION: Rest Day ── */}
          <View style={[s.sectionHeader, { marginTop: SPACING.lg }]}>
            <View style={[s.sectionDot, { backgroundColor: '#22c55e' }]} />
            <Text style={s.sectionTitle}>REPOUSO DO MONARCA</Text>
          </View>

          <View style={s.restDayInfo}>
            <Icon name="information-outline" size={12} color={C.muted} />
            <Text style={s.restDayInfoTxt}>
              {' '}Ativa para declarar hoje como Dia de Descanso. As missões ficam com opacidade reduzida e não haverá punições no reset de amanhã. Desativa automaticamente ao fim do dia.
            </Text>
          </View>

          <View style={[s.row, { borderBottomWidth: 0, borderRadius: 4, borderWidth: 1, borderColor: settings.restDay ? '#22c55e44' : C.border, backgroundColor: settings.restDay ? '#22c55e0a' : C.panel }]}>
            <Icon name="bed" size={18} color={settings.restDay ? '#22c55e' : C.dimmed} />
            <View style={s.rowInfo}>
              <Text style={[s.rowLabel, { color: settings.restDay ? '#22c55e' : '#e2e8f0' }]}>Dia de Descanso</Text>
              <Text style={s.rowSub}>
                {settings.restDay ? '[ REPOUSO ATIVO — sem punições hoje ]' : 'Inativo — missões normais'}
              </Text>
            </View>
            <Switch
              value={settings.restDay}
              onValueChange={v => updateSettings({ restDay: v })}
              trackColor={{ false: C.border, true: '#22c55e55' }}
              thumbColor={settings.restDay ? '#22c55e' : C.dimmed}
            />
          </View>

          {/* ── SECTION: Base de Dados do Sistema ── */}
          <View style={[s.sectionHeader, { marginTop: SPACING.lg }]}>
            <View style={[s.sectionDot, { backgroundColor: C.gold }]} />
            <Text style={s.sectionTitle}>BASE DE DADOS DO SISTEMA</Text>
          </View>

          <View style={s.intensityInfo}>
            <Icon name="information-outline" size={12} color={C.muted} />
            <Text style={s.intensityInfoTxt}>
              {' '}Exporta ou restaura a tua jornada como Monarca das Sombras copiando um código inviolável.
            </Text>
          </View>

          <View style={{ gap: SPACING.sm, marginBottom: SPACING.lg }}>
            <TouchableOpacity style={[s.collectBtn, { borderColor: C.neonBlue }]} onPress={handleExport} activeOpacity={0.8}>
              <Icon name="upload" size={16} color={C.neonBlue} style={{ marginRight: 6 }} />
              <Text style={[s.collectTxt, { color: C.neonBlue }]}> EXPORTAR ALMA (BACKUP)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.collectBtn, { borderColor: C.gold }]} onPress={() => setImportVisible(true)} activeOpacity={0.8}>
              <Icon name="download" size={16} color={C.gold} style={{ marginRight: 6 }} />
              <Text style={[s.collectTxt, { color: C.gold }]}> IMPORTAR ALMA (RESTORE)</Text>
            </TouchableOpacity>
          </View>

          {/* ── SECTION: About ── */}
          <View style={[s.sectionHeader, { marginTop: SPACING.lg }]}>
            <View style={[s.sectionDot, { backgroundColor: C.dimmed }]} />
            <Text style={s.sectionTitle}>SOBRE</Text>
          </View>

          <View style={s.aboutCard}>
            <Text style={s.aboutLine}>
              <Text style={s.aboutKey}>Versão </Text>
              <Text style={s.aboutVal}>Solo Leveling OS v3</Text>
            </Text>
            <Text style={s.aboutLine}>
              <Text style={s.aboutKey}>Motor de Missões </Text>
              <Text style={s.aboutVal}>Dinâmico · Pool Semanal · Boss Raid</Text>
            </Text>
            <Text style={s.aboutLine}>
              <Text style={s.aboutKey}>Persistência </Text>
              <Text style={s.aboutVal}>AsyncStorage · solo-leveling-v3</Text>
            </Text>
          </View>

        </ScrollView>
      </SafeAreaView>

      {/* ── Modals & Alerts ── */}
      {alertConfig && (
        <SystemAlertModal
          title={alertConfig.title}
          message={alertConfig.message}
          onClose={() => setAlertConfig(null)}
          buttons={[{ text: 'ENTENDIDO', style: 'default' }]}
        />
      )}

      {importVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setImportVisible(false)}>
          <View style={s.importOverlay}>
            <View style={s.importCard}>
              <View style={s.importHeader}>
                <Icon name="database-import" size={20} color={C.gold} />
                <Text style={s.importTitle}> IMPORTAR ALMA</Text>
              </View>
              <Text style={s.importSubtitle}>Cola abaixo o teu código Base64 para sobrescrever a base de dados atual.</Text>
              <TextInput
                style={s.importInput}
                value={importText}
                onChangeText={setImportText}
                placeholder="Código de Backup..."
                placeholderTextColor={C.dimmed}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
                <TouchableOpacity style={[s.collectBtn, { flex: 1, borderColor: C.muted }]} onPress={() => setImportVisible(false)}>
                  <Text style={[s.collectTxt, { color: C.muted }]}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.collectBtn, { flex: 1, borderColor: C.gold }]} onPress={handleImport}>
                  <Text style={[s.collectTxt, { color: C.gold }]}>RESTAURAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTxt: { flex: 1, color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 3 },
  closeBtn:  { padding: 6 },

  content: { padding: SPACING.md, paddingBottom: 40 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  sectionDot:    { width: 6, height: 6, borderRadius: 1 },
  sectionTitle:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, fontWeight: '700' },

  row:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderBottomWidth: 1, borderBottomColor: C.border, paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, gap: SPACING.sm },
  rowInfo:   { flex: 1 },
  rowLabel:  { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  rowSub:    { color: C.dimmed, fontSize: 11, marginTop: 2 },

  intensityInfo:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.border, padding: SPACING.sm, marginBottom: SPACING.md },
  intensityInfoTxt: { flex: 1, color: C.dimmed, fontSize: 11, lineHeight: 16 },

  intensityCard:       { backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.border, padding: SPACING.md, marginBottom: SPACING.sm },
  intensityCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  intensityIconWrap:   { width: 40, height: 40, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  intensityLabel:      { fontFamily: FONT.orbitron, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  intensitySublabel:   { color: C.dimmed, fontSize: 10, marginTop: 2 },
  intensityDesc:       { paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: C.border, gap: 3 },
  intensityDescLine:   { color: C.dimmed, fontSize: 11, lineHeight: 17 },

  activeSummary:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderWidth: 1, borderRadius: 4, padding: SPACING.sm, marginTop: SPACING.sm },
  activeSummaryTxt: { fontSize: 12, flex: 1 },

  restDayInfo:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.border, padding: SPACING.sm, marginBottom: SPACING.md },
  restDayInfoTxt: { flex: 1, color: C.dimmed, fontSize: 11, lineHeight: 16 },

  aboutCard:  { backgroundColor: C.panel, borderRadius: 4, borderWidth: 1, borderColor: C.border, padding: SPACING.md, gap: 6 },
  aboutLine:  { fontSize: 12 },
  aboutKey:   { color: C.dimmed },
  aboutVal:   { color: C.muted },

  collectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
  },
  collectTxt: {
    fontFamily: FONT.orbitron,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

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
    borderRadius: 4,
    padding: SPACING.lg,
  },
  importHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  importTitle: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 13, letterSpacing: 2 },
  importSubtitle: { color: C.muted, fontSize: 11, marginBottom: SPACING.md },
  importInput: {
    backgroundColor: '#04020e',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    color: '#e2e8f0',
    padding: SPACING.sm,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: SPACING.lg,
  },
})
