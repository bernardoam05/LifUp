/**
 * Web shim for @react-native-clipboard/clipboard, backed by navigator.clipboard.
 */

export default {
  setString(text) {
    if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(() => {}); }
  },

  async getString() {
    try { return await navigator.clipboard.readText(); } catch (_) { return ''; }
  },
};
