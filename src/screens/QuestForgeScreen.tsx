import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SystemModal from '../components/SystemModal';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import useGameStore, { QuestDefinition, INITIAL_QUEST_DICTIONARY, RankKey } from '../store/useGameStore';
import CustomModal from '../components/CustomModal';
import SystemAlertModal, { AlertButton } from '../components/SystemAlertModal';
import BottomSheetModal from '../components/BottomSheetModal';
import { useTheme, FONT, SPACING } from '../theme';


// ── Config ─────────────────────────────────────────────────────────────────────

const getQuestTypeOpts = (C: any, t: (k: string) => string) => [
  { value: 'training', label: t('ui.quest_type_training'), icon: 'arm-flex', color: C.neonRed },
  { value: 'focus', label: t('ui.quest_type_focus'), icon: 'timer-sand', color: C.purple },
  { value: 'knowledge', label: t('ui.quest_type_knowledge'), icon: 'book-open-variant', color: C.neonBlue },
  { value: 'gps', label: t('ui.quest_type_gps'), icon: 'run-fast', color: C.green },
];


const UNIT_CHIPS = ['reps', 'min', 'km', 'páginas', 'séries', 'horas', 'litros'];

const getDayLabels = (t: (k: string) => string) => [
  t('ui.day_sun'), t('ui.day_mon'), t('ui.day_tue'), t('ui.day_wed'),
  t('ui.day_thu'), t('ui.day_fri'), t('ui.day_sat'),
];

// Popular MaterialCommunityIcons for the icon picker
const ICON_GRID = [
  'sword', 'sword-cross', 'shield', 'shield-cross', 'skull', 'fire', 'water', 'dumbbell', 'run', 'brain',
  'book-open-variant', 'clock-outline', 'heart-pulse', 'lightning-bolt', 'star-four-points', 'target',
  'trophy', 'weight-lifter', 'yoga', 'meditation', 'food-apple', 'cup-water', 'sleep', 'code-tags',
  'briefcase', 'school', 'crosshairs-gps', 'ghost', 'dragon', 'flash',
];

const getRankOpts = (C: any): { value: RankKey; color: string }[] => [
  { value: 'E', color: C.muted },
  { value: 'D', color: C.green },
  { value: 'C', color: C.neonBlue },
  { value: 'B', color: C.purple },
  { value: 'A', color: C.gold },
  { value: 'S', color: C.neonRed },
];

const getBossClassOpts = (C: any, t: (k: string) => string): { value: QuestDefinition['bossClass']; label: string; color: string }[] => [
  { value: 'A', label: 'A-Rank', color: C.gold },
  { value: 'S', label: 'S-Rank', color: C.neonRed },
  { value: 'Event', label: t('ui.boss_class_event'), color: C.neonBlue },
  { value: 'Raid', label: t('ui.boss_class_raid'), color: C.purple },
];

const BLANK_DEF: Omit<QuestDefinition, 'id'> = {
  title: '',
  description: '',
  type: 'pool',
  questType: 'training',
  baseTarget: 10,
  scalingAmount: 0,
  scalingInterval: 1,
  unit: 'reps',
  baseXP: 20,
  baseGold: 8,
  daysOfWeek: undefined,
  rank: undefined,
  bossClass: undefined,
};

// ── Form modal ─────────────────────────────────────────────────────────────────

type FormState = Omit<QuestDefinition, 'id'> & {
  daysRaw: number[]
  shadowName: string
  shadowIcon: string
}

function toFormState(def?: QuestDefinition): FormState {
  if (!def) {return { ...BLANK_DEF, daysRaw: [], shadowName: '', shadowIcon: 'ghost' };}
  return {
    ...def,
    // migrate legacy field
    scalingAmount: def.scalingAmount ?? def.scalingPerLevel ?? 0,
    scalingInterval: def.scalingInterval ?? 1,
    daysRaw: def.daysOfWeek ?? [],
    shadowName: def.shadowName ?? '',
    shadowIcon: def.shadowIcon ?? 'ghost',
  };
}

// Chip — reusable small selectable pill
function Chip({
  label, active, color, onPress, C,
}: {

  label: string
  active: boolean
  color: string
  onPress: () => void
  C: any
}) {
  const ch = getCHStyles(C);
  return (
    <TouchableOpacity
      style={[ch.base, active ? { backgroundColor: color + '22', borderColor: color } : ch.inactive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[ch.txt, { color: active ? color : C.muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}


// CategoryChip — chip with icon + label
function CategoryChip({
  opt, active, onPress, C,
}: {

  opt: any
  active: boolean
  onPress: () => void
  C: any
}) {
  const ch = getCHStyles(C);
  return (
    <TouchableOpacity
      style={[ch.base, ch.catBase, active ? { backgroundColor: opt.color + '22', borderColor: opt.color } : ch.inactive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name={opt.icon} size={13} color={active ? opt.color : C.muted} />
      <Text style={[ch.txt, { color: active ? opt.color : C.muted }]}>{opt.label}</Text>
    </TouchableOpacity>
  );
}


function FormModal({
  initial,
  visible,
  onSave,
  onClose,
  C,
}: {

  initial?: QuestDefinition
  visible: boolean
  onSave: (def: Omit<QuestDefinition, 'id'>) => void
  onClose: () => void
  C: any
}) {
  const fm = getFMStyles(C);
  const ip = getIPStyles(C);
  const { t } = useTranslation('quests');
  const QUEST_TYPE_OPTS = getQuestTypeOpts(C, t);
  const RANK_OPTS = getRankOpts(C);
  const BOSS_CLASS_OPTS = getBossClassOpts(C, t);
  const DAY_LABELS = getDayLabels(t);

  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [alertCfg, setAlertCfg] = useState<{ title: string; message?: string; buttons?: AlertButton[] } | null>(null);

  // Form is initialized via useState lazy init; no effect needed (parent uses key to remount on target change)

  const isCore = form.type === 'core';
  const isBoss = form.type === 'boss';
  const isEditing = !!initial;   // type field locked when editing

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function toggleDay(d: number) {
    const days = form.daysRaw.includes(d)
      ? form.daysRaw.filter(x => x !== d)
      : [...form.daysRaw, d].sort();
    setForm(f => ({ ...f, daysRaw: days }));
  }

  function handleSave() {
    if (!form.title.trim()) {
      setAlertCfg({ title: t('ui.form_title_required'), message: t('ui.form_title_required_msg') });
      return;
    }
    const def: Omit<QuestDefinition, 'id'> = {
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      questType: form.questType,
      baseTarget: Number(form.baseTarget) || 0,
      scalingAmount: Number(form.scalingAmount) || 0,
      scalingInterval: Math.max(1, Number(form.scalingInterval) || 1),
      unit: form.unit.trim() || 'reps',
      baseXP: Number(form.baseXP) || 10,
      baseGold: Number(form.baseGold) || 5,
      daysOfWeek: isCore && form.daysRaw.length > 0 ? form.daysRaw : undefined,
      rank: form.rank ?? undefined,
      bossClass: isBoss ? (form.bossClass ?? 'A') : undefined,
      shadowName: isBoss && form.shadowName.trim() ? form.shadowName.trim() : undefined,
      shadowIcon: isBoss && form.shadowName.trim() ? form.shadowIcon.trim() || 'ghost' : undefined,
    };
    onSave(def);
  }

  return (
    <BottomSheetModal visible={visible} onClose={onClose} contentStyle={{ backgroundColor: 'transparent' }} useNativeModal={false}>
      <KeyboardAvoidingView
        style={{ width: '100%', justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[fm.sheet, { paddingBottom: Math.max(SPACING.xl, insets.bottom + SPACING.sm) }]}>
          {/* ── Header ── */}
          <View style={fm.header}>
            <Icon name="hammer" size={15} color={C.gold} />
            <Text style={fm.headerTxt}>{initial ? ` ${t('ui.form_edit_directive')}` : ` ${t('ui.form_new_directive')}`}</Text>
            <TouchableOpacity onPress={onClose} style={fm.closeBtn}>
              <Icon name="close" size={20} color={C.muted} />
            </TouchableOpacity>

          </View>

          <ScrollView contentContainerStyle={fm.body} keyboardShouldPersistTaps="handled">
            {/* ── TIPO (Core / Pool / Boss) — locked when editing ── */}
            <View style={fm.labelRow}>
              <Text style={fm.label}>{t('ui.form_mission_type')}</Text>
              {isEditing && (
                <View style={fm.lockBadge}>
                  <Icon name="lock-outline" size={10} color={C.dimmed} />
                  <Text style={fm.lockTxt}> {t('ui.form_locked')}</Text>
                </View>
              )}
            </View>
            <View style={[fm.chipRow, isEditing && fm.chipRowLocked]}>
              <Chip
                label={t('ui.form_core_chip')}
                active={form.type === 'core'}
                color={C.neonBlue}
                onPress={() => !isEditing && field('type', 'core')}
                C={C}
              />

              <Chip
                label={t('ui.form_pool_chip')}
                active={form.type === 'pool'}
                color={C.purple}
                onPress={() => !isEditing && field('type', 'pool')}
                C={C}
              />
              <Chip
                label={t('ui.form_boss_chip')}
                active={form.type === 'boss'}
                color={C.neonRed}
                onPress={() => !isEditing && field('type', 'boss')}
                C={C}
              />

            </View>

            {/* ── CATEGORIA ── */}
            <Text style={fm.label}>{t('ui.form_category')}</Text>
            <View style={fm.chipRow}>
              {QUEST_TYPE_OPTS.map(opt => (
                <CategoryChip
                  key={opt.value}
                  opt={opt}
                  active={form.questType === opt.value}
                  onPress={() => field('questType', opt.value as any)}
                  C={C}

                />

              ))}
            </View>

            {/* ── DIFICULDADE ── */}
            <Text style={fm.label}>
              {t('ui.form_difficulty')}{'  '}
              <Text style={fm.hint}>{t('ui.form_difficulty_hint')}</Text>
            </Text>
            <View style={fm.chipRow}>
              <Chip
                label="AUTO"
                active={!form.rank}
                color={C.dimmed}
                onPress={() => field('rank', undefined)}
                C={C}
              />
              {RANK_OPTS.map(r => (
                <Chip
                  key={r.value}
                   label={r.value}
                   active={form.rank === r.value}
                   color={r.color}
                   onPress={() => field('rank', r.value)}
                   C={C}
                 />

              ))}
            </View>

            {/* ── BOSS CLASS (Boss only) ── */}
            {isBoss && (
              <>
                <Text style={fm.label}>{t('ui.form_boss_class')}</Text>
                <View style={fm.chipRow}>
                  {BOSS_CLASS_OPTS.map(bc => (
                    <Chip
                      key={bc.value}
                       label={bc.label}
                       active={form.bossClass === bc.value}
                       color={bc.color}
                       onPress={() => field('bossClass', bc.value)}
                       C={C}
                     />
                  ))}
                </View>
              </>
            )}

            {/* ── TÍTULO ── */}
            <Text style={fm.label}>{t('ui.form_title')}</Text>
            <TextInput
              style={fm.input}
              value={form.title}
              onChangeText={v => field('title', v)}
              placeholder={t('ui.form_title_placeholder')}
              placeholderTextColor={C.muted}
            />


            {/* ── DESCRIÇÃO ── */}
            <Text style={fm.label}>
              {t('ui.form_description')}{'  '}
              <Text style={fm.hint}>{t('ui.form_description_hint')}</Text>
            </Text>
            <TextInput
              style={[fm.input, fm.inputMulti]}
              value={form.description}
              onChangeText={v => field('description', v)}
              placeholder={t('ui.form_description_placeholder')}
              placeholderTextColor={C.muted}
              multiline

              numberOfLines={3}
            />

            {/* ── VALOR BASE + UNIDADE ── */}
            <View style={fm.row2}>
              <View style={fm.col}>
                <Text style={fm.label}>{t('ui.form_base_value')}</Text>
                <TextInput
                  style={fm.input}
                  value={String(form.baseTarget)}
                   onChangeText={v => field('baseTarget', Number(v) || 0)}
                   keyboardType="numeric"
                   placeholder="10"
                   placeholderTextColor={C.muted}
                 />

              </View>
              <View style={fm.col}>
                <Text style={fm.label}>{t('ui.form_xp_gold')}</Text>
                <View style={fm.row2}>
                  <TextInput
                    style={[fm.input, { flex: 1 }]}
                     value={String(form.baseXP)}
                     onChangeText={v => field('baseXP', Number(v) || 0)}
                     keyboardType="numeric"
                     placeholder="20"
                     placeholderTextColor={C.muted}
                   />

                  <TextInput
                    style={[fm.input, { flex: 1 }]}
                     value={String(form.baseGold)}
                     onChangeText={v => field('baseGold', Number(v) || 0)}
                     keyboardType="numeric"
                     placeholder="8"
                     placeholderTextColor={C.muted}
                   />

                </View>
              </View>
            </View>

            {/* ── UNIDADE (Chips) ── */}
            <Text style={fm.label}>{t('ui.form_unit')}</Text>
            <View style={fm.chipRow}>
              {UNIT_CHIPS.map(u => (
                <Chip
                  key={u}
                   label={u}
                   active={form.unit === u}
                   color={C.neonBlue}
                   onPress={() => field('unit', u)}
                   C={C}
                 />

              ))}
            </View>
            <TextInput
              style={[fm.input, { marginTop: 6 }]}
               value={UNIT_CHIPS.includes(form.unit) ? '' : form.unit}
               onChangeText={v => { if (v) {field('unit', v);} }}
               placeholder={t('ui.form_unit_other_placeholder')}
               placeholderTextColor={C.muted}
               autoCapitalize="none"

            />

            {/* ── ESCALAMENTO ── */}
            <Text style={fm.label}>{t('ui.form_scaling')}</Text>
            <View style={fm.row2}>
              <View style={fm.col}>
                <Text style={fm.scalingHint}>{t('ui.form_scaling_increases')}</Text>
                <View style={fm.scalingRow}>
                  <TextInput
                    style={[fm.input, fm.scalingInput]}
                     value={String(form.scalingAmount)}
                     onChangeText={v => field('scalingAmount', Number(v) || 0)}
                     keyboardType="numeric"
                     placeholder="0"
                     placeholderTextColor={C.muted}
                   />

                  <Text style={fm.scalingUnit}>{form.unit || 'unid.'}</Text>
                </View>
              </View>
              <View style={fm.col}>
                <Text style={fm.scalingHint}>{t('ui.form_scaling_every')}</Text>
                <View style={fm.scalingRow}>
                  <TextInput
                    style={[fm.input, fm.scalingInput]}
                     value={String(form.scalingInterval)}
                     onChangeText={v => field('scalingInterval', Math.max(1, Number(v) || 1))}
                     keyboardType="numeric"
                     placeholder="1"
                     placeholderTextColor={C.muted}
                   />

                  <Text style={fm.scalingUnit}>{t('ui.form_scaling_levels')}</Text>
                </View>
              </View>
            </View>
            {(form.scalingAmount > 0) && (
              <Text style={fm.scalingPreview}>
                {t('ui.form_scaling_preview', { amount: form.scalingAmount, unit: form.unit || 'unid.', interval: form.scalingInterval, plural: form.scalingInterval > 1 ? 's' : '' })}
              </Text>
            )}

            {/* ── DIAS DA SEMANA (Core only) ── */}
            {isCore && (
              <>
                <Text style={fm.label}>
                  {t('ui.form_days_of_week')}{'  '}
                  <Text style={fm.hint}>{t('ui.form_days_hint')}</Text>
                </Text>
                <View style={fm.chipRow}>
                  {DAY_LABELS.map((label, i) => (
                    <Chip
                      key={i}
                       label={label}
                       active={form.daysRaw.includes(i)}
                       color={C.neonBlue}
                       onPress={() => toggleDay(i)}
                       C={C}
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
                  <Text style={fm.shadowDividerTxt}>{t('ui.form_shadow_extraction')}</Text>
                  <View style={fm.shadowDividerLine} />
                </View>
                <Text style={fm.shadowHint}>{t('ui.form_shadow_hint')}</Text>
                <Text style={fm.label}>{t('ui.form_shadow_name')}</Text>
                <TextInput
                  style={fm.input}
                   value={form.shadowName}
                   onChangeText={v => field('shadowName', v)}
                   placeholder={t('ui.form_shadow_name_placeholder')}
                   placeholderTextColor={C.muted}
                 />

                <View style={fm.iconLabelRow}>
                  <Text style={fm.label}>{t('ui.form_icon')}</Text>
                  <TouchableOpacity style={fm.iconPickerBtn} onPress={() => setShowIconPicker(true)}>
                    <Icon name="grid" size={11} color={C.purple} />
                    <Text style={fm.iconPickerBtnTxt}> {t('ui.form_icon_grid')}</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={fm.input}
                   value={form.shadowIcon}
                   onChangeText={v => field('shadowIcon', v)}
                   placeholder={t('ui.form_icon_placeholder')}
                   placeholderTextColor={C.muted}
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
              <Icon name="check-bold" size={18} color={C.text.inverse} />
              <Text style={fm.saveTxt}>{initial ? ` ${t('ui.form_save')}` : ` ${t('ui.form_create')}`}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* ── Icon Picker Modal ── */}
      {showIconPicker && (
        <SystemModal visible onRequestClose={() => setShowIconPicker(false)} useNativeModal={false}>
          <View style={ip.card}>
            <View style={ip.header}>
              <Text style={ip.headerTxt}> {t('ui.icon_library')}</Text>
              <TouchableOpacity onPress={() => setShowIconPicker(false)}>
                <Icon name="close" size={18} color={C.muted} />
              </TouchableOpacity>
            </View>
            <Text style={ip.hint}>{t('ui.icon_library_hint')}</Text>
            <FlatList
              data={ICON_GRID}
              keyExtractor={item => item}
              numColumns={5}
              contentContainerStyle={ip.grid}
              renderItem={({ item: iconName }) => (
                <TouchableOpacity
                  style={[ip.cell, form.shadowIcon === iconName && ip.cellActive]}
                  onPress={() => { field('shadowIcon', iconName); setShowIconPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Icon name={iconName} size={24} color={form.shadowIcon === iconName ? C.purple : C.muted} />
                  <Text style={[ip.cellTxt, form.shadowIcon === iconName && { color: C.purple }]} numberOfLines={1}>
                    {iconName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </SystemModal>
      )}

      {alertCfg && (
        <SystemAlertModal
          title={alertCfg.title}
          message={alertCfg.message}
          buttons={alertCfg.buttons}
          onClose={() => setAlertCfg(null)}
          useNativeModal={false}
          C={C}
        />

      )}
    </BottomSheetModal>
  );
}

// ── Quest definition row ───────────────────────────────────────────────────────

function DefRow({
  def,
  onEdit,
  onDeleteRequest,
  C,
}: {


  def: QuestDefinition
  onEdit: () => void
  onDeleteRequest: () => void
  C: any
}) {
  const dr = getDRStyles(C);
  const { t } = useTranslation('quests');
  const QUEST_TYPE_OPTS = getQuestTypeOpts(C, t);

  const qtCfg = QUEST_TYPE_OPTS.find(o => o.value === def.questType) ?? QUEST_TYPE_OPTS[0];

  return (
    <View style={dr.row}>
      <View style={[dr.iconWrap, { backgroundColor: qtCfg.color + '18' }]}>
        <Icon name={qtCfg.icon} size={18} color={qtCfg.color} />
      </View>
      <View style={dr.info}>
        <Text style={dr.title} numberOfLines={1}>{def.title}</Text>
        <Text style={dr.desc} numberOfLines={1}>{def.description || '—'}</Text>
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
        <TouchableOpacity style={dr.deleteBtn} onPress={onDeleteRequest}>
          <Icon name="trash-can-outline" size={14} color={C.neonRed} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function QuestForgeScreen({ onClose }: { onClose: () => void }) {
  const C = useTheme();
  const { t } = useTranslation('quests');
  const s = getSStyles(C);

  const questDictionary = useGameStore(st => st.questDictionary);
  const addQuestDefinition = useGameStore(st => st.addQuestDefinition);
  const updateQuestDefinition = useGameStore(st => st.updateQuestDefinition);
  const deleteQuestDefinition = useGameStore(st => st.deleteQuestDefinition);

  const [formTarget, setFormTarget] = useState<QuestDefinition | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<QuestDefinition | null>(null);
  const [showReset, setShowReset] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ core: true, pool: true, boss: true });

  const toggleSection = (section: 'core' | 'pool' | 'boss') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const coreDefs = questDictionary.filter(d => d.type === 'core');
  const poolDefs = questDictionary.filter(d => d.type === 'pool');
  const bossDefs = questDictionary.filter(d => d.type === 'boss');

  function handleSave(def: Omit<QuestDefinition, 'id'>) {
    if (formTarget === 'new') {
      addQuestDefinition({ ...def, id: `custom_${Date.now()}` });
    } else if (formTarget) {
      updateQuestDefinition(formTarget.id, def);
    }
    setFormTarget(null);
  }

  function confirmReset() {
    questDictionary.forEach(d => deleteQuestDefinition(d.id));
    INITIAL_QUEST_DICTIONARY.forEach(d => addQuestDefinition(d));
    setShowReset(false);
  }

  return (
    <SystemModal
      visible
      onRequestClose={onClose}
    >
      <View style={s.safeArea}>

        {/* Header */}
        <View style={s.header}>
          <Icon name="hammer-wrench" size={16} color={C.gold} />
          <Text style={s.headerTxt}> {t('ui.forge_screen_title')}</Text>
           <TouchableOpacity onPress={onClose} style={s.closeBtn}>
             <Icon name="close" size={22} color={C.muted} />
           </TouchableOpacity>

        </View>

        <ScrollView contentContainerStyle={s.content}>

          {/* Action row */}
          <View style={s.actionRow}>
             <TouchableOpacity style={[s.actionBtn, s.resetBtn]} onPress={() => setShowReset(true)}>
               <Icon name="restore" size={14} color={C.muted} />
               <Text style={[s.actionTxt, { color: C.muted }]}> {t('ui.restore_btn')}</Text>
             </TouchableOpacity>

          </View>

          {/* Core section */}
          <TouchableOpacity
            style={s.sectionHeader}
            onPress={() => toggleSection('core')}
            activeOpacity={0.7}
          >
            <View style={[s.sectionDot, { backgroundColor: C.neonBlue }]} />
            <Text style={s.sectionTitle}>{t('ui.core_section_title')}</Text>
            <Text style={s.sectionCount}>{coreDefs.length}</Text>
            <Icon name={expandedSections.core ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonBlue} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <Text style={s.sectionSub}>{t('ui.core_section_sub')}</Text>
          {expandedSections.core && (
            <>
              {coreDefs.length === 0 && (
                <Text style={s.empty}>{t('ui.core_empty')}</Text>
              )}
              {coreDefs.map(def => (
                <DefRow
                  key={def.id} def={def}
                  onEdit={() => setFormTarget(def)}
                  onDeleteRequest={() => setDeleteTarget(def)}
                  C={C}
                />
              ))}
            </>
          )}

          {/* Pool section */}
          <TouchableOpacity
            style={[s.sectionHeader, { marginTop: SPACING.lg }]}
            onPress={() => toggleSection('pool')}
            activeOpacity={0.7}
          >
            <View style={[s.sectionDot, { backgroundColor: C.purple }]} />
            <Text style={s.sectionTitle}>{t('ui.pool_section_title')}</Text>
            <Text style={s.sectionCount}>{poolDefs.length}</Text>
            <Icon name={expandedSections.pool ? 'chevron-up' : 'chevron-down'} size={18} color={C.purple} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <Text style={s.sectionSub}>{t('ui.pool_section_sub')}</Text>
          {expandedSections.pool && (
            <>
              {poolDefs.length === 0 && (
                <Text style={s.empty}>{t('ui.pool_empty')}</Text>
              )}
              {poolDefs.map(def => (
                <DefRow
                  key={def.id} def={def}
                  onEdit={() => setFormTarget(def)}
                  onDeleteRequest={() => setDeleteTarget(def)}
                  C={C}
                />
              ))}
            </>
          )}

          {/* Boss section */}
          <TouchableOpacity
            style={[s.sectionHeader, { marginTop: SPACING.lg }]}
            onPress={() => toggleSection('boss')}
            activeOpacity={0.7}
          >
            <View style={[s.sectionDot, { backgroundColor: C.neonRed }]} />
            <Text style={s.sectionTitle}>{t('ui.boss_section_title')}</Text>
            <Text style={s.sectionCount}>{bossDefs.length}</Text>
            <Icon name={expandedSections.boss ? 'chevron-up' : 'chevron-down'} size={18} color={C.neonRed} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <Text style={s.sectionSub}>{t('ui.boss_section_sub')}</Text>
          {expandedSections.boss && (
            <>
              {bossDefs.length === 0 && (
                <Text style={s.empty}>{t('ui.boss_empty')}</Text>
              )}
              {bossDefs.map(def => (
                <DefRow
                  key={def.id} def={def}
                  onEdit={() => setFormTarget(def)}
                  onDeleteRequest={() => setDeleteTarget(def)}
                  C={C}
                />
              ))}
            </>
          )}

        </ScrollView>

        {/* FAB */}
        <TouchableOpacity style={s.fab} onPress={() => setFormTarget('new')} activeOpacity={0.85}>
          <Icon name="plus" size={20} color={C.bg} />
          <Text style={s.fabTxt}> {t('ui.create_directive')}</Text>
        </TouchableOpacity>

      </View>

      <FormModal
        key={formTarget === 'new' ? '__new__' : (typeof formTarget === 'object' && formTarget ? formTarget.id : '__none__')}
        visible={formTarget !== null}
         initial={formTarget && formTarget !== 'new' ? formTarget : undefined}
         onSave={handleSave}
         onClose={() => setFormTarget(null)}
         C={C}
       />


      {/* ── Reset confirm modal ──────────────────────────────────────────── */}
      <CustomModal
        visible={showReset}
        title={t('ui.restore_defaults_title')}
        message={t('ui.restore_defaults_message')}
        confirmLabel={t('ui.restore_confirm')}
        confirmIcon="restore"
        confirmColor={C.neonRed}
        onConfirm={confirmReset}
        onCancel={() => setShowReset(false)}
        useNativeModal={false}
        C={C}
      />


      {/* ── Delete directive confirm ──────────────────────────────────────── */}
      <SystemAlertModal
        visible={!!deleteTarget}
        title={t('ui.delete_directive_title')}
        message={t('ui.delete_directive_message', { title: deleteTarget?.title || '' })}
        buttons={[
          { text: t('ui.cancel'), style: 'cancel' },
          { text: t('ui.delete'), style: 'destructive', onPress: () => { if (deleteTarget) {deleteQuestDefinition(deleteTarget.id);} } },
        ]}
        onClose={() => setDeleteTarget(null)}
        useNativeModal={false}
        C={C}
      />

    </SystemModal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getSStyles = (C: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg, width: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTxt: { flex: 1, color: C.gold, fontFamily: FONT.orbitron, fontSize: 13, letterSpacing: 3 },
  closeBtn: { padding: 6 },
  content: { padding: SPACING.md, paddingBottom: 110 },

  actionRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 13, borderWidth: 1 },
  regenBtn: { borderColor: C.neonBlue + '55', backgroundColor: C.neonBlue + '0c' },
  resetBtn: { borderColor: C.border, backgroundColor: C.panel },
  actionTxt: { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { flex: 1, color: C.text, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  sectionCount: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 10 },
  sectionSub: { color: C.muted, fontSize: 11, marginBottom: SPACING.sm },
  empty: { color: C.muted, fontSize: 11, fontStyle: 'italic', marginBottom: SPACING.sm },

  fab: {
    position: 'absolute', bottom: 24, left: SPACING.md, right: SPACING.md,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.purple,
    borderRadius: 10, paddingVertical: 16,
    shadowColor: C.purple, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8,
  },
  fabTxt: { color: C.bg, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '700', letterSpacing: 2 },
});

const getDRStyles = (C: any) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: SPACING.sm, marginBottom: 8, gap: SPACING.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1 },
  title: { color: C.text, fontFamily: FONT.orbitron, fontSize: 10, fontWeight: '700', marginBottom: 2 },
  desc: { color: C.muted, fontSize: 11 },
  meta: { color: C.dimmed, fontSize: 10, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  editBtn: { padding: 8, borderWidth: 1, borderColor: C.neonBlue + '44', borderRadius: 8, backgroundColor: C.neonBlue + '0a' },
  deleteBtn: { padding: 8, borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 8, backgroundColor: C.neonRed + '0a' },
});

const getCHStyles = (C: any) => StyleSheet.create({
  base: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  catBase: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  inactive: { borderColor: C.border, backgroundColor: C.panel },
  txt: { fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1 },
});

const getFMStyles = (C: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.bg + 'e8', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '94%', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTxt: { flex: 1, color: C.gold, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2 },
  closeBtn: { padding: 6 },
  body: { padding: SPACING.md, paddingBottom: 32 },

  label: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, marginBottom: 8, marginTop: SPACING.md },
  hint: { color: C.dimmed, fontFamily: FONT.system, fontSize: 9, letterSpacing: 0 },

  // Clean input: thin border, proper padding for fingers
  input: {
    backgroundColor: C.panel,
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    color: C.muted, fontSize: 14, marginBottom: 4,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  row2: { flexDirection: 'row', gap: SPACING.sm },
  col: { flex: 1 },

  // Scaling inputs
  scalingHint: { color: C.dimmed, fontSize: 10, fontFamily: FONT.orbitron, letterSpacing: 1, marginBottom: 6, marginTop: 4 },
  scalingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scalingInput: { flex: 1, marginBottom: 0 },
  scalingUnit: { color: C.dimmed, fontSize: 11, minWidth: 38 },
  scalingPreview: { color: C.green, fontSize: 10, fontFamily: FONT.orbitron, letterSpacing: 1, marginTop: 6, marginBottom: 4 },

  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  dayBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface.base },
  dayBtnActive: { borderColor: C.neonBlue, backgroundColor: C.neonBlue + '18' },
  dayTxt: { color: C.text.secondary, fontFamily: FONT.orbitron, fontSize: 10 },
  dayTxtActive: { color: C.neonBlue },

  // Save button — solid purple/blue gradient-feel
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.neonBlue,
    borderRadius: 10, paddingVertical: 16, marginTop: SPACING.lg,
    shadowColor: C.neonBlue, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  saveTxt: { color: C.bg, fontFamily: FONT.orbitron, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  labelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm, marginTop: SPACING.md },
  lockBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.border + '44', borderRadius: 2, paddingHorizontal: 6, paddingVertical: 2 },
  lockTxt: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
  chipRowLocked: { opacity: 0.45 },

  shadowDivider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  shadowDividerLine: { flex: 1, height: 1, backgroundColor: C.purple + '44' },
  shadowDividerTxt: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2 },
  shadowHint: { color: C.dimmed, fontSize: 11, lineHeight: 16, marginBottom: SPACING.sm },
  shadowPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.purple + '15', borderWidth: 1, borderColor: C.purple + '44', borderRadius: 4, padding: SPACING.sm, marginTop: SPACING.sm },
  shadowPreviewTxt: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 11, flex: 1 },
  shadowRankBadge: { borderWidth: 1, borderColor: C.purple + '55', borderRadius: 2, paddingHorizontal: 5, paddingVertical: 2 },
  shadowRankTxt: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },

  iconLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.md, marginBottom: 8 },
  iconPickerBtn: { marginLeft: SPACING.sm, flexDirection: 'row', alignItems: 'center', backgroundColor: C.purple + '18', borderWidth: 1, borderColor: C.purple + '55', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  iconPickerBtnTxt: { color: C.purple, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
});

const getIPStyles = (C: any) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: C.bg + 'f2', justifyContent: 'center', padding: SPACING.md },
  card: { backgroundColor: C.bg, borderRadius: 10, borderWidth: 1, borderColor: C.purple, maxHeight: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: C.border },
  headerTxt: { flex: 1, color: C.purple, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },
  hint: { color: C.dimmed, fontSize: 11, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  grid: { padding: SPACING.sm, paddingBottom: SPACING.lg },
  cell: { flex: 1, alignItems: 'center', padding: SPACING.sm, borderRadius: 4, marginBottom: 4 },
  cellActive: { backgroundColor: C.purple + '18' },
  cellTxt: { color: C.dimmed, fontSize: 7, fontFamily: FONT.orbitron, marginTop: 3, textAlign: 'center' },
});
