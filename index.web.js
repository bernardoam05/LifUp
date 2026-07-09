/**
 * Web (PWA) entry point — notifee background handler is Android-only,
 * so this skips the notifee setup done in index.js.
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import appConfig from './app.json';

const appName = appConfig.name;

AppRegistry.registerComponent(appName, () => App);
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});

if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}
