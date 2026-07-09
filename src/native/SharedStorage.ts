import { NativeModules } from 'react-native';

const { SharedStorageModule } = NativeModules;

export default {
  setWidgetData: (jsonData: string) => {
    // Module only exists on Android — silently skip on web/iOS where there is no widget.
    SharedStorageModule?.setWidgetData(jsonData);
  },
};
