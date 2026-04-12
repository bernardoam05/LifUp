import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { findBestLanguageTag } from 'react-native-localize';

// ── Namespaces ────────────────────────────────────────────────────────────────
import ptCommon from './locales/pt/common.json';
import ptShop from './locales/pt/shop.json';
import ptShadows from './locales/pt/shadows.json';
import ptQuests from './locales/pt/quests.json';
import ptAchievements from './locales/pt/achievements.json';
import ptSettings from './locales/pt/settings.json';
import ptDungeons from './locales/pt/dungeons.json';
import ptScreens from './locales/pt/screens.json';
import ptModals from './locales/pt/modals.json';
import ptStore from './locales/pt/store.json';

import enCommon from './locales/en/common.json';
import enShop from './locales/en/shop.json';
import enShadows from './locales/en/shadows.json';
import enQuests from './locales/en/quests.json';
import enAchievements from './locales/en/achievements.json';
import enSettings from './locales/en/settings.json';
import enDungeons from './locales/en/dungeons.json';
import enScreens from './locales/en/screens.json';
import enModals from './locales/en/modals.json';
import enStore from './locales/en/store.json';

import esCommon from './locales/es/common.json';
import esShop from './locales/es/shop.json';
import esShadows from './locales/es/shadows.json';
import esQuests from './locales/es/quests.json';
import esAchievements from './locales/es/achievements.json';
import esSettings from './locales/es/settings.json';
import esDungeons from './locales/es/dungeons.json';
import esScreens from './locales/es/screens.json';
import esModals from './locales/es/modals.json';
import esStore from './locales/es/store.json';

import frCommon from './locales/fr/common.json';
import frShop from './locales/fr/shop.json';
import frShadows from './locales/fr/shadows.json';
import frQuests from './locales/fr/quests.json';
import frAchievements from './locales/fr/achievements.json';
import frSettings from './locales/fr/settings.json';
import frDungeons from './locales/fr/dungeons.json';
import frScreens from './locales/fr/screens.json';
import frModals from './locales/fr/modals.json';
import frStore from './locales/fr/store.json';

import deCommon from './locales/de/common.json';
import deShop from './locales/de/shop.json';
import deShadows from './locales/de/shadows.json';
import deQuests from './locales/de/quests.json';
import deAchievements from './locales/de/achievements.json';
import deSettings from './locales/de/settings.json';
import deDungeons from './locales/de/dungeons.json';
import deScreens from './locales/de/screens.json';
import deModals from './locales/de/modals.json';
import deStore from './locales/de/store.json';

// ── Language detection ────────────────────────────────────────────────────────
const SUPPORTED = ['pt', 'en', 'es', 'fr', 'de'];

function detectLanguage(): string {
  const tag = findBestLanguageTag(SUPPORTED);
  return tag?.languageTag ?? 'en';
}

// ── Init ──────────────────────────────────────────────────────────────────────
i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { common: ptCommon, shop: ptShop, shadows: ptShadows, quests: ptQuests, achievements: ptAchievements, settings: ptSettings, dungeons: ptDungeons, screens: ptScreens, modals: ptModals, store: ptStore },
      en: { common: enCommon, shop: enShop, shadows: enShadows, quests: enQuests, achievements: enAchievements, settings: enSettings, dungeons: enDungeons, screens: enScreens, modals: enModals, store: enStore },
      es: { common: esCommon, shop: esShop, shadows: esShadows, quests: esQuests, achievements: esAchievements, settings: esSettings, dungeons: esDungeons, screens: esScreens, modals: esModals, store: esStore },
      fr: { common: frCommon, shop: frShop, shadows: frShadows, quests: frQuests, achievements: frAchievements, settings: frSettings, dungeons: frDungeons, screens: frScreens, modals: frModals, store: frStore },
      de: { common: deCommon, shop: deShop, shadows: deShadows, quests: deQuests, achievements: deAchievements, settings: deSettings, dungeons: deDungeons, screens: deScreens, modals: deModals, store: deStore },
    },
    lng: detectLanguage(),
    fallbackLng: 'pt',
    defaultNS: 'common',
    ns: ['common', 'shop', 'shadows', 'quests', 'achievements', 'settings', 'dungeons', 'screens', 'modals', 'store'],
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

export default i18n;
