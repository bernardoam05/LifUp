# 🎵 Sound Design Analysis - Solo Leveling RN

## Current State
- ✅ Settings toggle for sound enabled (`settings.sound`)
- ✅ Vibration feedback working across components
- ❌ **NO actual audio/sound implementation**
- ❌ No sound library integrated

---

## 📍 Strategic Sound Placement (Priority Order)

### TIER 1: Critical Feedback Points (HIGH Priority)
**Moments where audio feedback significantly improves UX:**

1. **Boss Defeat Victory** ⭐
   - Where: `BossVictoryModal.tsx`
   - Sound: Epic victory chime + choir sound (short, 1-2s)
   - Intensity: Celebratory but not startling
   - Example: Ascending chord progression

2. **Level Up** ⭐
   - Where: `useGameStore.ts` `recordQuest()`, App.tsx reward system
   - Sound: "Ding!" + ascending musical note
   - Intensity: Positive, rewarding
   - Example: Magical sparkle/power-up sound

3. **Achievement Unlocked** ⭐
   - Where: `AchievementModal.tsx`
   - Sound: Lower orchestral swell + "unlock" click
   - Intensity: Proud but not overpowering
   - Example: Brass stab

4. **Shadow Captured** ⭐ (NEW)
   - Where: `ExtractionModal.tsx` (Arise system)
   - Sound: Mystical swirl + ethereal note
   - Intensity: Mysterious, magical
   - Example: Synth whoosh + bell tone

---

### TIER 2: Gameplay Progression (MEDIUM Priority)
**Moments that mark progress or milestones:**

5. **Daily Quest Complete**
   - Where: Quest completion handlers
   - Sound: Short, positive beep tone
   - Intensity: Subtle, not intrusive

6. **Focus Session Start**
   - Where: `FocusScreen.tsx` on mode start
   - Sound: Meditation/focus ambient intro (2-3s fade)
   - Intensity: Calming, atmospheric

7. **Focus Session End** 
   - Where: `MissionActiveScreen.tsx` onComplete
   - Sound: Gentle chime + completion tone
   - Intensity: Satisfying but not jarring

8. **Penalty Triggered** 🚨
   - Where: `PenaltyModal.tsx`
   - Sound: Warning/alarm tone (short, sharp)
   - Intensity: **Intentionally harsh** (reflects consequence severity)
   - Example: Error/alert buzzer

---

### TIER 3: Ambient & Polish (LOW Priority)
**Background enhancement, can be disable-able:**

9. **Button Clicks** (Optional)
   - Simple tap/click sound
   - Only if other sounds feel too quiet

10. **Modal Open/Close** (Optional)
    - Subtle transition whoosh
    - Very quiet, doesn't distract

---

## 🎛️ Sound Design Specifications

### Audio Durations
- Victory chime: **0.8-1.2s**
- Level up: **0.5-0.8s**  
- Achievement: **0.8-1.5s**
- Shadow captured: **0.6-1.0s**
- Daily quest: **0.3s**
- Focus ambient intro: **2-3s** (loops or continuous)
- Penalty alarm: **0.4-0.6s**

### Volume Levels (Relative scale 0-1)
- Victory: **0.6** (celebratory but not ear-splitting)
- Level up: **0.5** (rewarding, moderate)
- Achievement: **0.7** (proud moment)
- Shadow: **0.5** (mystical, doesn't dominate)
- Daily: **0.4** (background feedback)
- Focus ambient: **0.3** (background, very subtle)
- Penalty: **0.8** (alarming, commanding attention)

### Tone/Genre Matching
- **Victory/Achievement**: Orchestral/Epic
- **Level Up**: Magical/Whimsical (synth or choir)
- **Shadow Capture**: Ethereal/Mystical (ambient synth)
- **Focus Ambient**: Meditation/Zen (minimalist synth or nature sounds)
- **Penalty**: Electronic/Alert (harsh but not painful)
- **Daily Quest**: Simple/8-bit retro (fits gamification theme)

---

## 💾 Implementation Requirements

### Libraries Needed
```json
{
  "react-native-sound": "^0.13.0",      // OR expo-av for Expo
  "expo-av": "^13.0.0"                  // Better for Expo projects
}
```

### File Structure
```
src/audio/
  ├── sounds/                    // Audio files (.mp3 or .ogg)
  │   ├── victory-chime.mp3
  │   ├── level-up.mp3
  │   ├── achievement-unlock.mp3
  │   ├── shadow-captured.mp3
  │   ├── daily-complete.mp3
  │   ├── focus-ambient.mp3
  │   └── penalty-alarm.mp3
  │
  ├── AudioService.ts           // Centralized audio manager
  └── soundPresets.ts           // Volume/duration configs
```

### Settings Integration
- Tie to existing `settings.sound` toggle
- Add optional `volumeLevel` slider (0-100%)
- Option to disable specific types (e.g., "Disable penalty alarm")

---

## 🎯 Recommended Implementation Order

1. **Phase 1** (MVP - Core rewards):
   - ✅ Create AudioService wrapper
   - ✅ Add victory chime
   - ✅ Add level up sound
   - ✅ Add achievement sound

2. **Phase 2** (Gameplay feel):
   - Shadow capture sound
   - Daily quest completion
   - Penalty alarm

3. **Phase 3** (Polish):
   - Focus session ambient
   - Button clicks (optional)
   - Fine-tune all volumes

---

## ⚠️ Important Notes

- **Respect user settings**: All sounds must check `settings.sound`
- **Don't override user preferences**: Alert sounds (penalty) should still obey toggle
- **Test on device**: Sounds vary dramatically between devices
- **Consider battery impact**: Looping audio drains battery faster
- **Accessibility**: Users might use screen readers; don't make audio critical to understanding events

---

## 🔊 Sound Pairing with Vibration

Sounds work BEST alongside vibration:
- Victory: Vibration + Sound together (coordinated timing)
- Level up: Vibration pulse during sound
- Achievement: Multiple vibration pulses aligned with sound peaks
