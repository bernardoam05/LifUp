import { NativeModules } from 'react-native';

const { SharedStorageModule } = NativeModules;

export default {
  setWidgetData: (jsonData: string) => {
    if (SharedStorageModule) {
      console.log('SharedStorage.setWidgetData: sending snapshot to native');
      SharedStorageModule.setWidgetData(jsonData);
    } else {
      console.error('SharedStorage: SharedStorageModule is NOT available');
    }
  },
};
