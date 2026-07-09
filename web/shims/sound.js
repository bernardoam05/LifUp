/**
 * Web shim for react-native-sound.
 * Sound files live in android/res/raw and aren't bundled for web, so loading
 * always reports an error; audioService already falls back to vibration.
 */

export default class Sound {
  static MAIN_BUNDLE = '';
  static setCategory() {}
  static setMode() {}

  constructor(_file, _bundle, onLoad) {
    if (typeof onLoad === 'function') {
      setTimeout(() => onLoad(new Error('react-native-sound is not available on web')), 0);
    }
  }

  play(onEnd) { if (typeof onEnd === 'function') { onEnd(false); } }
  stop() {}
  pause() {}
  release() {}
  setVolume() {}
  setNumberOfLoops() {}
  setCurrentTime() {}
  getCurrentTime(cb) { if (typeof cb === 'function') { cb(0); } }
  getDuration() { return 0; }
}
