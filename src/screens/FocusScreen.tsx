import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'
import { NativeModules } from 'react-native'
import useGameStore from '../store/useGameStore'
import { C, FONT, SPACING } from '../theme'

const { FocusBlocker } = NativeModules as {
  FocusBlocker: {
    hasUsagePermission:       () => Promise<boolean>
    hasOverlayPermission:     () => Promise<boolean>
    requestUsagePermission:   () => Promise<boolean>
    requestOverlayPermission: () => Promise<boolean>
    startFocusMode: (pkgs: string[], durationMs: number) => Promise<boolean>
    stopFocusMode:  () => Promise<boolean>
    isFocusModeActive: () => Promise<boolean>
  }
}

// ── Preset apps ────────────────────────────────────────────────────────────────

const PRESET_APPS = [
  { pkg: 'com.instagram.android',      label: 'Instagram',  icon: 'instagram' },
  { pkg: 'com.zhiliaoapp.musically',   label: 'TikTok',     icon: 'music-note' },
  { pkg: 'com.twitter.android',        label: 'X / Twitter',icon: 'twitter' },
  { pkg: 'com.facebook.katana',        label: 'Facebook',   icon: 'facebook' },
  { pkg: 'com.google.android.youtube', label: 'YouTube',    icon: 'youtube' },
  { pkg: 'com.snapchat.android',       label: 'Snapchat',   icon: 'snapchat' },
  { pkg: 'com.whatsapp',               label: 'WhatsApp',   icon: 'whatsapp' },
  { pkg: 'com.discord',                label: 'Discord',    icon: 'discord' },
  { pkg: 'com.netflix.mediaclient',    label: 'Netflix',    icon: 'netflix' },
  { pkg: 'com.reddit.frontpage',       label: 'Reddit',     icon: 'reddit' },
]

const DURATION_OPTS = [
  { label: '30 min', ms: 30  * 60_000 },
  { label: '1 h',    ms: 60  * 60_000 },
  { label: '2 h',    ms: 120 * 60_000 },
  { label: '3 h',    ms: 180 * 60_000 },
]

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function FocusScreen() {
  const blockedApps    = useGameStore(s => s.system.blockedApps)
  const toggleApp      = useGameStore(s => s.toggleBlockedApp)
  const setFocusActive = useGameStore(s => s.setFocusModeActive)
  const focusActive    = useGameStore(s => s.system.focusModeActive)

  const [hasUsage,   setHasUsage]   = useState(false)
  const [hasOverlay, setHasOverlay] = useState(false)
  const [durIdx,     setDurIdx]     = useState(1)
  const [customPkg,  setCustomPkg]  = useState('')

  useEffect(() => { checkPerms() }, [])

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
      Alert.alert('Permissão necessária', 'Ativa o acesso a estatísticas de uso nas Definições.', [
        { text: 'Abrir',    onPress: () => FocusBlocker.requestUsagePermission().then(checkPerms) },
        { text: 'Cancelar', style: 'cancel' },
      ])
      return
    }
    if (!hasOverlay) {
      Alert.alert('Permissão necessária', 'Permite que esta app apareça sobre outras apps.', [
        { text: 'Abrir',    onPress: () => FocusBlocker.requestOverlayPermission().then(checkPerms) },
        { text: 'Cancelar', style: 'cancel' },
      ])
      return
    }
    if (blockedApps.length === 0) {
      Alert.alert('Nenhuma app selecionada', 'Seleciona pelo menos uma app para bloquear.')
      return
    }
    const dur = DURATION_OPTS[durIdx].ms
    await FocusBlocker.startFocusMode(blockedApps, dur)
    setFocusActive(true)
  }

  async function stopFocus() {
    await FocusBlocker.stopFocusMode()
    setFocusActive(false)
  }

  function addCustom() {
    const pkg = customPkg.trim()
    if (!pkg) return
    toggleApp(pkg)
    setCustomPkg('')
  }

  const permsOk = hasUsage && hasOverlay

  return (
    <SafeAreaView style={s.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>

        {/* Title */}
        <View style={s.titleRow}>
          <Icon name="shield-lock" size={16} color={C.neonBlue} />
          <Text style={s.title}> FOCUS MODE</Text>
        </View>

        {/* No native module warning */}
        {!FocusBlocker && (
          <View style={s.warnBox}>
            <Icon name="alert-circle-outline" size={14} color={C.neonRed} />
            <Text style={s.warnTxt}> Módulo nativo não encontrado. Re-builda o APK.</Text>
          </View>
        )}

        {/* Permissions */}
        <Text style={s.section}>PERMISSÕES</Text>
        <View style={s.permBlock}>
          <PermRow label="Acesso a Uso de Apps" ok={hasUsage}
            onFix={() => FocusBlocker?.requestUsagePermission().then(checkPerms)} />
          <PermRow label="Overlay (Desenhar por cima)" ok={hasOverlay}
            onFix={() => FocusBlocker?.requestOverlayPermission().then(checkPerms)} />
        </View>

        {/* Duration */}
        <Text style={s.section}>DURAÇÃO</Text>
        <View style={s.durRow}>
          {DURATION_OPTS.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[s.durBtn, i === durIdx && s.durBtnActive]}
              onPress={() => setDurIdx(i)}
            >
              <Icon name="timer-outline" size={12} color={i === durIdx ? C.neonBlue : C.muted} />
              <Text style={[s.durTxt, i === durIdx && s.durTxtActive]}> {d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* App blocklist */}
        <Text style={s.section}>APPS A BLOQUEAR</Text>
        {PRESET_APPS.map(app => (
          <AppRow
            key={app.pkg}
            label={app.label}
            icon={app.icon}
            pkg={app.pkg}
            enabled={blockedApps.includes(app.pkg)}
            onToggle={() => toggleApp(app.pkg)}
          />
        ))}

        {/* Custom package */}
        <View style={s.customRow}>
          <Icon name="package-variant" size={18} color={C.muted} style={{ marginRight: SPACING.sm }} />
          <TextInput
            style={s.customInput}
            value={customPkg}
            onChangeText={setCustomPkg}
            placeholder="com.exemplo.app"
            placeholderTextColor={C.dimmed}
            autoCapitalize="none"
          />
          <TouchableOpacity style={s.addBtn} onPress={addCustom}>
            <Icon name="plus" size={16} color={C.neonBlue} />
          </TouchableOpacity>
        </View>

        {/* Active banner */}
        {focusActive && (
          <View style={s.activeBanner}>
            <Icon name="lightning-bolt" size={14} color={C.green} />
            <Text style={s.activeTxt}> FOCUS MODE ATIVO</Text>
          </View>
        )}

        {/* Start / Stop */}
        {focusActive ? (
          <TouchableOpacity style={[s.mainBtn, s.stopBtn]} onPress={stopFocus}>
            <Icon name="stop-circle-outline" size={18} color={C.neonRed} />
            <Text style={[s.mainBtnTxt, { color: C.neonRed }]}> PARAR FOCUS MODE</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.mainBtn, !permsOk && s.mainBtnDisabled]}
            onPress={startFocus}
          >
            <Icon name="play-circle-outline" size={18} color={C.neonBlue} />
            <Text style={s.mainBtnTxt}> ATIVAR FOCUS MODE</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PermRow({ label, ok, onFix }: { label: string; ok: boolean; onFix: () => void }) {
  return (
    <View style={p.row}>
      <Icon name={ok ? 'check-circle' : 'close-circle'} size={14} color={ok ? C.green : C.neonRed} />
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

function AppRow({ label, icon, pkg, enabled, onToggle }: {
  label: string; icon: string; pkg: string; enabled: boolean; onToggle: () => void
}) {
  return (
    <View style={ar.row}>
      <Icon name={icon} size={18} color={enabled ? C.neonBlue : C.muted} />
      <View style={ar.info}>
        <Text style={[ar.label, enabled && ar.labelActive]}>{label}</Text>
        <Text style={ar.pkg}>{pkg}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: C.border, true: C.neonBlue + '66' }}
        thumbColor={enabled ? C.neonBlue : C.dimmed}
      />
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: C.bg },
  content:   { padding: SPACING.md, paddingBottom: SPACING.xl },

  titleRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  title:     { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 3 },

  warnBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0505', borderWidth: 1, borderColor: C.neonRed + '44', borderRadius: 8, padding: SPACING.sm, marginBottom: SPACING.md },
  warnTxt:   { color: C.neonRed, fontSize: 12 },

  section:   { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2, marginBottom: SPACING.sm, marginTop: SPACING.md },

  permBlock: { backgroundColor: C.panel, borderRadius: 10, padding: SPACING.md, borderWidth: 1, borderColor: C.border, marginBottom: 4 },

  durRow:      { flexDirection: 'row', gap: SPACING.sm, marginBottom: 4 },
  durBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingVertical: 10 },
  durBtnActive:{ borderColor: C.neonBlue, backgroundColor: C.neonBlue + '15' },
  durTxt:      { color: C.muted, fontFamily: FONT.orbitron, fontSize: 8 },
  durTxtActive:{ color: C.neonBlue },

  customRow:   { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm, marginBottom: 4 },
  customInput: { flex: 1, backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: SPACING.sm, paddingVertical: 10, color: '#e2e8f0', fontSize: 12 },
  addBtn:      { marginLeft: SPACING.sm, backgroundColor: C.neonBlue + '15', borderWidth: 1, borderColor: C.neonBlue, borderRadius: 8, padding: 10 },

  activeBanner:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d2a1a', borderWidth: 1, borderColor: C.green + '44', borderRadius: 8, padding: SPACING.sm, marginTop: SPACING.md },
  activeTxt:   { color: C.green, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },

  mainBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.neonBlue + '15', borderWidth: 1, borderColor: C.neonBlue, borderRadius: 10, paddingVertical: SPACING.md, marginTop: SPACING.md },
  stopBtn:         { borderColor: C.neonRed, backgroundColor: C.neonRed + '15' },
  mainBtnDisabled: { opacity: 0.4 },
  mainBtnTxt:      { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 2 },
})

const p = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  label:  { flex: 1, color: '#94a3b8', fontSize: 12, marginLeft: SPACING.sm },
  fixBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.neonRed, borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  fixTxt: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
})

const ar = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.panel, borderRadius: 8, padding: SPACING.sm, marginBottom: 6, borderWidth: 1, borderColor: C.border, gap: SPACING.sm },
  info:        { flex: 1 },
  label:       { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  labelActive: { color: '#e2e8f0' },
  pkg:         { color: C.dimmed, fontSize: 10, marginTop: 2 },
})
