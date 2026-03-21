import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import useGameStore, { QuestDefinition, Quest, INITIAL_QUEST_DICTIONARY } from '../store/useGameStore'
import CustomModal from '../components/CustomModal'
import { C, FONT, SPACING } from '../theme'

// ── Config ─────────────────────────────────────────────────────────────────────

const QUEST_TYPE_OPTS: { value: Quest['type']; label: string; icon: string; color: string }[] = [
  { value: 'training',  label: 'Treino',       icon: 'arm-flex',          color: '#ef4444' },
  { value: 'focus',     label: 'Foco',         icon: 'timer-sand',        color: '#a855f7' },
  { value: 'knowledge', label: 'Conhecimento', icon: 'book-open-variant', color: C.neonBlue },
  { value: 'gps',       label: 'GPS',          icon: 'run-fast',          color: '#22c55e' },
]

const UNIT_CHIPS = ['reps', 'min', 'km', 'páginas', 'séries', 'horas', 'litros']

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const BLANK_DEF: Omit<QuestDefinition, 'id'> = {
  title:           '',
  description:     '',
  type:            'pool',
  questType:       'training',
  baseTarget:      10,
  scalingAmount:   0,
  scalingInterval: 1,
  unit:            'reps',
  baseXP:          20,
  baseGold:        8,
  daysOfWeek:      undefined,
}

// ── Form modal ─────────────────────────────────────────────────────────────────

type FormState = Omit<QuestDefinition, 'id'> & {
  daysRaw:     number[]
  shadowName:  string
  shadowIcon:  string
}

function toFormState(def?: QuestDefinition): FormState {
  if (!def) return { ...BLANK_DEF, daysRaw: [], shadowName: '', shadowIcon: 'ghost' }
  return {
    ...def,
    // migrate legacy field
    scalingAmount:   def.scalingAmount   ?? def.scalingPerLevel ?? 0,
    scalingInterval: def.scalingInterval ?? 1,
    daysRaw:         def.daysOfWeek ?? [],
    shadowName:      def.shadowName ?? '',
    shadowIcon:      def.shadowIcon ?? 'ghost',
  }
}

// Chip — reusable small selectable pill
function Chip({
  label, active, color, onPress,
}: {
  label:   string
  active:  boolean
  color:   string
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[ch.base, active ? { backgroundColor: color + '22', borderColor: color } : ch.inactive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[ch.txt, { color: active ? color : '#64748b' }]}>{label}</Text>
    </TouchableOpacity>
  )
}

// CategoryChip — chip with icon + label
function CategoryChip({
  opt, active, onPress,
}: {
  opt:     typeof QUEST_TYPE_OPTS[number]
  active:  boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[ch.base, ch.catBase, active ? { backgroundColor: opt.color + '22', borderColor: opt.color } : ch.inactive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name={opt.icon} size={13} color={active ? opt.color : '#64748b'} />
      <Text style={[ch.txt, { color: active ? opt.color : '#64748b' }]}>{opt.label}</Text>
    </TouchableOpacity>
  )
}

function FormModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: QuestDefinition
  onSave:  (def: Omit<QuestDefinition, 'id'>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial))
  const isCore     = form.type === 'core'
  const isBoss     = form.type === 'boss'
  const isEditing  = !!initial   // type field locked when editing

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleDay(d: number) {
    const days = form.daysRaw.includes(d)
      ? form.daysRaw.filter(x => x !== d)
      : [...form.daysRaw, d].sort()
    setForm(f => ({ ...f, daysRaw: days }))
  }

  function handleSave() {
    if (!form.title.trim()) {
      Alert.alert('Título obrigatório', 'A diretiva precisa de um nome.')
      return
    }
    const def: Omit<QuestDefinition, 'id'> = {
      title:           form.title.trim(),
      description:     form.description.trim(),
      type:            form.type,
      questType:       form.questType,
      baseTarget:      Number(form.baseTarget) || 0,
      scalingAmount:   Number(form.scalingAmount) || 0,
      scalingInterval: Math.max(1, Number(form.scalingInterval) || 1),
      unit:            form.unit.trim() || 'reps',
      baseXP:          Number(form.baseXP) || 10,
      baseGold:        Number(form.baseGold) || 5,
      daysOfWeek:      isCore && form.daysRaw.length > 0 ? form.daysRaw : undefined,
      shadowName:      isBoss && form.shadowName.trim() ? form.shadowName.trim() : undefined,
      shadowIcon:      isBoss && form.shadowName.trim() ? form.shadowIcon.trim() || 'ghost' : undefined,
    }
    onSave(def)
  }

  return (
    <Modal
      transparent
      animationType="slide"
      visible
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Full-black overlay for Android focus */}
        <View style={fm.overlay}>
          <View style={fm.sheet}>

            {/* ── Header ── */}
            <View style={fm.header}>
              <Icon name="hammer" size={15} color={C.gold} />
              <Text style={fm.headerTxt}>{initial ? ' EDITAR DIRETIVA' : ' NOVA DIRETIVA'}</Text>
              <TouchableOpacity onPress={onClose} style={fm.closeBtn}>
                <Icon name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={fm.body} keyboardShouldPersistTaps="handled">

              {/* ── TIPO (Core / Pool / Boss) — locked when editing ── */}
              <View style={fm.labelRow}>
                <Text style={fm.label}>TIPO DE MISSÃO</Text>
                {isEditing && (
                  <View style={fm.lockBadge}>
                    <Icon name="lock-outline" size={10} color={C.dimmed} />
                    <Text style={fm.lockTxt}> BLOQUEADO</Text>
                  </View>
                )}
              </View>
              <View style={[fm.chipRow, isEditing && fm.chipRowLocked]}>
                <Chip
                  label="CORE · Diária fixa"
                  active={form.type === 'core'}
                  color={C.neonBlue}
                  onPress={() => !isEditing && field('type', 'core')}
                />
                <Chip
                  label="POOL · Hábito rotativo"
                  active={form.type === 'pool'}
                  color={C.purple}
                  onPress={() => !isEditing && field('type', 'pool')}
                />
                <Chip
                  label="BOSS · Desafio épico"
                  active={form.type === 'boss'}
                  color="#ef4444"
                  onPress={() => !isEditing && field('type', 'boss')}
                />
              </View>

              {/* ── CATEGORIA ── */}
              <Text style={fm.label}>CATEGORIA</Text>
              <View style={fm.chipRow}>
                {QUEST_TYPE_OPTS.map(opt => (
                  <CategoryChip
                    key={opt.value}
                    opt={opt}
                    active={form.questType === opt.value}
                    onPress={() => field('questType', opt.value)}
                  />
                ))}
              </View>

              {/* ── TÍTULO ── */}
              <Text style={fm.label}>TÍTULO</Text>
              <TextInput
                style={fm.input}
                value={form.title}
                onChangeText={v => field('title', v)}
                placeholder="ex: Força Bruta"
                placeholderTextColor="#334155"
              />

              {/* ── DESCRIÇÃO ── */}
              <Text style={fm.label}>
                DESCRIÇÃO{'  '}
                <Text style={fm.hint}>usa {'{target}'} e {'{unit}'} como variáveis</Text>
              </Text>
              <TextInput
                style={[fm.input, fm.inputMulti]}
                value={form.description}
                onChangeText={v => field('description', v)}
                placeholder="ex: Completa {target} {unit} hoje"
                placeholderTextColor="#334155"
                multiline
                numberOfLines={3}
              />

              {/* ── VALOR BASE + UNIDADE ── */}
              <View style={fm.row2}>
                <View style={fm.col}>
                  <Text style={fm.label}>VALOR BASE</Text>
                  <TextInput
                    style={fm.input}
                    value={String(form.baseTarget)}
                    onChangeText={v => field('baseTarget', Number(v) || 0)}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor="#334155"
                  />
                </View>
                <View style={fm.col}>
                  <Text style={fm.label}>XP · GOLD</Text>
                  <View style={fm.row2}>
                    <TextInput
                      style={[fm.input, { flex: 1 }]}
                      value={String(form.baseXP)}
                      onChangeText={v => field('baseXP', Number(v) || 0)}
                      keyboardType="numeric"
                      placeholder="20"
                      placeholderTextColor="#334155"
                    />
                    <TextInput
                      style={[fm.input, { flex: 1 }]}
                      value={String(form.baseGold)}
                      onChangeText={v => field('baseGold', Number(v) || 0)}
                      keyboardType="numeric"
                      placeholder="8"
                      placeholderTextColor="#334155"
                    />
                  </View>
                </View>
              </View>

              {/* ── UNIDADE (Chips) ── */}
              <Text style={fm.label}>UNIDADE</Text>
              <View style={fm.chipRow}>
                {UNIT_CHIPS.map(u => (
                  <Chip
                    key={u}
                    label={u}
                    active={form.unit === u}
                    color={C.neonBlue}
                    onPress={() => field('unit', u)}
                  />
                ))}
              </View>
              {/* Custom unit input */}
              <TextInput
                style={[fm.input, { marginTop: 6 }]}
                value={UNIT_CHIPS.includes(form.unit) ? '' : form.unit}
                onChangeText={v => { if (v) field('unit', v) }}
                placeholder="Outra unidade (ex: passadas)..."
                placeholderTextColor="#334155"
                autoCapitalize="none"
              />

              {/* ── ESCALAMENTO ── */}
              <Text style={fm.label}>ESCALAMENTO</Text>
              <View style={fm.row2}>
                <View style={fm.col}>
                  <Text style={fm.scalingHint}>Aumenta</Text>
                  <View style={fm.scalingRow}>
                    <TextInput
                      style={[fm.input, fm.scalingInput]}
                      value={String(form.scalingAmount)}
                      onChangeText={v => field('scalingAmount', Number(v) || 0)}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#334155"
                    />
                    <Text style={fm.scalingUnit}>{form.unit || 'unid.'}</Text>
                  </View>
                </View>
                <View style={fm.col}>
                  <Text style={fm.scalingHint}>A cada</Text>
                  <View style={fm.scalingRow}>
                    <TextInput
                      style={[fm.input, fm.scalingInput]}
                      value={String(form.scalingInterval)}
                      onChangeText={v => field('scalingInterval', Math.max(1, Number(v) || 1))}
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor="#334155"
                    />
                    <Text style={fm.scalingUnit}>níveis</Text>
                  </View>
                </View>
              </View>
              {(form.scalingAmount > 0) && (
                <Text style={fm.scalingPreview}>
                  ↗ +{form.scalingAmount} {form.unit || 'unid.'} a cada {form.scalingInterval} nível{form.scalingInterval > 1 ? 's' : ''}
                </Text>
              )}

              {/* ── DIAS DA SEMANA (Core only) ── */}
              {isCore && (
                <>
                  <Text style={fm.label}>
                    DIAS DA SEMANA{'  '}
                    <Text style={fm.hint}>vazio = todos os dias</Text>
                  </Text>
                  <View style={fm.chipRow}>
                    {DAY_LABELS.map((label, i) => (
                      <Chip
                        key={i}
                        label={label}
                        active={form.daysRaw.includes(i)}
                        color={C.neonBlue}
                        onPress={() => toggleDay(i)}
                      />
                    ))}
                  </View>
                </>
              )}

              {/* ── EXTRAÇÃO DE SOMBRA (Boss only) ── */}
              {isBoss && (
                <>
                  <View style={fm.shadowDivider}>
                    <View style={fm.shadowDividerLine} />
                    <Icon name="ghost" size={12} color={C.purple + 'aa'} />
                    <Text style={fm.shadowDividerTxt}>EXTRAÇÃO DE SOMBRA</Text>
                    <View style={fm.shadowDividerLine} />
                  </View>
                  <Text style={fm.shadowHint}>
                    Opcional. Se preenchido, derrotar este Boss extrai uma Sombra para o teu exército.
                  </Text>
                  <Text style={fm.label}>NOME DA SOMBRA</Text>
                  <TextInput
                    style={fm.input}
                    value={form.shadowName}
                    onChangeText={v => field('shadowName', v)}
                    placeholder="ex: Golem de Obsidiana"
                    placeholderTextColor="#334155"
                  />
                  <Text style={fm.label}>
                    ÍCONE{'  '}
                    <Text style={fm.hint}>nome do MaterialCommunityIcons</Text>
                  </Text>
                  <TextInput
                    style={fm.input}
                    value={form.shadowIcon}
                    onChangeText={v => field('shadowIcon', v)}
                    placeholder="ex: ghost, sword-cross, skull..."
                    placeholderTextColor="#334155"
                    autoCapitalize="none"
                  />
                  {form.shadowName.trim() !== '' && (
                    <View style={fm.shadowPreview}>
                      <Icon name={form.shadowIcon || 'ghost'} size={22} color={C.purple} />
                      <Text style={fm.shadowPreviewTxt}> {form.shadowName}</Text>
                      <View style={fm.shadowRankBadge}>
                        <Text style={fm.shadowRankTxt}>CUSTOM · Lv.1</Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* ── SAVE ── */}
              <TouchableOpacity style={fm.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                <Icon name="check-bold" size={18} color="#FFFFFF" />
                <Text style={fm.saveTxt}>{initial ? ' GUARDAR ALTERAÇÕES' : ' CRIAR DIRETIVA'}</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ── Quest definition row ───────────────────────────────────────────────────────

function DefRow({
  def,
  onEdit,
  onDelete,
}: {
  def:      QuestDefinition
  onEdit:   () => void
  onDelete: () => void
}) {
  const qtCfg = QUEST_TYPE_OPTS.find(o => o.value === def.questType) ?? QUEST_TYPE_OPTS[0]

  function confirmDelete() {
    Alert.alert(
      'Apagar Diretiva',
      `Remover "${def.title}" do Sistema? As missões de hoje não serão afetadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Apagar', style: 'destructive', onPress: onDelete },
      ]
    )
  }

  return (
    <View style={dr.row}>
      <View style={[dr.iconWrap, { backgroundColor: qtCfg.color + '18' }]}>
        <Icon name={qtCfg.icon} size={18} color={qtCfg.color} />
      </View>
      <View style={dr.info}>
        <Text style={dr.title} numberOfLines={1}>{def.title}</Text>
        <Text style={dr.desc}  numberOfLines={1}>{def.description || '—'}</Text>
        <Text style={dr.meta}>
          {def.baseTarget} {def.unit}
          {(def.scalingAmount ?? def.scalingPerLevel ?? 0) > 0
            ? `  ·  +${def.scalingAmount ?? def.scalingPerLevel} a cada ${def.scalingInterval ?? 1} lvl`
            : ''}
          {'  ·  '}{def.baseXP}xp  {def.baseGold}g
        </Text>
      </View>
      <View style={dr.actions}>
        <TouchableOpacity style={dr.editBtn} onPress={onEdit}>
          <Icon name="pencil-outline" size={14} color={C.neonBlue} />
        </TouchableOpacity>
        <TouchableOpacity style={dr.deleteBtn} onPress={confirmDelete}>
          <Icon name="trash-can-outline" size={14} color={C.neonRed} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function QuestForgeScreen({ onClose }: { onClose: () => void }) {
  const questDictionary       = useGameStore(s => s.questDictionary)
  const addQuestDefinition    = useGameStore(s => s.addQuestDefinition)
  const updateQuestDefinition = useGameStore(s => s.updateQuestDefinition)
  const deleteQuestDefinition = useGameStore(s => s.deleteQuestDefinition)
  const regenerateDailyQuests = useGameStore(s => s.regenerateDailyQuests)

  const [formTarget,      setFormTarget]      = useState<QuestDefinition | null | 'new'>(null)
  const [showRegen,       setShowRegen]       = useState(false)
  const [showReset,       setShowReset]       = useState(false)
  const [regenResult,     setRegenResult]     = useState<{ success: boolean; reason?: string } | null>(null)

  const coreDefs = questDictionary.filter(d => d.type === 'core')
  const poolDefs = questDictionary.filter(d => d.type === 'pool')
  const bossDefs = questDictionary.filter(d => d.type === 'boss')

  function handleSave(def: Omit<QuestDefinition, 'id'>) {
    if (formTarget === 'new') {
      addQuestDefinition({ ...def, id: `custom_${Date.now()}` })
    } else if (formTarget) {
      updateQuestDefinition(formTarget.id, def)
    }
    setFormTarget(null)
  }

  function handleRegenerate() {
    const result = regenerateDailyQuests()
    setRegenResult(result)
  }

  function confirmReset() {
    questDictionary.forEach(d => deleteQuestDefinition(d.id))
    INITIAL_QUEST_DICTIONARY.forEach(d => addQuestDefinition(d))
    setShowReset(false)
  }

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      // Android: renders full screen (presentationStyle not applicable)
    >
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>

        {/* Header */}
        <View style={s.header}>
          <Icon name="hammer-wrench" size={16} color={C.gold} />
          <Text style={s.headerTxt}> FORJA DE MISSÕES</Text>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Icon name="close" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.content}>

          {/* Action row */}
          <View style={s.actionRow}>
            <TouchableOpacity style={[s.actionBtn, s.regenBtn]} onPress={() => setShowRegen(true)}>
              <Icon name="refresh" size={14} color={C.neonBlue} />
              <Text style={[s.actionTxt, { color: C.neonBlue }]}> REGENERAR HOJE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionBtn, s.resetBtn]} onPress={() => setShowReset(true)}>
              <Icon name="restore" size={14} color="#64748b" />
              <Text style={[s.actionTxt, { color: '#64748b' }]}> RESTAURAR</Text>
            </TouchableOpacity>
          </View>

          {/* Core section */}
          <View style={s.sectionHeader}>
            <View style={[s.sectionDot, { backgroundColor: C.neonBlue }]} />
            <Text style={s.sectionTitle}>CORE — DIÁRIAS FIXAS</Text>
            <Text style={s.sectionCount}>{coreDefs.length}</Text>
          </View>
          <Text style={s.sectionSub}>Aparecem todos os dias (ou nos dias configurados).</Text>
          {coreDefs.length === 0 && (
            <Text style={s.empty}>Nenhuma missão core. Adiciona pelo menos uma.</Text>
          )}
          {coreDefs.map(def => (
            <DefRow
              key={def.id} def={def}
              onEdit={() => setFormTarget(def)}
              onDelete={() => deleteQuestDefinition(def.id)}
            />
          ))}

          {/* Pool section */}
          <View style={[s.sectionHeader, { marginTop: SPACING.lg }]}>
            <View style={[s.sectionDot, { backgroundColor: C.purple }]} />
            <Text style={s.sectionTitle}>POOL — HÁBITOS ROTATIVOS</Text>
            <Text style={s.sectionCount}>{poolDefs.length}</Text>
          </View>
          <Text style={s.sectionSub}>
            Sorteados diariamente: 1 (Nvl 1–4) · 2 (Nvl 5–9) · 3 (Nvl 10+).
          </Text>
          {poolDefs.length === 0 && (
            <Text style={s.empty}>Pool vazia. O Sistema não gerará hábitos rotativos.</Text>
          )}
          {poolDefs.map(def => (
            <DefRow
              key={def.id} def={def}
              onEdit={() => setFormTarget(def)}
              onDelete={() => deleteQuestDefinition(def.id)}
            />
          ))}

          {/* Boss section */}
          <View style={[s.sectionHeader, { marginTop: SPACING.lg }]}>
            <View style={[s.sectionDot, { backgroundColor: '#ef4444' }]} />
            <Text style={s.sectionTitle}>BOSS — DESAFIOS ÉPICOS</Text>
            <Text style={s.sectionCount}>{bossDefs.length}</Text>
          </View>
          <Text style={s.sectionSub}>
            Missões de alto risco. Ativadas manualmente pela Forja.
          </Text>
          {bossDefs.length === 0 && (
            <Text style={s.empty}>Nenhum Boss criado. O Sistema aguarda um Monarca corajoso.</Text>
          )}
          {bossDefs.map(def => (
            <DefRow
              key={def.id} def={def}
              onEdit={() => setFormTarget(def)}
              onDelete={() => deleteQuestDefinition(def.id)}
            />
          ))}

        </ScrollView>

        {/* FAB */}
        <TouchableOpacity style={s.fab} onPress={() => setFormTarget('new')} activeOpacity={0.85}>
          <Icon name="plus" size={20} color="#FFFFFF" />
          <Text style={s.fabTxt}> CRIAR NOVA DIRETIVA</Text>
        </TouchableOpacity>

      </SafeAreaView>

      {formTarget !== null && (
        <FormModal
          initial={formTarget === 'new' ? undefined : formTarget}
          onSave={handleSave}
          onClose={() => setFormTarget(null)}
        />
      )}

      {/* ── Regen confirm modal ──────────────────────────────────────────── */}
      <CustomModal
        visible={showRegen}
        title="REGENERAR MISSÕES"
        message={
          'As missões da pool de hoje serão re-sorteadas.\n\n' +
          'As missões core já concluídas mantêm o estado.\n\n' +
          'Limite: 3 regenerações por semana.'
        }
        confirmLabel="REGENERAR"
        confirmIcon="refresh"
        confirmColor={C.neonBlue}
        onConfirm={() => { setShowRegen(false); handleRegenerate() }}
        onCancel={() => setShowRegen(false)}
      />

      {/* ── Regen result modal (success or limit reached) ─────────────── */}
      <CustomModal
        visible={regenResult !== null}
        title={regenResult?.success ? 'SISTEMA ATUALIZADO' : 'LIMITE ATINGIDO'}
        message={
          regenResult?.success
            ? 'As missões de hoje foram recalculadas com o dicionário atual.'
            : (regenResult?.reason ?? 'Não foi possível regenerar.')
        }
        confirmLabel="OK"
        confirmIcon={regenResult?.success ? 'check-circle-outline' : 'alert-circle-outline'}
        confirmColor={regenResult?.success ? C.neonBlue : C.neonRed}
        onConfirm={() => setRegenResult(null)}
        onCancel={() => setRegenResult(null)}
      />

      {/* ── Reset confirm modal ──────────────────────────────────────────── */}
      <CustomModal
        visible={showReset}
        title="RESTAURAR PADRÕES"
        message={
          'Repõe o dicionário original do Sistema.\n\nToda a personalização será perdida permanentemente.'
        }
        confirmLabel="RESTAURAR"
        confirmIcon="restore"
        confirmColor={C.neonRed}
        onConfirm={confirmReset}
        onCancel={() => setShowReset(false)}
      />
    </Modal>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: '#080d14' },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTxt:    { flex: 1, color: C.gold, fontFamily: FONT.orbitron, fontSize: 13, letterSpacing: 3 },
  closeBtn:     { padding: 6 },
  content:      { padding: SPACING.md, paddingBottom: 110 },

  actionRow:    { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  actionBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 13, borderWidth: 1 },
  regenBtn:     { borderColor: C.neonBlue + '55', backgroundColor: C.neonBlue + '0c' },
  resetBtn:     { borderColor: '#1e293b', backgroundColor: '#0f172a' },
  actionTxt:    { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },

  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 },
  sectionDot:   { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { flex: 1, color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  sectionCount: { color: '#64748b', fontFamily: FONT.orbitron, fontSize: 10 },
  sectionSub:   { color: '#475569', fontSize: 11, marginBottom: SPACING.sm },
  empty:        { color: '#475569', fontSize: 11, fontStyle: 'italic', marginBottom: SPACING.sm },

  fab: {
    position: 'absolute', bottom: 24, left: SPACING.md, right: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#6d28d9',   // rich purple — distinct from gold
    borderRadius: 14, paddingVertical: 16,
    shadowColor: '#6d28d9', shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  fabTxt: { color: '#FFFFFF', fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
})

const dr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', padding: SPACING.sm, marginBottom: 8, gap: SPACING.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info:     { flex: 1 },
  title:    { color: '#e2e8f0', fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  desc:     { color: '#64748b', fontSize: 11 },
  meta:     { color: '#334155', fontSize: 10, marginTop: 3 },
  actions:  { flexDirection: 'row', gap: 6, flexShrink: 0 },
  editBtn:  { padding: 8, borderWidth: 1, borderColor: C.neonBlue + '44', borderRadius: 8, backgroundColor: C.neonBlue + '0a' },
  deleteBtn:{ padding: 8, borderWidth: 1, borderColor: C.neonRed  + '44', borderRadius: 8, backgroundColor: C.neonRed  + '0a' },
})

const fm = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: '#000000e8', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#0a0f1a', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '94%', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#1e293b' },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  headerTxt: { flex: 1, color: C.gold, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2 },
  closeBtn:  { padding: 6 },
  body:      { padding: SPACING.md, paddingBottom: 32 },

  label:     { color: '#00D4FF', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, marginBottom: 8, marginTop: SPACING.md },
  hint:      { color: '#334155', fontFamily: FONT.system, fontSize: 9, letterSpacing: 0 },

  // Clean input: thin border, proper padding for fingers
  input:     {
    backgroundColor: '#0f172a',
    borderWidth: 1, borderColor: '#1e293b', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: '#FFFFFF', fontSize: 14, marginBottom: 4,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },

  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  row2:     { flexDirection: 'row', gap: SPACING.sm },
  col:      { flex: 1 },

  // Scaling inputs
  scalingHint:    { color: '#64748b', fontSize: 10, fontFamily: FONT.orbitron, letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  scalingRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scalingInput:   { flex: 1, marginBottom: 0 },
  scalingUnit:    { color: '#64748b', fontSize: 11, minWidth: 38 },
  scalingPreview: { color: '#22c55e', fontSize: 10, fontFamily: FONT.orbitron, letterSpacing: 1, marginTop: 6, marginBottom: 4 },

  daysRow:  { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  dayBtn:   { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  dayBtnActive: { borderColor: C.neonBlue, backgroundColor: C.neonBlue + '18' },
  dayTxt:   { color: '#475569', fontFamily: FONT.orbitron, fontSize: 8 },
  dayTxtActive: { color: C.neonBlue },

  // Save button — solid purple/blue gradient-feel
  saveBtn:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#4f46e5',   // indigo — clean, bold
    borderRadius: 14, paddingVertical: 16, marginTop: SPACING.lg,
    shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  saveTxt:  { color: '#FFFFFF', fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  labelRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, marginTop: SPACING.md },
  lockBadge:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.border + '44', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  lockTxt:         { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
  chipRowLocked:   { opacity: 0.45 },

  shadowDivider:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  shadowDividerLine: { flex: 1, height: 1, backgroundColor: C.purple + '44' },
  shadowDividerTxt:  { color: C.purple, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  shadowHint:        { color: C.dimmed, fontSize: 11, lineHeight: 16, marginBottom: SPACING.sm },
  shadowPreview:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.purple + '15', borderWidth: 1, borderColor: C.purple + '44', borderRadius: 4, padding: SPACING.sm, marginTop: SPACING.sm },
  shadowPreviewTxt:  { color: C.purple, fontFamily: FONT.orbitron, fontSize: 11, flex: 1 },
  shadowRankBadge:   { borderWidth: 1, borderColor: C.purple + '55', borderRadius: 2, paddingHorizontal: 5, paddingVertical: 2 },
  shadowRankTxt:     { color: C.purple, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
})

// Chip styles (shared component)
const ch = StyleSheet.create({
  base:     { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  catBase:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  inactive: { borderColor: '#1e293b', backgroundColor: '#0f172a' },
  txt:      { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
})
