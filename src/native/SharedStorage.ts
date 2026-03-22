import { NativeModules } from 'react-native';

const { SharedStorageModule } = NativeModules;

export default {
  setWidgetData: (jsonData: string) => {
    if (SharedStorageModule) {
      SharedStorageModule.setWidgetData(jsonData);
    }
  },
};
