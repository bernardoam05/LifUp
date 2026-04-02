// src/utils/audioService.ts
/**
 * Haptic feedback system for Solo Leveling RN
 * Uses vibration for audio feedback - works on all Android devices
 *
 * Ambient sounds: place .mp3 files in android/app/src/main/res/raw/
 *   ambient_lofi.mp3   — lofi music loop
 *   ambient_rain.mp3   — rain / white noise loop
 *   ambient_fire.mp3   — fire crackling loop
 */

import { Vibration } from 'react-native';

// ── Ambient Sound (react-native-sound) ────────────────────────────────────────


import Sound from 'react-native-sound';
Sound.setCategory('Playback', true);

export type AmbientSoundId = 'lofi' | 'rain' | 'fire'

const AMBIENT_FILES: Record<AmbientSoundId, string[]> = {
  lofi:  ['ambient_lofi_1', 'ambient_lofi_2', 'ambient_lofi_3', 'ambient_lofi_4', 'ambient_lofi_5', 'ambient_lofi_6'],
  rain:  ['ambient_rain_1', 'ambient_rain_2', 'ambient_rain_3', 'ambient_rain_4'],
  fire:  ['ambient_fire_1', 'ambient_fire_2', 'ambient_fire_3', 'ambient_fire_4'],
};

export const AMBIENT_META: Record<AmbientSoundId, { icon: string; label: string }> = {
  lofi:  { icon: 'music-note',   label: 'Lofi' },
  rain:  { icon: 'weather-rainy', label: 'Chuva' },
  fire:  { icon: 'fire',          label: 'Fogueira' },
};

let activeAmbientSound: any = null;
let activeAmbientId: AmbientSoundId | null = null;

let _ambientRequestId = 0;

export function playAmbient(id: AmbientSoundId | null): void {
  // Stop and release any existing ambient sound
  if (activeAmbientSound) {
    try { activeAmbientSound.stop(); activeAmbientSound.release(); } catch (_) {}
    activeAmbientSound = null;
    activeAmbientId = null;
  }
  // Increment request token so any in-flight callback knows it's stale
  const token = ++_ambientRequestId;
  if (!id) {return;}

  const files = AMBIENT_FILES[id];
  const randomFile = files[Math.floor(Math.random() * files.length)];

  const sound = new Sound(randomFile, Sound.MAIN_BUNDLE, (err: any) => {
    if (token !== _ambientRequestId) {
      // A newer playAmbient/stopAmbient call arrived while this was loading
      try { sound.release(); } catch (_) {}
      return;
    }
    if (err) {
      console.warn('[AudioService] Ambient sound not found:', randomFile, '— add the .mp3 to android/app/src/main/res/raw/');
      return;
    }
    sound.setNumberOfLoops(-1);
    sound.setVolume(0.65);
    sound.play();
    activeAmbientSound = sound;
    activeAmbientId = id;
  });
}

export function stopAmbient(): void {
  playAmbient(null);
}

export function getActiveAmbientId(): AmbientSoundId | null {
  return activeAmbientId;
}

export type SoundType = 'victory' | 'levelUp' | 'achievement' | 'shadow' | 'daily' | 'penalty' | 'focusEnd'

/**
 * Vibration patterns: [wait, vibrate, wait, vibrate, ...]
 */
const VIB_PATTERNS: Record<SoundType, number[]> = {
  victory:    [0, 100, 50, 300, 50, 500],
  levelUp:    [0, 200, 100, 200],
  achievement:[0, 100, 50, 200, 50, 100, 50, 400],
  shadow:     [0, 80, 40, 80, 40, 200, 80, 400],
  daily:      [0, 100],
  penalty:    [0, 500],
  focusEnd:   [0, 200, 100, 200, 100, 400],
};

// SFX files in android/app/src/main/res/raw/
const SFX_FILES: Partial<Record<SoundType, string>> = {
  levelUp:     'level_up_ding',
  victory:     'victory_chime',
  shadow:      'shadow_captured',
  penalty:     'penalty_alarm',
};

// Cached Sound instances — loaded once, reused
const _sfxCache: Partial<Record<SoundType, any>> = {};

function _getSfx(type: SoundType): Promise<any | null> {
  return new Promise(resolve => {
    const file = SFX_FILES[type];
    if (!file) { resolve(null); return; }
    if (_sfxCache[type]) { resolve(_sfxCache[type]); return; }
    const sound = new Sound(file, Sound.MAIN_BUNDLE, (err: any) => {
      if (err) {
        console.warn('[AudioService] SFX not found:', file);
        resolve(null);
      } else {
        _sfxCache[type] = sound;
        resolve(sound);
      }
    });
  });
}

/**
 * Preload SFX sounds at startup
 */
export async function initializeAudio(): Promise<void> {
  for (const type of Object.keys(SFX_FILES) as SoundType[]) {
    _getSfx(type).catch(() => {});
  }
}

/**
 * Play SFX (audio file + vibration pattern).
 * Falls back to vibration-only for types without a dedicated file.
 */
export async function playSound(
  type: SoundType,
  _volumeOverride?: number,
  onComplete?: () => void
): Promise<void> {
  try {
    Vibration.vibrate(VIB_PATTERNS[type] || [0, 100]);

    const sound = await _getSfx(type);
    if (sound) {
      sound.stop();
      sound.setCurrentTime(0);
      sound.setVolume(0.8);
      sound.play(() => onComplete?.());
    } else {
      setTimeout(() => onComplete?.(), 100);
    }
  } catch (err) {
    console.warn(`[AudioService] Error playing sound ${type}:`, err);
    onComplete?.();
  }
}

/**
 * Stop all vibrations
 */
export async function stopAllSounds(): Promise<void> {
  try {
    Vibration.cancel();
  } catch (e) {
    console.warn('[AudioService] Error stopping vibration:', e);
  }
}

/**
 * Release resources (no-op for vibration)
 */
export async function releaseAllSounds(): Promise<void> {
  // No-op for vibration-based system
}
