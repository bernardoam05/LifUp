/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import notifee from '@notifee/react-native';

// Required by notifee — suppresses "no background event handler" warning.
// Notification press events while the app is closed are handled here silently.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
notifee.onBackgroundEvent(async (_event) => {
  // no-op: all notification interactions are handled in the foreground
});

AppRegistry.registerComponent(appName, () => App);
