import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, AppState, AppStateStatus,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { NativeModules } from 'react-native'
import useGameStore from '../store/useGameStore'
import CustomModal from '../components/CustomModal'
import SystemAlertModal, { AlertButton } from '../components/SystemAlertModal'
import { C, FONT, SPACING } from '../theme'

const { FocusBlocker } = NativeModules as {
  FocusBlocker: {
    hasUsagePermission:       () => Promise<boolean>
    hasOverlayPermission:     () => Promise<boolean>
    requestUsagePermission:   () => Promise<boolean>
    requestOverlayPermission: () => Promise<boolean>
    startFocusMode:     (pkgs: string[], durationMs: number, isPenalty: boolean) => Promise<boolean>
    stopFocusMode:      () => Promise<boolean>
    isFocusModeActive:  () => Promise<boolean>
    updateBlockedApps:  (pkgs: string[]) => Promise<boolean>
    getInstalledApps:   () => Promise<Array<{ pkg: string; label: string }>>
  }
}

// ── Preset apps (fallback when native enumeration fails or returns empty) ───────

const PRESET_APPS = [
  { pkg: 'com.instagram.android',      label: 'Instagram',   icon: 'instagram'  },
  { pkg: 'com.zhiliaoapp.musically',   label: 'TikTok',      icon: 'music-note' },
  { pkg: 'com.twitter.android',        label: 'X / Twitter', icon: 'twitter'    },
  { pkg: 'com.facebook.katana',        label: 'Facebook',    icon: 'facebook'   },
  { pkg: 'com.google.android.youtube', label: 'YouTube',     icon: 'youtube'    },
  { pkg: 'com.snapchat.android',       label: 'Snapchat',    icon: 'snapchat'   },
  { pkg: 'com.whatsapp',               label: 'WhatsApp',    icon: 'whatsapp'   },
  { pkg: 'com.discord',                label: 'Discord',     icon: 'discord'    },
  { pkg: 'com.netflix.mediaclient',    label: 'Netflix',     icon: 'netflix'    },
  { pkg: 'com.reddit.frontpage',       label: 'Reddit',      icon: 'reddit'     },
]

const HARDCORE_DURATION_MS = 24 * 60 * 60_000  // infinite = 24h ceiling; native stops when user breaks

// ── App Selector — absolute full-screen overlay (no Modal) ────────────────────
// Using StyleSheet.absoluteFill avoids the MIUI Modal rendering pipeline
// that caused the bottom sheet to appear blank or clipped.

type AppEntry = { pkg: string; label: string; icon: string }

function AppSelectorOverlay({
  blockedApps,
  onToggle,
  onClose,
}: {
  blockedApps: string[]
  onToggle:    (pkg: string) => void
  onClose:     () => void
}) {
  const [displayApps, setDisplayApps] = useState<AppEntry[]>(PRESET_APPS)
  const [loading, setLoading]         = useState(true)
  const [customPkg, setCustomPkg]     = useState('')
  const [search, setSearch]           = useState('')
  const [showOnlySelected, setShowOnlySelected] = useState(false)

  const loadApps = useCallback(() => {
    setLoading(true)
    if (!FocusBlocker?.getInstalledApps) {
      setDisplayApps(PRESET_APPS)
      setLoading(false)
      return
    }
    FocusBlocker.getInstalledApps()
      .then(apps => {
        if (!apps || apps.length === 0) {
          setDisplayApps(PRESET_APPS)
          return
        }
        const merged: AppEntry[] = apps.map(a => {
          const preset = PRESET_APPS.find(p => p.pkg === a.pkg)
          return { pkg: a.pkg, label: a.label || a.pkg, icon: preset?.icon ?? 'android' }
        })
        merged.sort((a, b) => a.label.localeCompare(b.label))
        setDisplayApps(merged)
      })
      .catch(() => setDisplayApps(PRESET_APPS))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadApps() }, [loadApps])

  const installedPkgs = new Set(displayApps.map(a => a.pkg))
  const customApps    = blockedApps.filter(p => !installedPkgs.has(p))

  let displayList = displayApps
  if (showOnlySelected) {
    displayList = displayList.filter(a => blockedApps.includes(a.pkg))
  }

  const filtered = search.trim()
    ? displayList.filter(a =>
        a.label.toLowerCase().includes(search.toLowerCase()) ||
        a.pkg.toLowerCase().includes(search.toLowerCase())
      )
    : displayList

  function addCustom() {
    const pkg = customPkg.trim()
    if (!pkg) return
    if (!blockedApps.includes(pkg)) onToggle(pkg)
    setCustomPkg('')
  }

  return (
    <View style={ov.container}>

      {/* ── Fixed header bar ──────────────────────────────────────────────── */}
      <View style={ov.header}>
        <TouchableOpacity style={ov.headerBtn} onPress={onClose}>
          <Text style={ov.headerBtnTxtClose}>X</Text>
        </TouchableOpacity>

        <View style={ov.headerCenter}>
          <Icon name="shield-lock-outline" size={14} color={C.neonBlue} />
          <Text style={ov.headerTitle}> OLHO DO MONARCA</Text>
        </View>

        <TouchableOpacity style={[ov.headerBtn, ov.saveBtn]} onPress={onClose}>
          <Text style={ov.headerBtnTxtSave}>GUARDAR</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <View style={ov.searchRow}>
        <Icon name="magnify" size={16} color="#64748b" />
        <TextInput
          style={ov.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar app..."
          placeholderTextColor="#334155"
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={16} color="#64748b" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[ov.filterBtn, showOnlySelected && ov.filterBtnActive]} 
          onPress={() => setShowOnlySelected(!showOnlySelected)}
        >
          <Icon name="filter-variant" size={16} color={showOnlySelected ? C.neonBlue : '#64748b'} />
        </TouchableOpacity>
        <TouchableOpacity style={ov.reloadBtn} onPress={loadApps} disabled={loading}>
          <Icon name="reload" size={15} color={loading ? '#334155' : C.neonBlue} />
        </TouchableOpacity>
      </View>

      {/* ── Status bar ────────────────────────────────────────────────────── */}
      <View style={ov.statusBar}>
        {loading ? (
          <Text style={ov.statusTxt}>A varrer o território...</Text>
        ) : (
          <Text style={ov.statusTxt}>
            {filtered.length} apps  ·  {blockedApps.length} selecionada{blockedApps.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {loading ? (
        <View style={ov.loadingBlock}>
          <Icon name="eye-outline" size={32} color={C.purple} />
          <Text style={ov.loadingTxt}>A varrer o território...</Text>
          <Text style={ov.loadingSub}>A enumerar {PRESET_APPS.length}+ apps instaladas</Text>
        </View>
      ) : (

        /* ── App list — ScrollView + .map() avoids FlatList MIUI bugs ───── */
        <ScrollView
          style={ov.list}
          contentContainerStyle={ov.listContent}
          keyboardShouldPersistTaps="handled"
        >

          {/* Empty state — force scan button */}
          {filtered.length === 0 && !loading && (
            <View style={ov.emptyBlock}>
              <Icon name="eye-off-outline" size={32} color="#334155" />
              <Text style={ov.emptyTxt}>Nenhuma app encontrada.</Text>
              <TouchableOpacity style={ov.forceScanBtn} onPress={loadApps}>
                <Icon name="radar" size={18} color="#FFFFFF" />
                <Text style={ov.forceScanTxt}> FORÇAR VARRAGEM DE TERRITÓRIO</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* App rows */}
          {filtered.map(item => {
            const active = blockedApps.includes(item.pkg)
            return (
              <TouchableOpacity
                key={item.pkg}
                style={[ov.row, active && ov.rowActive]}
                onPress={() => onToggle(item.pkg)}
                activeOpacity={0.7}
              >
                <Icon
                  name={item.icon}
                  size={22}
                  color={active ? '#22c55e' : '#475569'}
                />
                <View style={ov.rowInfo}>
                  <Text
                    numberOfLines={1}
                    style={[ov.rowLabel, active && ov.rowLabelActive]}
                  >
                    {item.label}
                  </Text>
                  <Text numberOfLines={1} style={ov.rowPkg}>
                    {item.pkg}
                  </Text>
                </View>
                {active
                  ? <Icon name="check-circle" size={24} color="#22c55e" />
                  : <Icon name="circle-outline" size={24} color="#1e293b" />
                }
              </TouchableOpacity>
            )
          })}

          {/* Custom (manually added) packages */}
          {customApps.map(pkg => (
            <TouchableOpacity
              key={pkg}
              style={[ov.row, ov.rowActive]}
              onPress={() => onToggle(pkg)}
              activeOpacity={0.7}
            >
              <Icon name="package-variant" size={22} color={C.purple} />
              <View style={ov.rowInfo}>
                <Text numberOfLines={1} style={[ov.rowLabel, ov.rowLabelActive]}>
                  {pkg}
                </Text>
                <Text style={ov.rowPkg}>personalizado</Text>
              </View>
              <Icon name="check-circle" size={24} color={C.purple} />
            </TouchableOpacity>
          ))}

          {/* Add custom package input */}
          <View style={ov.customRow}>
            <Icon name="plus-circle-outline" size={18} color="#475569" />
            <TextInput
              style={ov.customInput}
              value={customPkg}
              onChangeText={setCustomPkg}
              placeholder="com.exemplo.app"
              placeholderTextColor="#334155"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={addCustom}
            />
            <TouchableOpacity style={ov.addBtn} onPress={addCustom}>
              <Text style={ov.addBtnTxt}>ADICIONAR</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}
    </View>
  )
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function FocusScreen() {
  const blockedApps        = useGameStore(s => s.system.blockedApps)
  const toggleApp          = useGameStore(s => s.toggleBlockedApp)
  const setFocusActive     = useGameStore(s => s.setFocusModeActive)
  const setHardcoreMode    = useGameStore(s => s.setHardcoreFocusMode)
  const focusActive        = useGameStore(s => s.system.focusModeActive)
  const hardcoreFocusMode  = useGameStore(s => s.system.hardcoreFocusMode)
  const hardcorePunished   = useGameStore(s => s.system.hardcorePunished)
  const hasPenalty         = useGameStore(s => s.system.hasPenalty)
  const penaltyBlockEnd    = useGameStore(s => s.system.penaltyBlockEnd)
  const triggerEvent       = useGameStore(s => s.triggerEvent)

  const [nowMs, setNowMs] = useState(Date.now())
  useEffect(() => {
    if (!hasPenalty || penaltyBlockEnd <= 0) return
    const iv = setInterval(() => setNowMs(Date.now()), 60_000)
    return () => clearInterval(iv)
  }, [hasPenalty, penaltyBlockEnd])

  const penaltyRemainingMs  = hasPenalty && penaltyBlockEnd > 0 ? Math.max(penaltyBlockEnd - nowMs, 0) : 0
  const penaltyRemainingH   = Math.ceil(penaltyRemainingMs / 3_600_000)

  const lastFocusDuration = useGameStore(s => s.settings.lastFocusDuration)
  const updateSettings    = useGameStore(s => s.updateSettings)

  const [hasUsage,       setHasUsage]       = useState(false)
  const [hasOverlay,     setHasOverlay]     = useState(false)
  const [hours,          setHours]          = useState(() => lastFocusDuration?.hours   ?? 0)
  const [minutes,        setMinutes]        = useState(() => lastFocusDuration?.minutes ?? 25)
  const [editingField,   setEditingField]   = useState<'hours' | 'minutes' | null>(null)
  const [inputValue,     setInputValue]     = useState('')
  const [hardcoreToggle, setHardcoreToggle] = useState(false)
  const [showAppOverlay, setShowAppOverlay] = useState(false)
  const [showBreakModal, setShowBreakModal] = useState(false)
  const [alertCfg, setAlertCfg] = useState<{ title: string; message?: string; buttons?: AlertButton[] } | null>(null)
  const appStateRef   = useRef(AppState.currentState)
  const hoursInputRef = useRef<TextInput>(null)
  const minsInputRef  = useRef<TextInput>(null)

  function openInput(field: 'hours' | 'minutes') {
    setEditingField(field)
    setInputValue(field === 'hours' ? String(hours) : String(minutes))
    setTimeout(() => {
      (field === 'hours' ? hoursInputRef : minsInputRef).current?.focus()
    }, 50)
  }

  function applyInput(field: 'hours' | 'minutes') {
    setEditingField(null)
    const raw = parseInt(inputValue, 10)
    if (isNaN(raw)) return
    if (field === 'hours') {
      const h = Math.min(Math.max(raw, 0), 24)
      setHours(h)
      if (h === 24) setMinutes(0)
    } else {
      const m = Math.min(Math.max(raw, 0), hours === 24 ? 0 : 59)
      setMinutes(m)
    }
  }

  function incrementHours() {
    setHours(h => {
      const next = h >= 24 ? 0 : h + 1
      if (next === 24) setMinutes(0)
      return next
    })
  }
  function decrementHours() {
    setHours(h => {
      const next = h <= 0 ? 24 : h - 1
      if (next === 24) setMinutes(0)
      return next
    })
  }
  function incrementMinutes() {
    if (hours === 24) return
    setMinutes(m => m >= 55 ? 0 : m + 5)
  }
  function decrementMinutes() {
    if (hours === 24) return
    setMinutes(m => m <= 0 ? 55 : m - 5)
  }

  useEffect(() => { checkPerms() }, [])

  // Fix: detect when native focus ends naturally (AppState becomes active again)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        if (focusActive && FocusBlocker) {
          FocusBlocker.isFocusModeActive().then(active => {
            if (!active) {
              setFocusActive(false)
              setHardcoreMode(false)
            }
          }).catch(() => {})
        }
      }
      appStateRef.current = next
    })
    return () => sub.remove()
  }, [focusActive, setFocusActive, setHardcoreMode])

  useEffect(() => {
    if (!focusActive || !FocusBlocker) return
    FocusBlocker.updateBlockedApps(blockedApps).catch(() => {})
  }, [blockedApps, focusActive])

  async function checkPerms() {
    if (!FocusBlocker) return
    const [u, o] = await Promise.all([
      FocusBlocker.hasUsagePermission(),
      FocusBlocker.hasOverlayPermission(),
    ])
    setHasUsage(u)
    setHasOverlay(o)
  }

  async function startFocus() {
    if (!hasUsage) {
      setAlertCfg({
        title: 'Permissão necessária',
        message: 'Ativa o acesso a estatísticas de uso nas Definições.',
        buttons: [
          { text: 'Abrir',    onPress: () => FocusBlocker.requestUsagePermission().then(checkPerms) },
          { text: 'Cancelar', style: 'cancel' },
        ],
      })
      return
    }
    if (!hasOverlay) {
      setAlertCfg({
        title: 'Permissão necessária',
        message: 'Permite que esta app apareça sobre outras apps.',
        buttons: [
          { text: 'Abrir',    onPress: () => FocusBlocker.requestOverlayPermission().then(checkPerms) },
          { text: 'Cancelar', style: 'cancel' },
        ],
      })
      return
    }
    if (blockedApps.length === 0) {
      setAlertCfg({ title: 'Nenhuma app selecionada', message: 'Seleciona pelo menos uma app para bloquear.' })
      return
    }
    const dur = hardcoreToggle || hardcorePunished
      ? HARDCORE_DURATION_MS
      : (hours * 60 + minutes) * 60_000
    if (!hardcoreToggle && !hardcorePunished && dur < 60_000) {
      setAlertCfg({ title: 'Duração inválida', message: 'Define pelo menos 1 minuto de duração.' })
      return
    }
    if (!hardcoreToggle && !hardcorePunished) {
      updateSettings({ lastFocusDuration: { hours, minutes } })
    }
    await FocusBlocker.startFocusMode(blockedApps, dur, hardcorePunished)
    setFocusActive(true)
    setHardcoreMode(hardcoreToggle)
    const hour = new Date().getHours()
    if (hour >= 1 && hour < 6) {
      triggerEvent('focus_started_after_1am')
    }
  }

  async function stopFocus() {
    await FocusBlocker.stopFocusMode()
    setFocusActive(false)
    setHardcoreMode(false)
  }

  function handleHardcoreBreak() { setShowBreakModal(true) }

  function confirmHardcoreBreak() {
    setShowBreakModal(false)
    stopFocus()
  }

  const permsOk       = hasUsage && hasOverlay
  const selectedCount = blockedApps.length

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>

      {/* ── Main scroll content ─────────────────────────────────────────────── */}
      <ScrollView contentContainerStyle={s.content}>

        {/* Activate / Stop button */}
        {focusActive ? (
          hardcoreFocusMode ? (
            <TouchableOpacity style={[s.mainBtn, s.hardcoreStopBtn]} onPress={handleHardcoreBreak}>
              <Icon name="shield-lock" size={18} color={C.neonRed} />
              <Text style={[s.mainBtnTxt, { color: C.neonRed }]}> QUEBRAR JURAMENTO</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.mainBtn, s.stopBtn]} onPress={stopFocus}>
              <Icon name="stop-circle-outline" size={18} color={C.neonRed} />
              <Text style={[s.mainBtnTxt, { color: C.neonRed }]}> PARAR FOCUS MODE</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            style={[s.mainBtn, !permsOk && s.mainBtnDisabled]}
            onPress={startFocus}
          >
            <Icon name="play-circle-outline" size={18} color={C.neonBlue} />
            <Text style={s.mainBtnTxt}> ATIVAR FOCUS MODE</Text>
          </TouchableOpacity>
        )}

        {/* Penalty banner */}
        {hasPenalty && penaltyRemainingMs > 0 && (
          <View style={s.penaltyBanner}>
            <Icon name="skull-crossbones" size={14} color={C.neonRed} />
            <View style={{ marginLeft: 8 }}>
              <Text style={s.penaltyBannerTxt}>
                PENITÊNCIA ATIVA: {penaltyRemainingH} {penaltyRemainingH === 1 ? 'HORA' : 'HORAS'} RESTANTES
              </Text>
              <Text style={s.penaltyBannerSub}>Completa sessões Focus para reduzir o bloqueio</Text>
            </View>
          </View>
        )}

        {/* Active banner */}
        {focusActive && (
          <View style={[s.activeBanner, hardcoreFocusMode && s.activeBannerHardcore]}>
            <Icon
              name={hardcoreFocusMode ? 'skull' : 'lightning-bolt'}
              size={14}
              color={hardcoreFocusMode ? C.neonRed : C.green}
            />
            <Text style={[s.activeTxt, hardcoreFocusMode && { color: C.neonRed }]}>
              {hardcoreFocusMode ? ' HARDCORE MODE ATIVO' : ' FOCUS MODE ATIVO'}
            </Text>
          </View>
        )}

        {/* Show locked indicator while focus+hardcore active */}
        {focusActive && hardcoreFocusMode && hardcorePunished && (
          <View style={s.punishBanner}>
            <Icon name="skull" size={12} color={C.neonRed} />
            <Text style={s.punishBannerTxt}> HARDCORE ATIVO POR PUNIÇÃO — NÃO PODE SER DESLIGADO</Text>
          </View>
        )}

        {/* Section title */}
        <View style={s.titleRow}>
          <Icon name="shield-lock" size={16} color={C.neonBlue} />
          <Text style={s.title}> FOCUS MODE</Text>
        </View>

        {/* Native module missing warning */}
        {!FocusBlocker && (
          <View style={s.warnBox}>
            <Icon name="alert-circle-outline" size={14} color={C.neonRed} />
            <Text style={s.warnTxt}> Módulo nativo não encontrado. Re-builda o APK.</Text>
          </View>
        )}

        {/* Duration selector — hidden in hardcore mode */}
        {!hardcoreToggle && !hardcorePunished && (
          <>
            <Text style={s.section}>DURAÇÃO</Text>
            <View style={s.durRow}>
              {/* Hours */}
              <View style={s.durPicker}>
                <TouchableOpacity style={s.durPickerBtn} onPress={() => !focusActive && incrementHours()} disabled={focusActive}>
                  <Text style={s.durPickerArrow}>▲</Text>
                </TouchableOpacity>
                {editingField === 'hours' ? (
                  <TextInput
                    ref={hoursInputRef}
                    style={s.durPickerInput}
                    value={inputValue}
                    onChangeText={v => setInputValue(v.replace(/\D/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    onBlur={() => applyInput('hours')}
                    onSubmitEditing={() => applyInput('hours')}
                  />
                ) : (
                  <TouchableOpacity disabled={focusActive} onPress={() => !focusActive && openInput('hours')}>
                    <Text style={s.durPickerVal}>{String(hours).padStart(2, '0')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.durPickerBtn} onPress={() => !focusActive && decrementHours()} disabled={focusActive}>
                  <Text style={s.durPickerArrow}>▼</Text>
                </TouchableOpacity>
                <Text style={s.durPickerLabel}>h</Text>
              </View>

              <Text style={s.durSep}>:</Text>

              {/* Minutes */}
              <View style={s.durPicker}>
                <TouchableOpacity style={s.durPickerBtn} onPress={() => !focusActive && incrementMinutes()} disabled={focusActive}>
                  <Text style={s.durPickerArrow}>▲</Text>
                </TouchableOpacity>
                {editingField === 'minutes' ? (
                  <TextInput
                    ref={minsInputRef}
                    style={s.durPickerInput}
                    value={inputValue}
                    onChangeText={v => setInputValue(v.replace(/\D/g, '').slice(0, 2))}
                    keyboardType="number-pad"
                    maxLength={2}
                    selectTextOnFocus
                    onBlur={() => applyInput('minutes')}
                    onSubmitEditing={() => applyInput('minutes')}
                  />
                ) : (
                  <TouchableOpacity disabled={focusActive || hours === 24} onPress={() => !focusActive && hours !== 24 && openInput('minutes')}>
                    <Text style={s.durPickerVal}>{String(minutes).padStart(2, '0')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.durPickerBtn} onPress={() => !focusActive && decrementMinutes()} disabled={focusActive}>
                  <Text style={s.durPickerArrow}>▼</Text>
                </TouchableOpacity>
                <Text style={s.durPickerLabel}>m</Text>
              </View>

              <View style={s.durTotal}>
                <Icon name="timer-outline" size={13} color={C.neonBlue} />
                <Text style={s.durTotalTxt}>
                  {' '}{hours > 0 ? `${hours}h ` : ''}{minutes}min
                </Text>
              </View>
            </View>
          </>
        )}

        {/* Hardcore Mode toggle — inline, below duration */}
        {!focusActive && (
          <TouchableOpacity
            style={[s.hardcoreInlineBtn, (hardcoreToggle || hardcorePunished) && s.hardcoreInlineBtnActive]}
            onPress={hardcorePunished ? undefined : () => setHardcoreToggle(v => !v)}
            activeOpacity={hardcorePunished ? 1 : 0.75}
          >
            <Icon
              name={hardcorePunished || hardcoreToggle ? 'skull' : 'skull-outline'}
              size={14}
              color={C.neonRed}
            />
            <View style={{ flex: 1 }}>
              <Text style={s.hardcoreInlineBtnTxt}>
                {hardcorePunished
                  ? 'HARDCORE ATIVO — PUNIÇÃO DO SISTEMA'
                  : hardcoreToggle
                  ? 'MODO HARDCORE ATIVO — TOQUE PARA DESATIVAR'
                  : 'MODO HARDCORE'}
              </Text>
              {!hardcorePunished && (
                <Text style={s.hardcoreInlineSub}>
                  {hardcoreToggle
                    ? 'Foco permanente ativo — pausa desativada até ao fim'
                    : 'Liga para tornar o foco permanente (sem pausa)'
                  }
                </Text>
              )}
            </View>
            {!hardcorePunished && (
              <Icon
                name={hardcoreToggle ? 'toggle-switch' : 'toggle-switch-off'}
                size={24}
                color={hardcoreToggle ? C.neonRed : C.dimmed}
              />
            )}
          </TouchableOpacity>
        )}

        {/* App selector button — always accessible, even during focus */}
        <Text style={s.section}>APPS A BLOQUEAR</Text>
        <TouchableOpacity style={s.appSelectorBtn} onPress={() => setShowAppOverlay(true)}>
          <Icon name="shield-lock-outline" size={16} color={selectedCount > 0 ? C.neonBlue : C.muted} />
          <View style={{ flex: 1 }}>
            <Text style={[s.appSelectorTxt, selectedCount > 0 && { color: '#FFFFFF' }]}>
              {selectedCount > 0
                ? `${selectedCount} app${selectedCount !== 1 ? 's' : ''} configurada${selectedCount !== 1 ? 's' : ''}`
                : 'Nenhuma app configurada'}
            </Text>
            {focusActive && (
              <Text style={s.appSelectorSub}>Podes remover apps durante o Focus Mode</Text>
            )}
          </View>
          <Icon name="chevron-right" size={16} color={C.muted} />
        </TouchableOpacity>

        {/* Permissions */}
        <Text style={s.section}>PERMISSÕES</Text>
        <View style={s.permBlock}>
          <PermRow
            label="Acesso a Uso de Apps"
            ok={hasUsage}
            onFix={() => FocusBlocker?.requestUsagePermission().then(checkPerms)}
          />
          <PermRow
            label="Overlay (Desenhar por cima)"
            ok={hasOverlay}
            onFix={() => FocusBlocker?.requestOverlayPermission().then(checkPerms)}
          />
        </View>

      </ScrollView>

      {/* ── App Selector — absolute overlay, renders on top without Modal ──── */}
      {showAppOverlay && (
        <AppSelectorOverlay
          blockedApps={blockedApps}
          onToggle={toggleApp}
          onClose={() => setShowAppOverlay(false)}
        />
      )}

      {/* ── Hardcore break confirmation modal ──────────────────────────────── */}
      <CustomModal
        visible={showBreakModal}
        title="QUEBRAR JURAMENTO"
        message={
          'Tens a certeza que queres quebrar o teu juramento de Caçador?\n\n' +
          'O Hardcore Mode será desativado.\n\n' +
          'O Sistema lembra tudo.'
        }
        confirmLabel="QUEBRAR JURAMENTO"
        confirmIcon="shield-off-outline"
        confirmColor={C.neonRed}
        onConfirm={confirmHardcoreBreak}
        onCancel={() => {
          triggerEvent('hardcore_cancel_attempt')
          setShowBreakModal(false)
        }}
      />

      {alertCfg && (
        <SystemAlertModal
          title={alertCfg.title}
          message={alertCfg.message}
          buttons={alertCfg.buttons}
          onClose={() => setAlertCfg(null)}
        />
      )}

    </SafeAreaView>
  )
}

// ── PermRow sub-component ──────────────────────────────────────────────────────

function PermRow({ label, ok, onFix }: { label: string; ok: boolean; onFix: () => void }) {
  return (
    <View style={p.row}>
      <Icon
        name={ok ? 'check-circle' : 'close-circle'}
        size={14}
        color={ok ? C.green : C.neonRed}
      />
      <Text style={p.label}>{label}</Text>
      {!ok && (
        <TouchableOpacity onPress={onFix} style={p.fixBtn}>
          <Icon name="cog-outline" size={10} color={C.neonRed} />
          <Text style={p.fixTxt}> FIX</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  content:  { padding: SPACING.md, paddingBottom: SPACING.xl },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, marginTop: SPACING.md },
  title:    { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },

  warnBox:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0505', borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.md },
  warnTxt:  { color: C.neonRed, fontSize: 12 },

  section:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2, marginBottom: SPACING.sm, marginTop: SPACING.md },

  mainBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.neonBlue + '15', borderWidth: 1, borderColor: C.neonBlue, borderRadius: 4, paddingVertical: SPACING.md, marginBottom: SPACING.sm },
  stopBtn:         { borderColor: C.neonRed, backgroundColor: C.neonRed + '15' },
  hardcoreStopBtn: { borderColor: C.neonRed, backgroundColor: '#1a0505', borderWidth: 2 },
  mainBtnDisabled: { opacity: 0.4 },
  mainBtnTxt:      { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 2 },

  activeBanner:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d2a1a', borderWidth: 1, borderColor: C.green + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  activeBannerHardcore: { backgroundColor: '#1a0505', borderColor: C.neonRed + '44' },
  activeTxt:            { color: C.green, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },

  hardcoreRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: C.border, gap: SPACING.sm },
  hardcoreRowPunished: { borderColor: C.neonRed + '66', backgroundColor: '#1a0505' },
  hardcoreInfo:        { flex: 1 },
  hardcoreLabel:       { color: C.muted, fontFamily: FONT.orbitron, fontSize: 11 },
  hardcoreSub:         { color: C.dimmed, fontSize: 10, marginTop: 4, lineHeight: 15 },
  punishBadge:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.neonRed + '22', borderWidth: 1, borderColor: C.neonRed + '55', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  punishTxt:           { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1 },
  punishBanner:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a0505', borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  punishBannerTxt:     { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },

  penaltyBanner:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0505', borderWidth: 1, borderColor: C.neonRed, borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  penaltyBannerTxt: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1, fontWeight: '900' },
  penaltyBannerSub: { color: C.neonRed + 'aa', fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1, marginTop: 2 },

  durRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: 4, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: SPACING.md },
  durPicker:     { alignItems: 'center', gap: 4 },
  durPickerBtn:  { paddingHorizontal: SPACING.md, paddingVertical: 4 },
  durPickerArrow:{ color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11 },
  durPickerVal:   { color: '#fff', fontFamily: FONT.orbitron, fontSize: 32, fontWeight: '900', letterSpacing: 2, minWidth: 54, textAlign: 'center' },
  durPickerInput: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 32, fontWeight: '900', letterSpacing: 2, minWidth: 54, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: C.neonBlue },
  durPickerLabel:{ color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 10 },
  durSep:        { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 28, fontWeight: '900', marginBottom: 12 },
  durTotal:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  durTotalTxt:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 1 },

  appSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, borderWidth: 1, borderColor: C.border, gap: SPACING.sm, marginBottom: 4 },
  appSelectorTxt: { color: C.muted, fontSize: 13 },
  appSelectorSub: { color: C.dimmed, fontSize: 10, marginTop: 2 },

  permBlock: { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, borderWidth: 1, borderColor: C.border, marginBottom: 4 },

  hardcoreFooterBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 16, paddingHorizontal: SPACING.md, borderTopWidth: 1, borderTopColor: C.neonRed + '44', backgroundColor: '#0d0000' },
  hardcoreFooterBtnActive: { backgroundColor: '#1a0000', borderTopColor: C.neonRed },
  hardcoreFooterBtnTxt:    { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1.5, textAlign: 'center', flex: 1 },

  hardcoreInlineBtn:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: '#0d0000', borderWidth: 1, borderColor: C.neonRed + '55', borderRadius: 4, padding: SPACING.md, marginTop: SPACING.sm, marginBottom: 4 },
  hardcoreInlineBtnActive: { borderColor: C.neonRed, backgroundColor: '#1a0000' },
  hardcoreInlineBtnTxt:    { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  hardcoreInlineSub:       { color: C.dimmed, fontSize: 10, marginTop: 3 },
})

const p = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  label:  { flex: 1, color: '#94a3b8', fontSize: 12, marginLeft: SPACING.sm },
  fixBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.neonRed, borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  fixTxt: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
})

// Overlay styles — absolute full-screen, no Modal involved
const ov = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080d14',
    zIndex: 999,
    flexDirection: 'column',
  },

  // Fixed header bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0f1a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    paddingTop: 48,   // clears status bar on most Android devices
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: C.neonBlue,
    fontFamily: FONT.orbitron,
    fontSize: 11,
    letterSpacing: 2,
  },
  headerBtn: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    borderColor: C.neonBlue + '88',
    backgroundColor: C.neonBlue + '18',
  },
  headerBtnTxtClose: {
    color: '#94a3b8',
    fontFamily: FONT.orbitron,
    fontSize: 11,
    fontWeight: '700',
  },
  headerBtnTxtSave: {
    color: C.neonBlue,
    fontFamily: FONT.orbitron,
    fontSize: 10,
    letterSpacing: 1,
  },

  // Search bar
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 0,
  },
  reloadBtn: {
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterBtn: {
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterBtnActive: {
    borderColor: C.neonBlue + '55',
    backgroundColor: C.neonBlue + '18',
  },

  // Status bar
  statusBar: {
    backgroundColor: '#0a0f1a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  statusTxt: {
    color: '#475569',
    fontFamily: FONT.orbitron,
    fontSize: 9,
    letterSpacing: 1,
  },

  // Loading block
  loadingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingTxt: {
    color: C.purple,
    fontFamily: FONT.orbitron,
    fontSize: 12,
    letterSpacing: 2,
  },
  loadingSub: {
    color: '#334155',
    fontSize: 11,
  },

  // App list
  list:        { flex: 1, backgroundColor: '#080d14' },
  listContent: { flexGrow: 1, paddingBottom: 20 },   // reduced massive padding

  // Empty state
  emptyBlock: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTxt: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
  },
  forceScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  forceScanTxt: {
    color: '#FFFFFF',
    fontFamily: FONT.orbitron,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // App row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0f172a',
    gap: SPACING.sm,
    backgroundColor: '#080d14',
  },
  rowActive: {
    backgroundColor: '#0d2818',
    borderBottomColor: '#0d2818',
  },
  rowInfo: { flex: 1 },
  rowLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  rowLabelActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  rowPkg: {
    color: '#334155',
    fontSize: 10,
    marginTop: 2,
  },

  // Custom package input row
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: '#080d14',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  addBtn: {
    backgroundColor: C.neonBlue + '18',
    borderWidth: 1,
    borderColor: C.neonBlue + '55',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addBtnTxt: {
    color: C.neonBlue,
    fontFamily: FONT.orbitron,
    fontSize: 9,
    letterSpacing: 1,
  },
})
