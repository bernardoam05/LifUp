# 🎵 Audio Setup Guide - Solo Leveling RN

## Current Status
✅ AudioService integrated and ready  
✅ Sound events wired in: Victory, Achievement, Level Up, Shadow Capture  
⏳ Audio files NOT YET added (optional - app works without them)

---

## How to Add Audio Files

### Option 1: Quick Start (Use Pre-made Sounds)
**Best for MVP - Take ~15 minutes**

1. **Generate free audio online** using one of these services:
   - [Pixabay Sound Effects](https://pixabay.com/sound-effects/) - Free, no login
   - [Freesound.org](https://freesound.org/) - Community sounds
   - [Zapsplat](https://www.zapsplat.com) - Curated free effects
   - [BBC Sound Library](https://sound-effects.bbcrewind.co.uk/) - BBC archive

2. **Search for each sound:**
   - **victory_chime.mp3** → Look for: "victory", "chime", "success", "fanfare"
   - **level_up_ding.mp3** → Look for: "level up", "ding", "chime", "bell"
   - **achievement_unlock.mp3** → Look for: "achievement", "unlock", "notification", "cha-ching"
   - **shadow_captured.mp3** → Look for: "whoosh", "magic", "spell cast", "ethereal"
   - **daily_complete.mp3** → Look for: "complete", "finish", "success", "coin"
   - **penalty_alarm.mp3** → Look for: "alarm", "warning", "error", "buzz"

3. **Download and place files:**
   ```
   android/app/src/main/res/raw/
   ├── victory_chime.mp3
   ├── level_up_ding.mp3
   ├── achievement_unlock.mp3
   ├── shadow_captured.mp3
   ├── daily_complete.mp3
   └── penalty_alarm.mp3
   ```

4. **Install react-native-sound** (first time only):
   ```bash
   npm install react-native-sound
   ```

5. **Rebuild:**
   ```bash
   npx react-native run-android --mode=release
   ```

---

### Option 2: Generate Custom Sounds (Advanced)
**If you want branded/unique audio**

**Using Node.js + Tone.js/Sonic.js:**

```js
// generate-sounds.js - Run with: node generate-sounds.js
const { writeFileSync } = require('fs');
const path = require('path');

// Create simple beep tones (requires additional library setup)
// This is a placeholder - full implementation would use tone.js

console.log('To generate custom sounds, use:');
console.log('1. Tone.js (Web Audio) - npm install tone');
console.log('2. Generate in browser, export as MP3');
console.log('3. Place in android/app/src/main/res/raw/');
```

**Or use Text-to-Speech (TTS):**
- Mac: `say -o victory_chime.m4a "Victory"`
- Linux: `espeak "Victory" -w victory.wav`
- Windows: PowerShell TTS (requires setup)

---

### Option 3: Use Expo-AV (if project converts to Expo)
**If ever migrating from vanilla React Native to Expo:**

```js
// Future alternative if using Expo
import { Audio } from 'expo-av';

await Audio.Sound.createAsync(
  require('../assets/victory_chime.mp3')
).then(({ sound }) => sound.playAsync());
```

---

## Audio File Requirements

### Format
- **Codec:** AAC-LC (MP3 also works)
- **Sample Rate:** 44.1 kHz (default)
- **Bitrate:** 128-256 kbps
- **Duration:** See [SOUND_DESIGN_ANALYSIS.md](./SOUND_DESIGN_ANALYSIS.md) for exact durations

### File Sizes (optimize to reduce APK size)
- Each sound should be **< 100 KB** (typically 50-80 KB for 1-2 second sounds)
- Total audio budget: **< 500 KB** for all 6 sounds
- Use tools like [MP3Smaller](https://www.mp3smaller.com/) or [TinyMP3](https://www.tinymp3.com/)

### Quality vs Size Trade-off
- **128 kbps** → ~15 KB/sec (good for game sounds)
- **192 kbps** → ~22 KB/sec (high quality)
- **256 kbps** → ~30 KB/sec (premium, rarely needed for effects)

---

## Installation Instructions

### Step 1: Create Directory (if not exists)
```bash
mkdir -p android/app/src/main/res/raw
```

### Step 2: Add Audio Files
Copy your 6 MP3 files to that directory:
```bash
cp /path/to/victory_chime.mp3 android/app/src/main/res/raw/
cp /path/to/level_up_ding.mp3 android/app/src/main/res/raw/
# ... etc for all 6 files
```

### Step 3: Install Library
```bash
npm install react-native-sound
# or
yarn add react-native-sound
```

### Step 4: Rebuild
```bash
npx react-native run-android --mode=release
```

### Step 5: Test
1. Enable sound in app settings (if disabled)
2. Defeat any boss
3. Should hear victory sound + feel vibration

---

## Troubleshooting

### Sound Not Playing?

**Check 1:** Is sound enabled in settings?
- Settings → Experiência & Visual → Sound toggle

**Check 2:** Are audio files in correct directory?
```bash
ls -la android/app/src/main/res/raw/
# Should list all 6 MP3 files
```

**Check 3:** Are filenames correct?
- **Exact names required:** `victory_chime.mp3`, `level_up_ding.mp3`, etc.
- React Native is case-sensitive on Linux

**Check 4:** Is phone volume muted?
- Check device volume rocker
- Check Android settings → Sound & Vibration

**Check 5:** Re-verify react-native-sound installed?
```bash
npm list react-native-sound
# Should show version if installed
```

**Check 6:** Clean rebuild if changes don't appear
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android --mode=release
```

---

## AudioService API Reference

```typescript
import { playSound, stopAllSounds, releaseAllSounds } from '../utils/audioService'

// Play a sound
await playSound('victory')

// Play with callback
await playSound('achievement', undefined, () => {
  console.log('Achievement sound finished')
})

// Stop everything
stopAllSounds()

// Clean up on app unmount
releaseAllSounds()

// Check if sounds are respecting user settings:
// Built-in: Automatically checks store.settings.sound
```

---

## Sound Event Integration

### Currently Implemented ✅
- **BossVictoryModal** → `playSound('victory')`
- **AchievementModal** → `playSound('achievement')`
- **ExtractionModal** (Shadow Capture) → `playSound('shadow')`
- **LevelUpToast** → `playSound('levelUp')`

### Future Additions (Optional)
- Daily quest completion → `playSound('daily')`
- Penalty triggered → `playSound('penalty')`
- Button clicks → `playSound('daily')`

---

## Testing Without Audio Files

The app works perfectly **without audio files installed**:
- ✅ No crashes
- ✅ User settings for sound still work
- ✅ Vibration feedback still works
- ⏳ Just no audio (graceful degradation)

To test later:
1. Generate audio files
2. Place in `android/app/src/main/res/raw/`
3. Rebuild and test

---

## Performance Impact

**Added by AudioService:**
- **APK Size:** ~500 KB (all 6 sounds, ~80 KB each)
- **Memory:** ~2-3 MB max (cached sounds)
- **CPU:** Minimal (offloaded to OS audio thread)
- **Battery:** Negligible (audio is hardware accelerated)

---

## Best Practices

1. **Always check `settings.sound`** before playing
   - ✅ AudioService does this automatically
   
2. **Use vibration + sound together**
   - Redundant feedback improves UX
   - Users can disable either independently

3. **Keep sounds short**
   - Victory: < 1.2s
   - Achievement: < 1.5s
   - Shadow: < 1.0s
   - Else feels sluggish

4. **Test on real device**
   - Emulator audio is unreliable
   - Device volume rocker matters

5. **Optimize audio file size**
   - Every KB matters for mobile APK
   - Use online MP3 compressors

---

## References

- [React Native Sound Docs](https://github.com/zmxv/react-native-sound)
- [Android Raw Resources](https://developer.android.com/guide/topics/media/mediaplayer)
- [Audio Best Practices](https://developer.android.com/guide/topics/media/audio-focus)

