// src/utils/audioService.ts
/**
 * Haptic feedback system for Solo Leveling RN
 * Uses vibration for audio feedback - works on all Android devices
 * No need for audio files or sound libraries
 */

import { Vibration } from 'react-native'

export type SoundType = 'victory' | 'levelUp' | 'achievement' | 'shadow' | 'daily' | 'penalty'

/**
 * Vibration patterns: [wait, vibrate, wait, vibrate, ...]
 */
const VIB_PATTERNS: Record<SoundType, number[]> = {
  victory: [0, 100, 50, 100, 50, 150],          // Celebratory triple pulse
  levelUp: [0, 200, 100, 200],                  // Double strong pulse
  achievement: [0, 150, 50, 150],               // Strong achievement pulse
  shadow: [0, 80, 40, 80],                      // Quick capture effect
  daily: [0, 100],                              // Simple single tick
  penalty: [0, 500],                            // Long warning buzz
}

/**
 * Initialize audio (no-op for vibration)
 */
export async function initializeAudio(): Promise<void> {
  // No-op for vibration-based system
}

/**
 * Play haptic feedback using vibration patterns
 * Each sound type has a unique vibration pattern
 */
export async function playSound(
  type: SoundType,
  volumeOverride?: number,
  onComplete?: () => void
): Promise<void> {
  try {
    const pattern = VIB_PATTERNS[type] || [0, 100]
    Vibration.vibrate(pattern)
    
    // Small delay to let vibration play
    setTimeout(() => {
      onComplete?.()
    }, 100)
  } catch (err) {
    console.warn(`[AudioService] Error playing haptic feedback ${type}:`, err)
    onComplete?.()
  }
}

/**
 * Stop all vibrations
 */
export async function stopAllSounds(): Promise<void> {
  try {
    Vibration.cancel()
  } catch (e) {
    console.warn('[AudioService] Error stopping vibration:', e)
  }
}

/**
 * Release resources (no-op for vibration)
 */
export async function releaseAllSounds(): Promise<void> {
  // No-op for vibration-based system
}
