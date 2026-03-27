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

import { useTheme, FONT, SPACING } from '../theme'


const { FocusBlocker } = NativeModules as {
  FocusBlocker: {
    hasUsagePermission:          () => Promise<boolean>
    hasOverlayPermission:        () => Promise<boolean>
    hasAccessibilityPermission:  () => Promise<boolean>
    requestUsagePermission:      () => Promise<boolean>
    requestOverlayPermission:    () => Promise<boolean>
    requestAccessibilityPermission: () => Promise<boolean>
    startFocusMode:     (pkgs: string[], startTimeMs: number, endTimeMs: number, isPenalty: boolean) => Promise<boolean>
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

const HARDCORE_DURATION_MS = 365 * 24 * 60 * 60_000  // 1 year — effectively infinite; only ends via quebrar juramento

// ── App Selector — absolute full-screen overlay (no Modal) ────────────────────
// Using StyleSheet.absoluteFill avoids the MIUI Modal rendering pipeline
// that caused the bottom sheet to appear blank or clipped.

type AppEntry = { pkg: string; label: string; icon: string }

function AppSelectorOverlay({
  blockedApps,
  onToggle,
  onClose,
  C,
}: {
  blockedApps: string[]
  onToggle:    (pkg: string) => void
  onClose:     () => void
  C: any
}) {
  const ov = getOVStyles(C)

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
        <Icon name="magnify" size={16} color={C.dimmed} />
        <TextInput
          style={ov.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Pesquisar app..."
          placeholderTextColor={C.dimmed}
          autoCapitalize="none"

        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={16} color={C.dimmed} />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={[ov.filterBtn, showOnlySelected && ov.filterBtnActive]} 
          onPress={() => setShowOnlySelected(!showOnlySelected)}
        >
          <Icon name="filter-variant" size={16} color={showOnlySelected ? C.neonBlue : C.dimmed} />
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
                <Icon name="radar" size={18} color={C.muted} />
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

function formatTimeRemaining(ms: number) {
  const totalSecs = Math.ceil(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatElapsed(ms: number) {
  const totalSecs = Math.floor(ms / 1000)
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function FocusScreen() {
  const C = useTheme()
  const s = React.useMemo(() => getStyles(C), [C])

  const blockedApps        = useGameStore(s => s.system.blockedApps)
  const toggleApp          = useGameStore(s => s.toggleBlockedApp)
  const setFocusActive     = useGameStore(s => s.setFocusModeActive)
  const setHardcoreMode    = useGameStore(s => s.setHardcoreFocusMode)
  const focusActive        = useGameStore(s => s.system.focusModeActive)
  const hardcoreFocusMode  = useGameStore(s => s.system.hardcoreFocusMode)
  const hardcorePunished   = useGameStore(s => s.system.hardcorePunished)
  const hasPenalty         = useGameStore(s => s.system.hasPenalty)
  const penaltyBlockEnd = useGameStore(s => s.system.penaltyBlockEnd)
  const isPenaltyActive = penaltyBlockEnd > Date.now()
  const penaltyMsRemaining = isPenaltyActive ? penaltyBlockEnd - Date.now() : 0
  const triggerEvent       = useGameStore(s => s.triggerEvent)
  const focusEndTime       = useGameStore(s => s.system.focusEndTime)

  const [nowMs, setNowMs] = useState(Date.now())
  useEffect(() => {
    if (!focusActive) return
    setNowMs(Date.now())
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [focusActive])

  const penaltyRemainingH   = Math.ceil(penaltyMsRemaining / 3_600_000)

  const lastFocusDuration = useGameStore(s => s.settings.lastFocusDuration)
  const updateSettings    = useGameStore(s => s.updateSettings)

  const [hasUsage,         setHasUsage]         = useState(false)
  const [hasOverlay,       setHasOverlay]       = useState(false)
  const [hasAccessibility, setHasAccessibility] = useState(false)
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
        checkPerms()
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
    const [u, o, a] = await Promise.all([
      FocusBlocker.hasUsagePermission(),
      FocusBlocker.hasOverlayPermission(),
      FocusBlocker.hasAccessibilityPermission().catch(() => false),
    ])
    setHasUsage(u)
    setHasOverlay(o)
    setHasAccessibility(a)
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
    const start = Date.now()
    const end = start + dur
    await FocusBlocker.startFocusMode(blockedApps, start, end, hardcorePunished)
    setFocusActive(true, end)
    setHardcoreMode(hardcoreToggle)
    const hour = new Date().getHours()
    if (hour >= 1 && hour < 6) {
      triggerEvent('focus_started_after_1am')
    }
  }

  async function stopFocus() {
    // Bloqueia saída do foco durante penalidade ativa
    const isPenaltyBlocking = hasPenalty && isPenaltyActive
    if (isPenaltyBlocking) {
      const hoursRemaining = penaltyRemainingH
      setAlertCfg({
        title: '🔒 FOCO TRAVADO PELA PENALIDADE',
        message: `Você está sob penalidade! Só pode sair do modo foco daqui a ${hoursRemaining}h.\nComplete as missões de penalização para se livrar mais rápido.`,
        buttons: [
          { text: 'Entendi', style: 'destructive' }
        ]
      })
      return
    }

    await FocusBlocker.stopFocusMode()
    setFocusActive(false, 0)
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

        {/* 1. Titulo */}
        <View style={s.titleRow}>
          <Icon name="shield-lock" size={16} color={C.neonBlue} />
          <Text style={s.title}> FOCUS MODE</Text>
        </View>

        {/* Banners */}
        {hasPenalty && penaltyMsRemaining > 0 && (
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
        {focusActive && hardcoreFocusMode && hardcorePunished && (
          <View style={s.punishBanner}>
            <Icon name="skull" size={12} color={C.neonRed} />
            <Text style={s.punishBannerTxt}> HARDCORE ATIVO POR PUNIÇÃO — NÃO PODE SER DESLIGADO</Text>
          </View>
        )}
        {!FocusBlocker && (
          <View style={s.warnBox}>
            <Icon name="alert-circle-outline" size={14} color={C.neonRed} />
            <Text style={s.warnTxt}> Módulo nativo não encontrado. Re-builda o APK.</Text>
          </View>
        )}

        {/* 2. Timer / Duration */}
        {focusActive && focusEndTime ? (
          hardcoreFocusMode ? (
            <View style={[s.countdownBox, { borderColor: C.neonRed + '88' }]}>
              <Text style={[s.countdownTxt, { color: C.neonRed }]}>
                {formatElapsed(nowMs - (focusEndTime - HARDCORE_DURATION_MS))}
              </Text>
              <Text style={{ color: C.neonRed + 'aa', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, marginTop: 6 }}>ATIVO — SEM LIMITE</Text>
            </View>
          ) : (
            <View style={s.countdownBox}>
              <Text style={s.countdownTxt}>
                {formatTimeRemaining(Math.max(0, focusEndTime - nowMs))}
              </Text>
            </View>
          )
        ) : (!hardcoreToggle && !hardcorePunished && (
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
        ))}

        {/* 3. Switch (Hardcore Mode) */}
        {!focusActive && (
          <TouchableOpacity
            style={[s.hardcoreRow, (hardcoreToggle || hardcorePunished) && s.hardcoreRowPunished]}
            onPress={hardcorePunished ? undefined : () => setHardcoreToggle(v => !v)}
            activeOpacity={hardcorePunished ? 1 : 0.75}
          >
            <Icon
              name={hardcorePunished || hardcoreToggle ? 'skull' : 'skull-outline'}
              size={20}
              color={hardcoreToggle || hardcorePunished ? C.neonRed : C.dimmed}
            />
            <View style={s.hardcoreInfo}>
              <Text style={[s.hardcoreLabel, (hardcoreToggle || hardcorePunished) && { color: C.neonRed }]}>
                {hardcorePunished ? 'MODO HARDCORE (PUNIÇÃO ATIVA)' : 'MODO HARDCORE'}
              </Text>
              <Text style={s.hardcoreSub}>
                {hardcorePunished
                  ? 'Ativo por punição. Não pode ser desligado manualmente.'
                  : 'Sem limite de tempo. O contador sobe até quebrares o juramento.'}
              </Text>
            </View>
            {!hardcorePunished && (
              <Icon
                name={hardcoreToggle ? 'toggle-switch' : 'toggle-switch-off-outline'}
                size={28}
                color={hardcoreToggle ? C.neonRed : C.dimmed}
              />
            )}
          </TouchableOpacity>
        )}

        {/* 4. Ativar / Parar Focus Mode */}
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
            style={[s.mainBtn, !permsOk && s.mainBtnDisabled, { marginTop: SPACING.md }]}
            onPress={startFocus}
          >
            <Icon name="play-circle-outline" size={18} color={C.neonBlue} />
            <Text style={s.mainBtnTxt}> ATIVAR FOCUS MODE</Text>
          </TouchableOpacity>
        )}

        {/* 5. Apps a bloquear */}
        <Text style={s.section}>APPS A BLOQUEAR</Text>
        <TouchableOpacity style={s.appSelectorBtn} onPress={() => setShowAppOverlay(true)}>
          <Icon name="shield-lock-outline" size={16} color={selectedCount > 0 ? C.neonBlue : C.muted} />
          <View style={{ flex: 1 }}>
            <Text style={[s.appSelectorTxt, selectedCount > 0 && { color: C.muted }]}>
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

        {/* 6. Card de explicação */}
        <Text style={s.section}>COMO FUNCIONA</Text>
        <View style={s.explanationCard}>
          <View style={{ gap: SPACING.sm, marginBottom: SPACING.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
              <Icon name="lightning-bolt" size={14} color={C.neonBlue} />
              <View style={{ flex: 1 }}>
                <Text style={[s.modeLabel, { color: C.neonBlue }]}>MODO STANDARD</Text>
                <Text style={s.modeDesc}>Bloqueia apps por tempo definido. Podes fazer pausa a qualquer momento.</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
            <Icon name="skull" size={14} color={C.neonRed} />
            <View style={{ flex: 1 }}>
              <Text style={[s.modeLabel, { color: C.neonRed }]}>MODO HARDCORE</Text>
              <Text style={s.modeDesc}>Sem limite de tempo. O contador sobe eternamente. Só termina quando quebrares o juramento — ou conquistares o dia.</Text>
            </View>
          </View>
        </View>

        {/* 7. Permissões */}
        <Text style={s.section}>PERMISSÕES</Text>
        <View style={s.permBlock}>
          <PermRow
            label="Acesso a Uso de Apps"
            ok={hasUsage}
            onFix={() => FocusBlocker?.requestUsagePermission().then(checkPerms)}
            C={C}
          />
          <PermRow
            label="Overlay (Desenhar por cima)"
            ok={hasOverlay}
            onFix={() => FocusBlocker?.requestOverlayPermission().then(checkPerms)}
            C={C}
          />
          <PermRow
            label="Serviço de Acessibilidade (bloqueio fiável)"
            ok={hasAccessibility}
            onFix={() => FocusBlocker?.requestAccessibilityPermission().then(checkPerms)}
            C={C}
            optional
          />
        </View>

      </ScrollView>

      {/* ── App Selector — absolute overlay, renders on top without Modal ──── */}
      {showAppOverlay && (
        <AppSelectorOverlay
          blockedApps={blockedApps}
          onToggle={toggleApp}
          onClose={() => setShowAppOverlay(false)}
          C={C}
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
        C={C}
      />


      {alertCfg && (
        <SystemAlertModal
          title={alertCfg.title}
          message={alertCfg.message}
          buttons={alertCfg.buttons}
          onClose={() => setAlertCfg(null)}
          C={C}
        />
      )}


    </SafeAreaView>
  )
}

// ── PermRow sub-component ──────────────────────────────────────────────────────

function PermRow({ label, ok, onFix, C, optional }: { label: string; ok: boolean; onFix: () => void; C: any; optional?: boolean }) {
  const p = getPRStyles(C)
  const warnColor = optional ? C.gold : C.neonRed
  return (
    <View style={p.row}>
      <Icon
        name={ok ? 'check-circle' : (optional ? 'alert-circle-outline' : 'close-circle')}
        size={14}
        color={ok ? C.green : warnColor}
      />
      <Text style={p.label}>{label}</Text>
      {!ok && (
        <TouchableOpacity onPress={onFix} style={[p.fixBtn, optional && { borderColor: C.gold }]}>
          <Icon name="cog-outline" size={10} color={warnColor} />
          <Text style={[p.fixTxt, optional && { color: C.gold }]}> FIX</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const getStyles = (C: any) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  content:  { padding: SPACING.md, paddingBottom: SPACING.xl },

  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md, marginTop: SPACING.md },
  title:    { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },

  explanationCard: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.md, gap: SPACING.sm },
  modeLabel: { fontFamily: FONT.orbitron, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  modeDesc: { color: C.dimmed, fontSize: 11, lineHeight: 16 },

  warnBox:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface?.base || C.bg, borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.md },
  warnTxt:  { color: C.neonRed, fontSize: 12 },

  section:  { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2, marginBottom: SPACING.sm, marginTop: SPACING.md },

  mainBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.neonBlue + '15', borderWidth: 1, borderColor: C.neonBlue, borderRadius: 4, paddingVertical: SPACING.md, marginBottom: SPACING.sm },
  stopBtn:         { borderColor: C.neonRed, backgroundColor: C.neonRed + '15' },
  hardcoreStopBtn: { borderColor: C.neonRed, backgroundColor: C.surface?.danger || C.bg, borderWidth: 2 },
  mainBtnDisabled: { opacity: 0.4 },
  mainBtnTxt:      { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 2 },

  activeBanner:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface?.success || C.bg, borderWidth: 1, borderColor: C.green + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  activeBannerHardcore: { backgroundColor: C.surface?.danger || C.bg, borderColor: C.neonRed + '44' },
  activeTxt:            { color: C.green, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },

  hardcoreRow:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: C.border, gap: SPACING.sm },
  hardcoreRowPunished: { borderColor: C.neonRed + '66', backgroundColor: C.surface?.danger || C.bg },
  hardcoreInfo:        { flex: 1 },
  hardcoreLabel:       { color: C.muted, fontFamily: FONT.orbitron, fontSize: 11 },
  hardcoreSub:         { color: C.dimmed, fontSize: 10, marginTop: 4, lineHeight: 15 },
  punishBadge:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.neonRed + '22', borderWidth: 1, borderColor: C.neonRed + '55', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  punishTxt:           { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 7, letterSpacing: 1 },
  punishBanner:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface?.danger || C.bg, borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  punishBannerTxt:     { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },

  penaltyBanner:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface?.danger || C.bg, borderWidth: 1, borderColor: C.neonRed, borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  penaltyBannerTxt: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1, fontWeight: '900' },
  penaltyBannerSub: { color: C.neonRed + 'aa', fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1, marginTop: 2 },

  durRow:        { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: 4, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 4, padding: SPACING.md },
  durPicker:     { alignItems: 'center', gap: 4 },
  durPickerBtn:  { paddingHorizontal: SPACING.md, paddingVertical: 4 },
  durPickerArrow:{ color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11 },
  durPickerVal:   { color: C.muted, fontFamily: FONT.orbitron, fontSize: 32, fontWeight: '900', letterSpacing: 2, minWidth: 54, textAlign: 'center' },
  durPickerInput: { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 32, fontWeight: '900', letterSpacing: 2, minWidth: 54, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: C.neonBlue },
  durPickerLabel:{ color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 10 },
  durSep:        { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 28, fontWeight: '900', marginBottom: 12 },
  durTotal:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  durTotalTxt:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 1 },

  countdownBox: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: '#38bdf888', borderRadius: 8, padding: 32, marginBottom: 16 },
  countdownTxt: { fontFamily: FONT.orbitron, fontSize: 48, fontWeight: '900', color: C.neonBlue, letterSpacing: 2 },

  appSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, borderWidth: 1, borderColor: C.border, gap: SPACING.sm, marginBottom: 4 },
  appSelectorTxt: { color: C.muted, fontSize: 13 },
  appSelectorSub: { color: C.dimmed, fontSize: 10, marginTop: 2 },

  permBlock: { backgroundColor: C.panel, borderRadius: 4, padding: SPACING.md, borderWidth: 1, borderColor: C.border, marginBottom: 4 },

  hardcoreFooterBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 16, paddingHorizontal: SPACING.md, borderTopWidth: 1, borderTopColor: C.neonRed + '44', backgroundColor: C.surface?.danger || C.bg },
  hardcoreFooterBtnActive: { backgroundColor: C.surface?.dangerHover || C.bg, borderTopColor: C.neonRed },
  hardcoreFooterBtnTxt:    { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1.5, textAlign: 'center', flex: 1 },

  hardcoreInlineBtn:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: C.surface?.danger || C.bg, borderWidth: 1, borderColor: C.neonRed + '55', borderRadius: 4, padding: SPACING.md, marginTop: SPACING.sm, marginBottom: 4 },
  hardcoreInlineBtnActive: { borderColor: C.neonRed, backgroundColor: C.surface?.dangerHover || C.bg },
  hardcoreInlineBtnTxt:    { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },
  hardcoreInlineSub:       { color: C.dimmed, fontSize: 10, marginTop: 3 },
  
  hardcoreMiniBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 32, paddingVertical: 8, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, alignSelf: 'center', marginBottom: SPACING.md, marginTop: SPACING.sm },
  hardcoreMiniBtnActive: { borderColor: C.neonRed, backgroundColor: C.surface?.danger || C.bg },
  hardcoreMiniTxt: { color: C.dimmed, fontSize: 10, fontFamily: FONT.orbitron, letterSpacing: 1, marginLeft: 6 },
})

const getPRStyles = (C: any) => StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  label:  { flex: 1, color: C.muted, fontSize: 12, marginLeft: SPACING.sm },
  fixBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.neonRed, borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  fixTxt: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
})


// Overlay styles — absolute full-screen, no Modal involved
const getOVStyles = (C: any) => StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.bg,
    zIndex: 999,
    flexDirection: 'column',
  },

  // Fixed header bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.panel,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
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
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    borderColor: C.neonBlue + '88',
    backgroundColor: C.neonBlue + '18',
  },
  headerBtnTxtClose: {
    color: C.muted,
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
    backgroundColor: C.panel,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: C.muted,
    fontSize: 14,
    paddingVertical: 0,
  },
  reloadBtn: {
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterBtn: {
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterBtnActive: {
    borderColor: C.neonBlue + '55',
    backgroundColor: C.neonBlue + '18',
  },

  // Status bar
  statusBar: {
    backgroundColor: C.panel,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  statusTxt: {
    color: C.dimmed,
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
    color: C.dimmed,
    fontSize: 11,
  },

  // App list
  list:        { flex: 1, backgroundColor: C.bg },
  listContent: { flexGrow: 1, paddingBottom: 20 },   // reduced massive padding

  // Empty state
  emptyBlock: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyTxt: {
    color: C.dimmed,
    fontSize: 13,
    textAlign: 'center',
  },
  forceScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.neonRed,
    borderRadius: 4,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  forceScanTxt: {
    color: C.muted,
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
    borderBottomColor: C.border,
    gap: SPACING.sm,
    backgroundColor: C.bg,
  },
  rowActive: {
    backgroundColor: C.surface?.success || C.bg,
    borderBottomColor: C.green + '44',
  },
  rowInfo: { flex: 1 },
  rowLabel: {
    color: C.muted,
    fontSize: 14,
  },
  rowLabelActive: {
    color: C.muted,
    fontWeight: '600',
  },
  rowPkg: {
    color: C.dimmed,
    fontSize: 10,
    marginTop: 2,
  },

  // Custom package input row
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: 8,
  },
  customInput: {
    flex: 1,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.muted,
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

