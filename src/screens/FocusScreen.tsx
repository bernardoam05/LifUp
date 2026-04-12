import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, AppState, AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NativeModules } from 'react-native';
import { useTranslation } from 'react-i18next';
import useGameStore from '../store/useGameStore';
import CustomModal from '../components/CustomModal';
import SystemAlertModal, { AlertButton } from '../components/SystemAlertModal';

import { useTheme, FONT, SPACING } from '../theme';
import { playSound, playAmbient, stopAmbient, AMBIENT_META, type AmbientSoundId } from '../utils/audioService';
import {
  notifyPomodoroBreakStarted,
  schedulePomodoroBreakEndNotification,
  cancelPomodoroNotifications,
} from '../utils/notifications';


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
};

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
];

const HARDCORE_DURATION_MS = 365 * 24 * 60 * 60_000;  // 1 year — effectively infinite; only ends via quebrar juramento

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
  const { t } = useTranslation('screens');
  const ov = getOVStyles(C);

  const [displayApps, setDisplayApps] = useState<AppEntry[]>(PRESET_APPS);
  const [loading, setLoading]         = useState(true);
  const [customPkg, setCustomPkg]     = useState('');
  const [search, setSearch]           = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const loadApps = useCallback(() => {
    setLoading(true);
    if (!FocusBlocker?.getInstalledApps) {
      setDisplayApps(PRESET_APPS);
      setLoading(false);
      return;
    }
    FocusBlocker.getInstalledApps()
      .then(apps => {
        if (!apps || apps.length === 0) {
          setDisplayApps(PRESET_APPS);
          return;
        }
        const merged: AppEntry[] = apps.map(a => {
          const preset = PRESET_APPS.find(p => p.pkg === a.pkg);
          return { pkg: a.pkg, label: a.label || a.pkg, icon: preset?.icon ?? 'android' };
        });
        merged.sort((a, b) => a.label.localeCompare(b.label));
        setDisplayApps(merged);
      })
      .catch(() => setDisplayApps(PRESET_APPS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadApps(); }, [loadApps]);

  const installedPkgs = new Set(displayApps.map(a => a.pkg));
  const customApps    = blockedApps.filter(p => !installedPkgs.has(p));

  let displayList = displayApps;
  if (showOnlySelected) {
    displayList = displayList.filter(a => blockedApps.includes(a.pkg));
  }

  const filtered = search.trim()
    ? displayList.filter(a =>
        a.label.toLowerCase().includes(search.toLowerCase()) ||
        a.pkg.toLowerCase().includes(search.toLowerCase())
      )
    : displayList;

  function addCustom() {
    const pkg = customPkg.trim();
    if (!pkg) {return;}
    if (!blockedApps.includes(pkg)) {onToggle(pkg);}
    setCustomPkg('');
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
          <Text style={ov.headerTitle}> {t('focus.overlay_title')}</Text>
        </View>

        <TouchableOpacity style={[ov.headerBtn, ov.saveBtn]} onPress={onClose}>
          <Text style={ov.headerBtnTxtSave}>{t('focus.overlay_save')}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ────────────────────────────────────────────────────── */}
      <View style={ov.searchRow}>
        <Icon name="magnify" size={16} color={C.dimmed} />
        <TextInput
          style={ov.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={t('focus.overlay_search_placeholder')}
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
          <Text style={ov.statusTxt}>{t('focus.overlay_scanning')}</Text>
        ) : (
          <Text style={ov.statusTxt}>
            {blockedApps.length !== 1
              ? t('focus.overlay_status_plural', { apps: filtered.length, selected: blockedApps.length })
              : t('focus.overlay_status', { apps: filtered.length, selected: blockedApps.length })}
          </Text>
        )}
      </View>

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {loading ? (
        <View style={ov.loadingBlock}>
          <Icon name="eye-outline" size={32} color={C.purple} />
          <Text style={ov.loadingTxt}>{t('focus.overlay_scanning')}</Text>
          <Text style={ov.loadingSub}>{t('focus.overlay_loading_sub', { count: PRESET_APPS.length })}</Text>
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
              <Text style={ov.emptyTxt}>{t('focus.overlay_empty')}</Text>
              <TouchableOpacity style={ov.forceScanBtn} onPress={loadApps}>
                <Icon name="radar" size={18} color={C.muted} />
                <Text style={ov.forceScanTxt}> {t('focus.overlay_force_scan')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* App rows */}
          {filtered.map(item => {
            const active = blockedApps.includes(item.pkg);
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
            );
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
                <Text style={ov.rowPkg}>{t('focus.overlay_custom_label')}</Text>
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
              <Text style={ov.addBtnTxt}>{t('focus.overlay_add_btn')}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      )}
    </View>
  );
}

function formatTimeRemaining(ms: number) {
  const totalSecs = Math.ceil(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;}
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatElapsed(ms: number) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;}
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function FocusScreen() {
  const { t } = useTranslation('screens');
  const C = useTheme();
  const s = React.useMemo(() => getStyles(C), [C]);

  const blockedApps        = useGameStore(st => st.system.blockedApps);
  const toggleApp          = useGameStore(st => st.toggleBlockedApp);
  const setFocusActive     = useGameStore(st => st.setFocusModeActive);
  const setHardcoreMode    = useGameStore(st => st.setHardcoreFocusMode);
  const focusActive        = useGameStore(st => st.system.focusModeActive);
  const hardcoreFocusMode  = useGameStore(st => st.system.hardcoreFocusMode);
  const hardcorePunished   = useGameStore(st => st.system.hardcorePunished);
  const hasPenalty         = useGameStore(st => st.system.hasPenalty);
  const penaltyBlockEnd = useGameStore(st => st.system.penaltyBlockEnd);
  const triggerEvent       = useGameStore(st => st.triggerEvent);
  const focusEndTime       = useGameStore(st => st.system.focusEndTime);
  const penaltyBlockStart  = useGameStore(st => st.system.penaltyBlockStart);

  const recordPomodoroSession = useGameStore(st => st.recordPomodoroSession);
  const recordFocusTime       = useGameStore(st => st.recordFocusTime);
  const setPomodoroState      = useGameStore(st => st.setPomodoroState);
  const updateSettings        = useGameStore(st => st.updateSettings);
  const lastFocusDuration     = useGameStore(st => st.settings.lastFocusDuration);

  // Pomodoro config — persisted in settings
  const pomodoroWorkMins  = useGameStore(st => st.settings.pomodoroWorkMins  ?? 25);
  const pomodoroBreakMins = useGameStore(st => st.settings.pomodoroBreakMins ?? 5);
  const pomodoroRounds    = useGameStore(st => st.settings.pomodoroRounds    ?? 4);

  // Pomodoro execution state — persisted in system (survives app restart)
  const pomodoroPhase    = useGameStore(st => st.system.pomodoroPhase    ?? 'idle');
  const pomodoroCycle    = useGameStore(st => st.system.pomodoroCycle    ?? 0);
  const pomodoroBreakEnd = useGameStore(st => st.system.pomodoroBreakEnd ?? 0);

  // Local UI state
  const [pomodoroMode,     setPomodoroMode]     = useState(pomodoroPhase !== 'idle');
  const [editingPomodoro,  setEditingPomodoro]  = useState<'work' | 'break' | 'rounds' | null>(null);
  const [pomodoroInputVal, setPomodoroInputVal] = useState('');
  const pomodoroBreakFiredRef = useRef(false);
  const pomodoroWorkRef   = useRef<TextInput>(null);
  const pomodoroBreakRef  = useRef<TextInput>(null);
  const pomodoroRoundsRef = useRef<TextInput>(null);

  // Sync local pomodoroMode toggle when store phase changes (e.g. restored from background)
  useEffect(() => {
    if (pomodoroPhase !== 'idle') {setPomodoroMode(true);}
  }, [pomodoroPhase]);

  const [activeAmbient, setActiveAmbient] = useState<AmbientSoundId | null>(null);

  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    if (!focusActive && pomodoroPhase !== 'break') {return;}
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [focusActive, pomodoroPhase]);

  const penaltyStart = penaltyBlockStart ?? 0;
  const penaltyWindowOpen =
    hasPenalty &&
    penaltyBlockEnd > 0 &&
    (penaltyStart === 0 || nowMs >= penaltyStart) &&
    nowMs < penaltyBlockEnd;
  const isPenaltyActive = penaltyWindowOpen;
  const penaltyMsRemaining = penaltyWindowOpen ? penaltyBlockEnd - nowMs : 0;

  const [hasUsage,         setHasUsage]         = useState(false);
  const [hasOverlay,       setHasOverlay]       = useState(false);
  const [hasAccessibility, setHasAccessibility] = useState(false);
  const [hours,          setHours]          = useState(() => lastFocusDuration?.hours   ?? 0);
  const [minutes,        setMinutes]        = useState(() => lastFocusDuration?.minutes ?? 25);
  const [editingField,   setEditingField]   = useState<'hours' | 'minutes' | null>(null);
  const [inputValue,     setInputValue]     = useState('');
  const [hardcoreToggle, setHardcoreToggle] = useState(false);
  const [showAppOverlay, setShowAppOverlay] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [alertCfg, setAlertCfg] = useState<{ title: string; message?: string; buttons?: AlertButton[] } | null>(null);
  const appStateRef   = useRef(AppState.currentState);
  const hoursInputRef = useRef<TextInput>(null);
  const minsInputRef  = useRef<TextInput>(null);

  // Alert when focus timer reaches zero (non-hardcore mode only)
  const focusEndAlertFiredRef = useRef(false);
  useEffect(() => {
    if (!focusActive || !focusEndTime || hardcoreFocusMode) {
      focusEndAlertFiredRef.current = false;
      return;
    }
    if (nowMs >= focusEndTime) {
      if (!focusEndAlertFiredRef.current) {
        focusEndAlertFiredRef.current = true;
        playSound('focusEnd');
        if (pomodoroMode || pomodoroPhase === 'work') {
          // Work → break: stop native blocker, schedule break timer in store
          FocusBlocker?.stopFocusMode().catch(() => {});
          setFocusActive(false, 0);
          setHardcoreMode(false);
          recordPomodoroSession();
          const cycle = pomodoroCycle;
          const breakEndMs = Date.now() + pomodoroBreakMins * 60_000;
          setPomodoroState('break', cycle, breakEndMs);
          notifyPomodoroBreakStarted(cycle, pomodoroBreakMins).catch(() => {});
          schedulePomodoroBreakEndNotification(breakEndMs, cycle + 1).catch(() => {});
          setAlertCfg({
            title: t('focus.alert_cycle_done_title', { cycle }),
            message: t('focus.alert_cycle_done_msg', { break: pomodoroBreakMins }),
            buttons: [{ text: t('focus.alert_btn_understood'), style: 'destructive' }],
          });
        } else {
          const isPenaltySession =
            hasPenalty &&
            penaltyBlockEnd > 0 &&
            focusEndTime === penaltyBlockEnd &&
            (penaltyStart === 0 || penaltyStart <= focusEndTime);

          const state = useGameStore.getState();
          const started = state.system.focusStartTime;
          const expectedMins = started && focusEndTime ? Math.round((focusEndTime - started) / 60_000) : (hours * 60 + minutes);
          
          recordFocusTime(expectedMins, isPenaltySession);

          if (isPenaltySession) {
            setAlertCfg({
              title: t('focus.alert_penalty_done_title'),
              message: t('focus.alert_penalty_done_msg'),
              buttons: [{ text: t('focus.alert_btn_understood'), style: 'destructive' }],
            });
          } else {
            setAlertCfg({
              title: t('focus.alert_focus_done_title'),
              message: t('focus.alert_focus_done_msg'),
              buttons: [{ text: t('focus.alert_btn_understood'), style: 'destructive' }],
            });
          }
        }
      }

      // Fail-safe: ensure focus truly ends when timer hits 00:00
      FocusBlocker?.stopFocusMode().catch(() => {});
      setFocusActive(false, 0);
      setHardcoreMode(false);
      stopAmbient();
      setActiveAmbient(null);
    }
  }, [
    nowMs,
    focusActive,
    focusEndTime,
    hardcoreFocusMode,
    pomodoroMode,
    pomodoroPhase,
    pomodoroBreakMins,
    pomodoroCycle,
    hasPenalty,
    penaltyBlockEnd,
    penaltyStart,
    hours,
    minutes,
    recordPomodoroSession,
    recordFocusTime,
    setFocusActive,
    setHardcoreMode,
    setPomodoroState,
  ]);

  const checkPerms = React.useCallback(async () => {
    if (!FocusBlocker) {return;}
    const [u, o, a] = await Promise.all([
      FocusBlocker.hasUsagePermission(),
      FocusBlocker.hasOverlayPermission(),
      FocusBlocker.hasAccessibilityPermission().catch(() => false),
    ]);
    setHasUsage(u);
    setHasOverlay(o);
    setHasAccessibility(a);
  }, [setHasUsage, setHasOverlay, setHasAccessibility]);

  const startFocus = React.useCallback(async () => {
    if (!FocusBlocker) {
      // Fallback for platforms without native blocker: timer-only focus mode
      let dur: number;
      if (hardcorePunished) {
        dur = Math.max(penaltyBlockEnd - Date.now(), 60_000);
      } else if (hardcoreToggle) {
        dur = HARDCORE_DURATION_MS;
      } else if (pomodoroMode || pomodoroPhase === 'work') {
        dur = pomodoroWorkMins * 60_000;
        const liveCycle = useGameStore.getState().system.pomodoroCycle ?? 0;
        const nextCycle = liveCycle === 0 ? 1 : liveCycle;
        setPomodoroState('work', nextCycle, 0);
      } else {
        dur = (hours * 60 + minutes) * 60_000;
      }
      if (!hardcoreToggle && !hardcorePunished && dur < 60_000) {
        setAlertCfg({ title: t('focus.alert_invalid_duration_title'), message: t('focus.alert_invalid_duration_msg') });
        return;
      }
      if (!hardcoreToggle && !hardcorePunished && !pomodoroMode) {
        updateSettings({ lastFocusDuration: { hours, minutes } });
      }
      const start = Date.now();
      const end = hardcorePunished ? penaltyBlockEnd : start + dur;
      setFocusActive(true, end);
      setHardcoreMode(hardcoreToggle);
      return;
    }
    if (!hasUsage) {
      setAlertCfg({
        title: t('focus.alert_perm_usage_title'),
        message: t('focus.alert_perm_usage_msg'),
        buttons: [
          { text: t('focus.alert_btn_open'),    onPress: () => FocusBlocker.requestUsagePermission().then(checkPerms) },
          { text: t('focus.alert_btn_cancel'), style: 'cancel' },
        ],
      });
      return;
    }
    if (!hasOverlay) {
      setAlertCfg({
        title: t('focus.alert_perm_usage_title'),
        message: t('focus.alert_perm_overlay_msg'),
        buttons: [
          { text: t('focus.alert_btn_open'),    onPress: () => FocusBlocker.requestOverlayPermission().then(checkPerms) },
          { text: t('focus.alert_btn_cancel'), style: 'cancel' },
        ],
      });
      return;
    }
    if (!hasAccessibility) {
      setAlertCfg({
        title: t('focus.alert_perm_usage_title'),
        message: t('focus.alert_perm_accessibility_msg'),
        buttons: [
          { text: t('focus.alert_btn_open'), onPress: () => FocusBlocker.requestAccessibilityPermission().then(checkPerms) },
          { text: t('focus.alert_btn_cancel'), style: 'cancel' },
        ],
      });
      return;
    }
    if (blockedApps.length === 0) {
      setAlertCfg({ title: t('focus.alert_no_apps_title'), message: t('focus.alert_no_apps_msg') });
      return;
    }
    // When punished, the block must end at the actual penalty deadline — NOT at +1 year.
    // HARDCORE_DURATION_MS (1 year) is only for the voluntary Hardcore Mode.
    let dur: number;
    if (hardcorePunished) {
      dur = Math.max(penaltyBlockEnd - Date.now(), 60_000);
    } else if (hardcoreToggle) {
      dur = HARDCORE_DURATION_MS;
    } else if (pomodoroMode || pomodoroPhase === 'work') {
      dur = pomodoroWorkMins * 60_000;
      // Read live store cycle (not stale closure) to handle auto-cycling correctly
      const liveCycle = useGameStore.getState().system.pomodoroCycle ?? 0;
      const nextCycle = liveCycle === 0 ? 1 : liveCycle;
      setPomodoroState('work', nextCycle, 0);
    } else {
      dur = (hours * 60 + minutes) * 60_000;
    }
    if (!hardcoreToggle && !hardcorePunished && dur < 60_000) {
      setAlertCfg({ title: t('focus.alert_invalid_duration_title'), message: t('focus.alert_invalid_duration_msg') });
      return;
    }
    if (!hardcoreToggle && !hardcorePunished && !pomodoroMode) {
      updateSettings({ lastFocusDuration: { hours, minutes } });
    }
    const start = Date.now();
    const end = hardcorePunished ? penaltyBlockEnd : start + dur;
    
    try {
      await FocusBlocker.startFocusMode(blockedApps, start, end, hardcorePunished);
    } catch (err: any) {
      const msg = err?.message || t('focus.err_native_unknown', { defaultValue: 'Unknown error activating native blocker.' });
      setAlertCfg({
        title: t('focus.alert_native_fail_title'),
        message: t('focus.alert_native_fail_msg', { reason: msg }),
        buttons: [
          { text: t('focus.alert_btn_open_perms'), onPress: () => checkPerms() },
          { text: t('focus.alert_btn_close'), style: 'cancel' },
        ],
      });
      return;
    }
    
    setFocusActive(true, end);
    setHardcoreMode(hardcoreToggle);
    const hour = new Date().getHours();
    if (hour >= 1 && hour < 6) {
      triggerEvent('focus_started_after_1am');
    }
  }, [
    blockedApps,
    checkPerms,
    hasOverlay,
    hasUsage,
    hardcorePunished,
    hardcoreToggle,
    hours,
    minutes,
    penaltyBlockEnd,
    pomodoroMode,
    pomodoroPhase,
    pomodoroWorkMins,
    setFocusActive,
    setHardcoreMode,
    setPomodoroState,
    setAlertCfg,
    triggerEvent,
    updateSettings,
  ]);

  const startNextPomodoroCycle = React.useCallback(async (_cycle: number) => {
    // phase/cycle already updated by caller via setPomodoroState; just start focus
    await startFocus();
  }, [startFocus]);

  // Pomodoro break end detection — auto-cycle
  useEffect(() => {
    if (pomodoroPhase !== 'break' || !pomodoroBreakEnd) {
      pomodoroBreakFiredRef.current = false;
      return;
    }
    if (nowMs >= pomodoroBreakEnd && !pomodoroBreakFiredRef.current) {
      pomodoroBreakFiredRef.current = true;
      playSound('focusEnd');
      cancelPomodoroNotifications().catch(() => {});
      const nextCycle = pomodoroCycle + 1;
      const maxRounds = pomodoroRounds;  // 0 = infinite
      if (maxRounds === 0 || pomodoroCycle < maxRounds) {
        // Auto-start next work cycle
        setPomodoroState('idle', nextCycle, 0);
        startNextPomodoroCycle(nextCycle);
      } else {
        // Session complete
        setPomodoroState('idle', 0, 0);
        setAlertCfg({
          title: t('focus.alert_session_complete_title'),
          message: t('focus.alert_session_complete_msg', { cycles: pomodoroCycle }),
          buttons: [{ text: t('focus.alert_btn_close_caps'), style: 'destructive' }],
        });
      }
    }
  }, [nowMs, pomodoroPhase, pomodoroBreakEnd, pomodoroCycle, pomodoroRounds, setPomodoroState, startNextPomodoroCycle]);

  const penaltyRemainingH = Math.ceil(penaltyMsRemaining / 3_600_000);

  function openInput(field: 'hours' | 'minutes') {
    setEditingField(field);
    setInputValue(field === 'hours' ? String(hours) : String(minutes));
    setTimeout(() => {
      (field === 'hours' ? hoursInputRef : minsInputRef).current?.focus();
    }, 50);
  }

  function applyInput(field: 'hours' | 'minutes') {
    setEditingField(null);
    const raw = parseInt(inputValue, 10);
    if (isNaN(raw)) {return;}
    if (field === 'hours') {
      const h = Math.min(Math.max(raw, 0), 24);
      setHours(h);
      if (h === 24) {setMinutes(0);}
    } else {
      const m = Math.min(Math.max(raw, 0), hours === 24 ? 0 : 59);
      setMinutes(m);
    }
  }

  function openPomodoroInput(field: 'work' | 'break' | 'rounds') {
    setEditingPomodoro(field);
    const val = field === 'work' ? pomodoroWorkMins : field === 'break' ? pomodoroBreakMins : pomodoroRounds;
    setPomodoroInputVal(String(val));
    setTimeout(() => {
      const ref = field === 'work' ? pomodoroWorkRef : field === 'break' ? pomodoroBreakRef : pomodoroRoundsRef;
      ref.current?.focus();
    }, 50);
  }

  function applyPomodoroInput(field: 'work' | 'break' | 'rounds') {
    setEditingPomodoro(null);
    const raw = parseInt(pomodoroInputVal, 10);
    if (isNaN(raw)) {return;}
    if (field === 'work') {
      updateSettings({ pomodoroWorkMins: Math.min(Math.max(raw, 1), 120) });
    } else if (field === 'break') {
      updateSettings({ pomodoroBreakMins: Math.min(Math.max(raw, 1), 60) });
    } else {
      updateSettings({ pomodoroRounds: Math.min(Math.max(raw, 0), 20) });
    }
  }

  function incrementHours() {
    setHours(h => {
      const next = h >= 24 ? 0 : h + 1;
      if (next === 24) {setMinutes(0);}
      return next;
    });
  }
  function decrementHours() {
    setHours(h => {
      const next = h <= 0 ? 24 : h - 1;
      if (next === 24) {setMinutes(0);}
      return next;
    });
  }
  function incrementMinutes() {
    if (hours === 24) {return;}
    setMinutes(m => m >= 55 ? 0 : m + 5);
  }
  function decrementMinutes() {
    if (hours === 24) {return;}
    setMinutes(m => m <= 0 ? 55 : m - 5);
  }

  useEffect(() => { checkPerms(); }, [checkPerms]);

  // Fix: detect when native focus ends naturally (AppState becomes active again)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        checkPerms();
        const state = useGameStore.getState();
        const phase = state.system.pomodoroPhase ?? 'idle';
        const bEnd  = state.system.pomodoroBreakEnd ?? 0;
        const cycle = state.system.pomodoroCycle ?? 0;
        const bMins = state.settings.pomodoroBreakMins ?? 5;
        const maxR  = state.settings.pomodoroRounds ?? 4;
        const now   = Date.now();

        if (focusActive && FocusBlocker) {
          FocusBlocker.isFocusModeActive().then(active => {
            if (!active) {
              setFocusActive(false);
              setHardcoreMode(false);
              // Work phase ended while in background → transition to break
              if (phase === 'work' && state.system.focusEndTime && now >= (state.system.focusEndTime - 5000)) {
                focusEndAlertFiredRef.current = true;
                state.recordPomodoroSession();
                const breakEndMs = now + bMins * 60_000;
                state.setPomodoroState('break', cycle, breakEndMs);
                notifyPomodoroBreakStarted(cycle, bMins).catch(() => {});
                schedulePomodoroBreakEndNotification(breakEndMs, cycle + 1).catch(() => {});
              }
            }
          }).catch(() => {});
        }

        // Break ended while in background → auto-cycle or finish
        if (phase === 'break' && bEnd > 0 && now >= bEnd) {
          pomodoroBreakFiredRef.current = true;
          cancelPomodoroNotifications().catch(() => {});
          const nextCycle = cycle + 1;
          if (maxR === 0 || cycle < maxR) {
            state.setPomodoroState('idle', nextCycle, 0);
            startNextPomodoroCycle(nextCycle);
          } else {
            state.setPomodoroState('idle', 0, 0);
          }
        }
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [checkPerms, focusActive, setFocusActive, setHardcoreMode, startNextPomodoroCycle]);

  useEffect(() => {
    if (!focusActive || !FocusBlocker) {return;}
    FocusBlocker.updateBlockedApps(blockedApps).catch(() => {});
  }, [blockedApps, focusActive]);
  function finishPomodoro() {
    setPomodoroState('idle', 0, 0);
    cancelPomodoroNotifications().catch(() => {});
  }

  async function stopFocus() {
    // Bloqueia saída do foco durante penalidade ativa
    const isPenaltyBlocking = hasPenalty && isPenaltyActive;
    if (isPenaltyBlocking) {
      const hoursRemaining = penaltyRemainingH;
      setAlertCfg({
        title: t('focus.alert_penalty_focus_locked_title'),
        message: t('focus.alert_penalty_focus_locked_msg', { hours: hoursRemaining }),
        buttons: [
          { text: t('focus.alert_btn_understood_low'), style: 'destructive' },
        ],
      });
      return;
    }

    const state = useGameStore.getState();
    const startTime = state.system.focusStartTime;
    const isHardcore = state.system.hardcoreFocusMode;
    const isPenaltySession = state.system.hasPenalty && state.system.penaltyBlockEnd > 0 && state.system.focusEndTime === state.system.penaltyBlockEnd;
    
    let elapsedMins = 0;
    if (startTime) {
       const endToUse = state.system.focusEndTime && Date.now() > state.system.focusEndTime ? state.system.focusEndTime : Date.now();
       elapsedMins = Math.floor((endToUse - startTime) / 60_000);
    }

    if (FocusBlocker) {
      await FocusBlocker.stopFocusMode().catch(() => {});
    }
    setFocusActive(false, 0);
    setHardcoreMode(false);
    stopAmbient();
    setActiveAmbient(null);

    if (elapsedMins > 0) {
      state.recordFocusTime(elapsedMins, isPenaltySession);
    }

    if (pomodoroMode || pomodoroPhase !== 'idle') {
      setPomodoroState('idle', 0, 0);
      cancelPomodoroNotifications().catch(() => {});
    }
  }

  function handleHardcoreBreak() { setShowBreakModal(true); }

  function confirmHardcoreBreak() {
    setShowBreakModal(false);
    stopFocus();
  }

  const permsOk       = hasUsage && hasOverlay && hasAccessibility;
  const selectedCount = blockedApps.length;

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
                {t('focus.penalty_banner', { hours: penaltyRemainingH, unit: penaltyRemainingH === 1 ? t('focus.penalty_banner_hour') : t('focus.penalty_banner_hours') })}
              </Text>
              <Text style={s.penaltyBannerSub}>{t('focus.penalty_banner_sub')}</Text>
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
        {pomodoroPhase === 'break' && (
          <View style={s.pomodoroBreakBanner}>
            <Icon name="coffee" size={14} color={C.gold} />
            <Text style={s.pomodoroBreakTxt}> CICLO {pomodoroCycle} — EM PAUSA</Text>
          </View>
        )}

        {/* 1b. Mode toggle — only when not in any active phase */}
        {!focusActive && pomodoroPhase === 'idle' && !hardcorePunished && (
          <View style={s.modeToggleRow}>
            <TouchableOpacity
              style={[s.modeToggleBtn, !pomodoroMode && s.modeToggleBtnActive]}
              onPress={() => setPomodoroMode(false)}
            >
              <Icon name="lightning-bolt" size={12} color={!pomodoroMode ? C.neonBlue : C.dimmed} />
              <Text style={[s.modeToggleTxt, !pomodoroMode && { color: C.neonBlue }]}> LIVRE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modeToggleBtn, pomodoroMode && s.modeToggleBtnPomodoro]}
              onPress={() => { setPomodoroMode(true); setHardcoreToggle(false); }}
            >
              <Icon name="timer-sand" size={12} color={pomodoroMode ? C.gold : C.dimmed} />
              <Text style={[s.modeToggleTxt, pomodoroMode && { color: C.gold }]}> POMODORO</Text>
            </TouchableOpacity>
          </View>
        )}


        {/* 2. Timer / Duration */}
        {pomodoroPhase === 'break' && pomodoroBreakEnd ? (
          <View style={[s.countdownBox, { borderColor: C.gold + '88' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Icon name="coffee" size={14} color={C.gold} />
              <Text style={[s.countdownTxt, { color: C.gold, fontSize: 13 }]}>
                CICLO {pomodoroCycle}{pomodoroRounds > 0 ? `/${pomodoroRounds}` : ''} — PAUSA
              </Text>
            </View>
            <Text style={[s.countdownTxt, { color: C.gold }]}>
              {formatTimeRemaining(Math.max(0, pomodoroBreakEnd - nowMs))}
            </Text>
            <Text style={{ color: C.gold + '88', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1, marginTop: 6 }}>
              {pomodoroRounds === 0 || pomodoroCycle < pomodoroRounds
                ? t('focus.pomodoro_next_auto', { next: pomodoroCycle + 1 })
                : t('focus.pomodoro_last_cycle')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <TouchableOpacity style={s.pomodoroSkipBtn} onPress={() => {
                const nextCycle = pomodoroCycle + 1;
                const maxR = pomodoroRounds;
                cancelPomodoroNotifications().catch(() => {});
                if (maxR === 0 || pomodoroCycle < maxR) {
                  pomodoroBreakFiredRef.current = true;
                  setPomodoroState('idle', nextCycle, 0);
                  startNextPomodoroCycle(nextCycle);
                } else {
                  finishPomodoro();
                }
              }}>
                <Text style={s.pomodoroSkipTxt}>SALTAR PAUSA</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.pomodoroSkipBtn, { borderColor: C.neonRed + '55' }]} onPress={finishPomodoro}>
                <Text style={[s.pomodoroSkipTxt, { color: C.neonRed + 'aa' }]}>TERMINAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : focusActive && focusEndTime ? (
          hardcoreFocusMode ? (
            <View style={[s.countdownBox, { borderColor: C.neonRed + '88' }]}>
              <Text style={[s.countdownTxt, { color: C.neonRed }]}>
                {formatElapsed(nowMs - (hardcorePunished ? (penaltyBlockStart ?? nowMs) : (focusEndTime! - HARDCORE_DURATION_MS)))}
              </Text>
              <Text style={{ color: C.neonRed + 'aa', fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 2, marginTop: 6 }}>ATIVO — SEM LIMITE</Text>
            </View>
          ) : (
            <View style={s.countdownBox}>
              {(pomodoroMode || pomodoroPhase === 'work') && (
                <Text style={{ color: C.gold, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>
                  CICLO {pomodoroCycle}{pomodoroRounds > 0 ? `/${pomodoroRounds}` : ''} — TRABALHO
                </Text>
              )}
              <Text style={s.countdownTxt}>
                {formatTimeRemaining(Math.max(0, focusEndTime - nowMs))}
              </Text>
            </View>
          )
        ) : (!pomodoroMode && !hardcoreToggle && !hardcorePunished && (
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

        {/* 2b. Pomodoro config */}
        {pomodoroMode && !focusActive && pomodoroPhase === 'idle' && (
          <View style={s.pomodoroConfigCard}>
            <View style={s.pomodoroConfigRow}>
              <Icon name="timer-sand" size={14} color={C.gold} />
              <Text style={s.pomodoroConfigTitle}> POMODORO</Text>
            </View>
            {/* Row 1: Work + Break */}
            <View style={s.pomodoroPickersRow}>
              {/* Work duration */}
              <View style={s.pomodoroPicker}>
                <Text style={s.pomodoroPickerLabel}>TRABALHO</Text>
                <View style={s.pomodoroPickerCtrl}>
                  <TouchableOpacity onPress={() => updateSettings({ pomodoroWorkMins: Math.min(120, pomodoroWorkMins + 5) })} style={s.pomodoroPickerBtn}>
                    <Text style={s.pomodoroPickerArrow}>▲</Text>
                  </TouchableOpacity>
                  {editingPomodoro === 'work' ? (
                    <TextInput
                      ref={pomodoroWorkRef}
                      style={s.pomodoroPickerInput}
                      value={pomodoroInputVal}
                      onChangeText={v => setPomodoroInputVal(v.replace(/\D/g, '').slice(0, 3))}
                      keyboardType="number-pad"
                      maxLength={3}
                      selectTextOnFocus
                      onBlur={() => applyPomodoroInput('work')}
                      onSubmitEditing={() => applyPomodoroInput('work')}
                    />
                  ) : (
                    <TouchableOpacity onPress={() => openPomodoroInput('work')}>
                      <Text style={s.pomodoroPickerVal}>{pomodoroWorkMins}<Text style={s.pomodoroPickerUnit}>m</Text></Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => updateSettings({ pomodoroWorkMins: Math.max(1, pomodoroWorkMins - 5) })} style={s.pomodoroPickerBtn}>
                    <Text style={s.pomodoroPickerArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.pomodoroPickerDivider} />
              {/* Break duration */}
              <View style={s.pomodoroPicker}>
                <Text style={s.pomodoroPickerLabel}>PAUSA</Text>
                <View style={s.pomodoroPickerCtrl}>
                  <TouchableOpacity onPress={() => updateSettings({ pomodoroBreakMins: Math.min(60, pomodoroBreakMins + 1) })} style={s.pomodoroPickerBtn}>
                    <Text style={s.pomodoroPickerArrow}>▲</Text>
                  </TouchableOpacity>
                  {editingPomodoro === 'break' ? (
                    <TextInput
                      ref={pomodoroBreakRef}
                      style={s.pomodoroPickerInput}
                      value={pomodoroInputVal}
                      onChangeText={v => setPomodoroInputVal(v.replace(/\D/g, '').slice(0, 2))}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      onBlur={() => applyPomodoroInput('break')}
                      onSubmitEditing={() => applyPomodoroInput('break')}
                    />
                  ) : (
                    <TouchableOpacity onPress={() => openPomodoroInput('break')}>
                      <Text style={s.pomodoroPickerVal}>{pomodoroBreakMins}<Text style={s.pomodoroPickerUnit}>m</Text></Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => updateSettings({ pomodoroBreakMins: Math.max(1, pomodoroBreakMins - 1) })} style={s.pomodoroPickerBtn}>
                    <Text style={s.pomodoroPickerArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={s.pomodoroPickerDivider} />
              {/* Rounds */}
              <View style={s.pomodoroPicker}>
                <Text style={s.pomodoroPickerLabel}>RONDAS</Text>
                <View style={s.pomodoroPickerCtrl}>
                  <TouchableOpacity onPress={() => updateSettings({ pomodoroRounds: Math.min(20, pomodoroRounds + 1) })} style={s.pomodoroPickerBtn}>
                    <Text style={s.pomodoroPickerArrow}>▲</Text>
                  </TouchableOpacity>
                  {editingPomodoro === 'rounds' ? (
                    <TextInput
                      ref={pomodoroRoundsRef}
                      style={s.pomodoroPickerInput}
                      value={pomodoroInputVal}
                      onChangeText={v => setPomodoroInputVal(v.replace(/\D/g, '').slice(0, 2))}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      onBlur={() => applyPomodoroInput('rounds')}
                      onSubmitEditing={() => applyPomodoroInput('rounds')}
                    />
                  ) : (
                    <TouchableOpacity onPress={() => openPomodoroInput('rounds')}>
                      <Text style={s.pomodoroPickerVal}>
                        {pomodoroRounds === 0 ? '∞' : String(pomodoroRounds)}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => updateSettings({ pomodoroRounds: Math.max(0, pomodoroRounds - 1) })} style={s.pomodoroPickerBtn}>
                    <Text style={s.pomodoroPickerArrow}>▼</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Text style={s.pomodoroDesc}>
              {pomodoroWorkMins}m trabalho · {pomodoroBreakMins}m pausa · {pomodoroRounds === 0 ? '∞ rondas' : `${pomodoroRounds} ronda${pomodoroRounds !== 1 ? 's' : ''}`}
              {pomodoroRounds > 0 ? ` · ${pomodoroRounds * pomodoroWorkMins}min total` : ''}
            </Text>
          </View>
        )}

        {/* 3. Switch (Hardcore Mode) */}
        {!focusActive && !pomodoroMode && (
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
                {hardcorePunished ? t('focus.hardcore_label_punished') : t('focus.hardcore_label')}
              </Text>
              <Text style={s.hardcoreSub}>
                {hardcorePunished
                  ? t('focus.hardcore_sub_punished')
                  : t('focus.hardcore_sub')}
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
        ) : pomodoroPhase === 'break' ? null : (
          <TouchableOpacity
            style={[s.mainBtn, !permsOk && s.mainBtnDisabled, pomodoroMode && s.mainBtnPomodoro, { marginTop: SPACING.md }]}
            onPress={startFocus}
          >
            <Icon name={pomodoroMode ? 'timer-sand' : 'play-circle-outline'} size={18} color={pomodoroMode ? C.gold : C.neonBlue} />
            <Text style={[s.mainBtnTxt, pomodoroMode && { color: C.gold }]}>
              {pomodoroMode ? ` INICIAR POMODORO (${pomodoroWorkMins}m)` : ' ATIVAR FOCUS MODE'}
            </Text>
          </TouchableOpacity>
        )}

        {/* 5. Som ambiente */}
        {!hardcorePunished && (
          <>
            <Text style={s.section}>SOM AMBIENTE</Text>
            <View style={s.ambientRow}>
              {([null, 'lofi', 'rain', 'fire'] as (AmbientSoundId | null)[]).map(id => {
                const isActive = activeAmbient === id;
                const meta = id ? AMBIENT_META[id] : null;
                return (
                  <TouchableOpacity
                    key={id ?? 'off'}
                    style={[s.ambientBtn, isActive && s.ambientBtnActive]}
                    onPress={() => {
                      if (id === null) {
                        stopAmbient();
                        setActiveAmbient(null);
                      } else {
                        playAmbient(id);
                        setActiveAmbient(id);
                      }
                    }}
                  >
                    <Icon
                      name={id === null ? 'volume-off' : meta!.icon}
                      size={14}
                      color={isActive ? C.neonBlue : C.dimmed}
                    />
                    {meta
                      ? <Text style={[s.ambientBtnTxt, isActive && { color: C.neonBlue }]}> {meta.label}</Text>
                      : <Text style={[s.ambientBtnTxt, isActive && { color: C.neonBlue }]}> Off</Text>
                    }
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* 6. Apps a bloquear */}
        <Text style={s.section}>APPS A BLOQUEAR</Text>
        <TouchableOpacity style={s.appSelectorBtn} onPress={() => setShowAppOverlay(true)}>
          <Icon name="shield-lock-outline" size={16} color={selectedCount > 0 ? C.neonBlue : C.muted} />
          <View style={{ flex: 1 }}>
            <Text style={[s.appSelectorTxt, selectedCount > 0 && { color: C.muted }]}>
              {selectedCount > 0
                ? `${selectedCount} app${selectedCount !== 1 ? 's' : ''} configurada${selectedCount !== 1 ? 's' : ''}`
                : t('focus.apps_none')}
            </Text>
            {focusActive && (
              <Text style={s.appSelectorSub}>{t('focus.apps_remove_hint')}</Text>
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
                <Text style={[s.modeLabel, { color: C.neonBlue }]}>MODO LIVRE</Text>
                <Text style={s.modeDesc}>{t('focus.mode_free_desc')}</Text>
              </View>
            </View>
          </View>
          <View style={{ gap: SPACING.sm, marginBottom: SPACING.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
              <Icon name="timer-sand" size={14} color={C.gold} />
              <View style={{ flex: 1 }}>
                <Text style={[s.modeLabel, { color: C.gold }]}>MODO POMODORO</Text>
                <Text style={s.modeDesc}>{t('focus.mode_pomodoro_desc')}</Text>
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm }}>
            <Icon name="skull" size={14} color={C.neonRed} />
            <View style={{ flex: 1 }}>
              <Text style={[s.modeLabel, { color: C.neonRed }]}>MODO HARDCORE</Text>
              <Text style={s.modeDesc}>{t('focus.mode_hardcore_desc')}</Text>
            </View>
          </View>
        </View>

        {/* 7. Permissões */}
        <Text style={s.section}>PERMISSÕES</Text>
        <View style={s.permBlock}>
          <PermRow
            label={t('focus.perm_usage')}
            ok={hasUsage}
            onFix={() => FocusBlocker?.requestUsagePermission().then(checkPerms)}
            C={C}
          />
          <PermRow
            label={t('focus.perm_overlay')}
            ok={hasOverlay}
            onFix={() => FocusBlocker?.requestOverlayPermission().then(checkPerms)}
            C={C}
          />
          <PermRow
            label={t('focus.perm_accessibility')}
            ok={hasAccessibility}
            onFix={() => FocusBlocker?.requestAccessibilityPermission().then(checkPerms)}
            C={C}
            optional
          />
        </View>

        {/* 8. Aviso bateria MIUI / OEM */}
        <View style={s.batteryBox}>
          <View style={s.batteryHeader}>
            <Icon name="battery-alert" size={14} color={C.gold} />
            <Text style={s.batteryTitle}> OTIMIZAÇÃO DE BATERIA (XIAOMI / MIUI)</Text>
          </View>
          <Text style={s.batteryDesc}>
            Em dispositivos Xiaomi, Samsung e outros com gestão agressiva de bateria, o bloqueador pode adormecer em segundo plano. Se as apps bloqueadas não estão a ser bloqueadas corretamente, desativa a otimização de bateria para esta app:
          </Text>
          <View style={s.batterySteps}>
            <Text style={s.batteryStep}>1. Definições → Apps → Gerir Apps</Text>
            <Text style={s.batteryStep}>{t('focus.battery_step2')}</Text>
            <Text style={s.batteryStep}>3. Bateria → Sem restrições</Text>
          </View>
          <Text style={s.batteryNote}>
            {t('focus.battery_note')}
          </Text>
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
        title={t('focus.break_modal_title')}
        message={t('focus.break_modal_message')}
        confirmLabel={t('focus.break_modal_confirm')}
        confirmIcon="shield-off-outline"
        confirmColor={C.neonRed}
        onConfirm={confirmHardcoreBreak}
        onCancel={() => {
          triggerEvent('hardcore_cancel_attempt');
          setShowBreakModal(false);
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
  );
}

// ── PermRow sub-component ──────────────────────────────────────────────────────

function PermRow({ label, ok, onFix, C, optional }: { label: string; ok: boolean; onFix: () => void; C: any; optional?: boolean }) {
  const p = getPRStyles(C);
  const warnColor = optional ? C.gold : C.neonRed;
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
  );
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
  mainBtnPomodoro: { borderColor: C.gold, backgroundColor: C.gold + '15' },
  stopBtn:         { borderColor: C.neonRed, backgroundColor: C.neonRed + '15' },
  hardcoreStopBtn: { borderColor: C.neonRed, backgroundColor: C.surface?.danger || C.bg, borderWidth: 2 },
  mainBtnDisabled: { opacity: 0.4 },
  mainBtnTxt:      { color: C.neonBlue, fontFamily: FONT.orbitron, fontSize: 12, letterSpacing: 2 },

  // ── Pomodoro styles ───────────────────────────────────────────────────────
  modeToggleRow:      { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  modeToggleBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.panel, borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingVertical: SPACING.sm },
  modeToggleBtnActive:{ borderColor: C.neonBlue + '88', backgroundColor: C.neonBlue + '10' },
  modeToggleBtnPomodoro: { borderColor: C.gold + '88', backgroundColor: C.gold + '10' },
  modeToggleTxt:      { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 1 },

  pomodoroBreakBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.gold + '10', borderWidth: 1, borderColor: C.gold + '44', borderRadius: 4, padding: SPACING.sm, marginBottom: SPACING.sm },
  pomodoroBreakTxt:    { color: C.gold, fontFamily: FONT.orbitron, fontSize: 10, letterSpacing: 2 },

  pomodoroConfigCard:  { backgroundColor: C.panel, borderWidth: 1, borderColor: C.gold + '44', borderRadius: 4, padding: SPACING.md, marginBottom: SPACING.sm },
  pomodoroConfigRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  pomodoroConfigTitle: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 11, letterSpacing: 2 },
  pomodoroPickersRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  pomodoroPicker:      { flex: 1, alignItems: 'center', gap: 4 },
  pomodoroPickerLabel: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1.5 },
  pomodoroPickerCtrl:  { flexDirection: 'column', alignItems: 'center', gap: 4 },
  pomodoroPickerBtn:   { paddingHorizontal: SPACING.md, paddingVertical: 8, backgroundColor: C.gold + '15', borderRadius: 6, minWidth: 44, alignItems: 'center' },
  pomodoroPickerArrow: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 12 },
  pomodoroPickerVal:   { color: C.gold, fontFamily: FONT.orbitron, fontSize: 28, fontWeight: '900', minWidth: 52, textAlign: 'center' },
  pomodoroPickerUnit:  { color: C.gold + 'aa', fontFamily: FONT.orbitron, fontSize: 14 },
  pomodoroPickerDivider: { width: 1, height: 48, backgroundColor: C.border, marginHorizontal: SPACING.sm },
  pomodoroDesc:        { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 0.5, textAlign: 'center' },

  pomodoroPickerInput: { color: C.gold, fontFamily: FONT.orbitron, fontSize: 28, fontWeight: '900', minWidth: 52, textAlign: 'center', borderBottomWidth: 1, borderBottomColor: C.gold },

  pomodoroSkipBtn:     { marginTop: SPACING.md, paddingVertical: 6, paddingHorizontal: SPACING.lg, borderWidth: 1, borderColor: C.gold + '55', borderRadius: 2 },
  pomodoroSkipTxt:     { color: C.gold + 'aa', fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 2 },

  ambientRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm, gap: 4 },
  ambientBtn:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: SPACING.sm, borderRadius: 4, borderWidth: 1, borderColor: C.border, backgroundColor: C.panel },
  ambientBtnActive: { borderColor: C.neonBlue + '88', backgroundColor: C.neonBlue + '12' },
  ambientBtnTxt: { color: C.dimmed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },

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

  batteryBox:    { backgroundColor: C.panel, borderWidth: 1, borderColor: C.gold + '55', borderRadius: 4, padding: SPACING.md, marginTop: SPACING.md, gap: SPACING.sm },
  batteryHeader: { flexDirection: 'row', alignItems: 'center' },
  batteryTitle:  { color: C.gold, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 1.5 },
  batteryDesc:   { color: C.dimmed, fontSize: 11, lineHeight: 16 },
  batterySteps:  { backgroundColor: C.bg, borderRadius: 4, padding: SPACING.sm, gap: 4 },
  batteryStep:   { color: C.muted, fontFamily: FONT.orbitron, fontSize: 9, letterSpacing: 0.5 },
  batteryNote:   { color: C.gold + 'aa', fontSize: 10, lineHeight: 15 },
});

const getPRStyles = (C: any) => StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  label:  { flex: 1, color: C.muted, fontSize: 12, marginLeft: SPACING.sm },
  fixBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.neonRed, borderRadius: 6, paddingHorizontal: SPACING.sm, paddingVertical: 4 },
  fixTxt: { color: C.neonRed, fontFamily: FONT.orbitron, fontSize: 8, letterSpacing: 1 },
});


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
});
